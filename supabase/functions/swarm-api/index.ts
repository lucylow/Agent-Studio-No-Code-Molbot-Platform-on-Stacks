import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, requireAuth,
  validateString, validateNumber, validateInt, validateEnum, validateArray,
  mockTxId, mockBlockHeight,
  setIdempotentResponse, parsePagination, paginatedResponse,
  type RequestContext, ValidationError,
} from "../_shared/utils.ts";

type SwarmMember = { botId: number; share: number; owner?: string; bondTxId?: string; joinedAt?: string };

// ========== Route Handlers ==========

async function handleListSwarms(ctx: RequestContext) {
  const { limit, offset, page } = parsePagination(ctx.url);
  const status = ctx.url.searchParams.get('status');

  let query = ctx.supabase.from('swarms').select('*', { count: 'exact' });
  if (status && ['forming', 'active', 'completed', 'dissolved'].includes(status)) {
    query = query.eq('status', status);
  }
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleGetSwarm(ctx: RequestContext) {
  const swarmId = ctx.url.searchParams.get('id');
  if (!swarmId) return jsonResponse({ error: 'Missing id parameter', requestId: ctx.requestId }, 400);
  const id = parseInt(swarmId);
  if (!Number.isInteger(id) || id < 1) return jsonResponse({ error: 'Invalid id', requestId: ctx.requestId }, 400);

  const { data, error } = await ctx.supabase.from('swarms').select('*').eq('id', id).single();
  if (error || !data) return jsonResponse({ error: 'Swarm not found', requestId: ctx.requestId }, 404);

  // Enrich with job count
  const { count: jobCount } = await ctx.supabase
    .from('swarm_jobs').select('*', { count: 'exact', head: true }).eq('swarm_id', id);

  return jsonResponse({ ...data, jobsCompleted: jobCount || 0 });
}

async function handleCreateSwarm(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const name = validateString(ctx.body.name, 'name', 1, 64);
  const taskDescription = ctx.body.taskDescription
    ? validateString(ctx.body.taskDescription, 'taskDescription', 0, 500)
    : '';
  const requiredSkills = ctx.body.requiredSkills
    ? (validateArray(ctx.body.requiredSkills, 'requiredSkills', 10) as string[]).map(
        (s, i) => validateString(s, `requiredSkills[${i}]`, 1, 64)
      )
    : [];
  const minBond = validateNumber(ctx.body.minBond ?? 0.001, 'minBond', 0.0001, 100);

  const { data: swarm, error } = await ctx.supabase.from('swarms').insert({
    name, task_description: taskDescription, required_skills: requiredSkills,
    min_bond: minBond, creator_id: ctx.userId, members: [], status: 'forming',
  }).select().single();
  if (error) throw error;

  const response = {
    swarm,
    clarityEvent: {
      topic: 'swarm-created', swarmId: swarm.id,
      creator: ctx.userId, blockHeight: mockBlockHeight(),
    },
    requestId: ctx.requestId,
  };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleJoinSwarm(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const swarmId = validateInt(ctx.body.swarmId, 'swarmId');
  const botId = validateInt(ctx.body.botId, 'botId');
  const share = validateInt(ctx.body.share, 'share');
  if (share > 10000) throw new ValidationError('Share must be 1-10000 basis points');

  // Parallel: verify bot ownership + fetch swarm
  const [botResult, swarmResult] = await Promise.all([
    ctx.supabase.from('bots').select('id').eq('id', botId).eq('owner_id', ctx.userId).single(),
    ctx.supabase.from('swarms').select('*').eq('id', swarmId).single(),
  ]);

  if (!botResult.data) return jsonResponse({ error: 'Bot not found or not owned by you', requestId: ctx.requestId }, 403);

  const swarm = swarmResult.data;
  if (!swarm) return jsonResponse({ error: 'Swarm not found', requestId: ctx.requestId }, 404);
  if (swarm.status !== 'forming') return jsonResponse({ error: 'Swarm is not in forming state', requestId: ctx.requestId }, 400);

  const members: SwarmMember[] = Array.isArray(swarm.members) ? (swarm.members as SwarmMember[]) : [];
  if (members.length >= 20) return jsonResponse({ error: 'Swarm is full (max 20 members)', requestId: ctx.requestId }, 400);
  if (members.some((m) => m.botId === botId)) return jsonResponse({ error: 'Bot already in swarm', requestId: ctx.requestId }, 409);

  const totalShares = members.reduce((sum, m) => sum + m.share, 0);
  if (totalShares + share > 10000) {
    return jsonResponse({ error: `Only ${10000 - totalShares} basis points remaining`, requestId: ctx.requestId }, 400);
  }

  const bondTxId = mockTxId();
  const updatedMembers = [...members, { botId, share, owner: ctx.userId, bondTxId, joinedAt: new Date().toISOString() }];

  // Parallel: update swarm + record bond transaction
  await Promise.all([
    ctx.supabase.from('swarms').update({ members: updatedMembers }).eq('id', swarmId),
    ctx.supabase.from('transactions').insert({
      tx_id: bondTxId, from_bot_id: botId, amount: swarm.min_bond, asset: 'sBTC',
      tx_type: 'swarm_bond', status: 'confirmed',
      metadata: { swarmId, protocol: 'swarm-coordination', clarityContract: 'bot-swarm.join-swarm', blockHeight: mockBlockHeight() },
    }),
  ]);

  const response = {
    success: true, bondTxId,
    member: { botId, share },
    totalMembers: updatedMembers.length,
    totalShares: totalShares + share,
    clarityEvent: { topic: 'bot-joined-swarm', swarmId, botId, share },
    requestId: ctx.requestId,
  };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleActivateSwarm(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const swarmId = validateInt(ctx.body.swarmId, 'swarmId');
  const { data: swarm } = await ctx.supabase.from('swarms').select('*').eq('id', swarmId).single();
  if (!swarm) return jsonResponse({ error: 'Swarm not found', requestId: ctx.requestId }, 404);
  if (swarm.creator_id !== ctx.userId) return jsonResponse({ error: 'Only creator can activate', requestId: ctx.requestId }, 403);
  if (swarm.status !== 'forming') return jsonResponse({ error: 'Swarm must be in forming state', requestId: ctx.requestId }, 400);

  const members: SwarmMember[] = Array.isArray(swarm.members) ? (swarm.members as SwarmMember[]) : [];
  if (members.length < 2) return jsonResponse({ error: 'Need at least 2 members', requestId: ctx.requestId }, 400);
  const totalShares = members.reduce((sum, m) => sum + m.share, 0);
  if (totalShares !== 10000) return jsonResponse({ error: `Shares must total 10000 (currently ${totalShares})`, requestId: ctx.requestId }, 400);

  await ctx.supabase.from('swarms').update({ status: 'active' }).eq('id', swarmId);
  return jsonResponse({ success: true, swarmId, status: 'active', memberCount: members.length, requestId: ctx.requestId });
}

async function handleHireSwarm(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const swarmId = validateInt(ctx.body.swarmId, 'swarmId');
  const paymentAmount = validateNumber(ctx.body.paymentAmount ?? 0.01, 'paymentAmount', 0.000001, 1000000);

  const { data: swarm } = await ctx.supabase.from('swarms').select('*').eq('id', swarmId).single();
  if (!swarm) return jsonResponse({ error: 'Swarm not found', requestId: ctx.requestId }, 404);
  if (swarm.status !== 'active') return jsonResponse({ error: 'Swarm is not active', requestId: ctx.requestId }, 400);

  const paymentTxId = mockTxId();
  const { data: job, error: jobError } = await ctx.supabase.from('swarm_jobs').insert({
    swarm_id: swarmId, client_id: ctx.userId, payment_amount: paymentAmount,
    payment_asset: 'sBTC', status: 'pending', payment_tx_id: paymentTxId,
  }).select().single();
  if (jobError) throw jobError;

  await ctx.supabase.from('transactions').insert({
    tx_id: paymentTxId, amount: paymentAmount, asset: 'sBTC',
    tx_type: 'swarm_escrow', status: 'confirmed',
    metadata: { swarmId, jobId: job.id, protocol: 'x402', clarityContract: 'bot-swarm.hire-swarm', escrow: true },
  });

  const members: SwarmMember[] = Array.isArray(swarm.members) ? (swarm.members as SwarmMember[]) : [];
  const splits = members.map((m) => ({
    botId: m.botId, share: m.share,
    amount: parseFloat(((paymentAmount * m.share) / 10000).toFixed(8)),
    txId: mockTxId(),
  }));

  // Batch insert all split transactions
  if (splits.length > 0) {
    await ctx.supabase.from('transactions').insert(
      splits.map(s => ({
        tx_id: s.txId, to_bot_id: s.botId, amount: s.amount, asset: 'sBTC',
        tx_type: 'swarm_split', status: 'confirmed',
        metadata: { swarmId, jobId: job.id, share: s.share, protocol: 'x402' },
      }))
    );
  }

  const resultHash = `QmResult${crypto.randomUUID().slice(0, 12)}`;

  // Parallel: complete job + update swarm earnings
  await Promise.all([
    ctx.supabase.from('swarm_jobs').update({ status: 'completed', result_hash: resultHash }).eq('id', job.id),
    ctx.supabase.from('swarms').update({ total_earned: (swarm.total_earned || 0) + paymentAmount }).eq('id', swarmId),
  ]);

  const response = {
    job: { ...job, status: 'completed', result_hash: resultHash },
    paymentTxId, splits, resultHash,
    clarityEvents: [
      { topic: 'swarm-job-completed', jobId: job.id, resultHash },
      ...splits.map(s => ({ topic: 'swarm-payment-split', botId: s.botId, amount: s.amount })),
    ],
    requestId: ctx.requestId,
  };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleMySwarms(ctx: RequestContext) {
  requireAuth(ctx.userId);
  const { limit, offset, page } = parsePagination(ctx.url);
  const { data, error, count } = await ctx.supabase
    .from('swarms').select('*', { count: 'exact' })
    .eq('creator_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

// ========== Route Map ==========

const routes = {
  'list': { method: 'GET' as const, handler: handleListSwarms, public: true },
  'get': { method: 'GET' as const, handler: handleGetSwarm, public: true },
  'create': { method: 'POST' as const, handler: handleCreateSwarm, rateLimit: 10 },
  'join': { method: 'POST' as const, handler: handleJoinSwarm, rateLimit: 15 },
  'activate': { method: 'POST' as const, handler: handleActivateSwarm, rateLimit: 10 },
  'hire': { method: 'POST' as const, handler: handleHireSwarm, rateLimit: 15 },
  'my-swarms': { method: 'GET' as const, handler: handleMySwarms },
};

serve(createEdgeHandler('swarm-api', routes));
