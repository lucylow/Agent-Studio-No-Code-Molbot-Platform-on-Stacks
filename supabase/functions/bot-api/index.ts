import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, requireAuth,
  validateString, validateNumber, validateEnum, validateSkills, validateInt,
  mockTxId, mockBlockHeight, setIdempotentResponse, parsePagination, paginatedResponse,
  type RequestContext,
} from "../_shared/utils.ts";

// ========== Route Handlers ==========

async function handleListBots(ctx: RequestContext) {
  const { limit, offset, page } = parsePagination(ctx.url);
  const skill = ctx.url.searchParams.get('skill');
  const sort = ctx.url.searchParams.get('sort') || 'created_at';
  const order = ctx.url.searchParams.get('order') === 'asc' ? true : false;

  let query = ctx.supabase.from('bots').select('*', { count: 'exact' }).eq('active', true);
  if (skill) query = query.contains('skills', [skill]);

  const allowedSorts = ['created_at', 'name', 'price_amount'];
  const sortCol = allowedSorts.includes(sort) ? sort : 'created_at';
  query = query.order(sortCol, { ascending: order }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleGetBot(ctx: RequestContext) {
  const botId = ctx.url.searchParams.get('id');
  if (!botId) return jsonResponse({ error: 'Missing id parameter', requestId: ctx.requestId }, 400);
  const id = parseInt(botId);
  if (!Number.isInteger(id) || id < 1) return jsonResponse({ error: 'Invalid id', requestId: ctx.requestId }, 400);

  const { data, error } = await ctx.supabase.from('bots').select('*').eq('id', id).single();
  if (error || !data) return jsonResponse({ error: 'Bot not found', requestId: ctx.requestId }, 404);
  return jsonResponse(data);
}

async function handleCreateBot(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const name = validateString(ctx.body.name, 'name', 1, 64);
  const skills = validateSkills(ctx.body.skills || []);
  const priceModel = validateEnum(ctx.body.priceModel, 'priceModel', ['fixed', 'stream']);
  const priceAmount = validateNumber(ctx.body.priceAmount, 'priceAmount', 0.000001, 1000000);
  const priceAsset = validateEnum(ctx.body.priceAsset || 'sBTC', 'priceAsset', ['sBTC', 'USDCx']);
  const description = ctx.body.description ? validateString(ctx.body.description, 'description', 0, 500) : '';

  const mockOnChainId = Math.floor(Math.random() * 100000);
  const txId = mockTxId();

  const { data: bot, error } = await ctx.supabase
    .from('bots')
    .insert({
      owner_id: ctx.userId, name, skills, description,
      price_model: priceModel, price_amount: priceAmount,
      price_asset: priceAsset, on_chain_id: mockOnChainId,
    })
    .select().single();
  if (error) throw error;

  await ctx.supabase.from('transactions').insert({
    tx_id: txId, amount: 0, asset: priceAsset, tx_type: 'bot_registration', status: 'confirmed',
    metadata: {
      type: 'bot-registration', botId: bot.id, onChainId: mockOnChainId,
      clarityContract: 'bot-registry.register-bot',
      blockHeight: mockBlockHeight(),
    },
  });

  const response = { bot, txId, onChainId: mockOnChainId, requestId: ctx.requestId };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleHireBot(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const requesterBotId = validateInt(ctx.body.requesterBotId, 'requesterBotId');
  const providerBotId = validateInt(ctx.body.providerBotId, 'providerBotId');
  if (requesterBotId === providerBotId) {
    return jsonResponse({ error: 'A bot cannot hire itself', requestId: ctx.requestId }, 400);
  }

  // Parallel lookups for provider and requester
  const [providerResult, requesterResult] = await Promise.all([
    ctx.supabase.from('bots').select('*').eq('id', providerBotId).eq('active', true).single(),
    ctx.supabase.from('bots').select('id').eq('id', requesterBotId).eq('owner_id', ctx.userId).single(),
  ]);

  if (!providerResult.data) return jsonResponse({ error: 'Provider bot not found or inactive', requestId: ctx.requestId }, 404);
  if (!requesterResult.data) return jsonResponse({ error: 'Requester bot not found or not owned by you', requestId: ctx.requestId }, 403);

  const provider = providerResult.data;
  const { data: job, error: jobError } = await ctx.supabase
    .from('jobs')
    .insert({
      requester_bot_id: requesterBotId, provider_bot_id: providerBotId,
      requester_user_id: ctx.userId, status: 'processing',
    })
    .select().single();
  if (jobError) throw jobError;

  const txId = mockTxId();
  const isStream = provider.price_model === 'stream';
  const blockHeight = mockBlockHeight();

  // Parallel: record transaction + update job
  await Promise.all([
    ctx.supabase.from('transactions').insert({
      tx_id: txId, from_bot_id: requesterBotId, to_bot_id: providerBotId,
      amount: provider.price_amount, asset: provider.price_asset,
      tx_type: isStream ? 'stream_create' : 'payment', status: 'confirmed',
      metadata: {
        jobId: job.id, protocol: isStream ? 'usdcx-stream' : 'x402',
        clarityContract: isStream ? 'usdcx-stream.create-usdcx-stream' : 'payment-router.send-x402-payment',
        blockHeight,
        bitcoinAnchor: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
      },
    }),
    ctx.supabase.from('jobs').update({ status: 'completed', payment_tx_id: txId }).eq('id', job.id),
  ]);

  const response = {
    job: { ...job, status: 'completed', payment_tx_id: txId },
    transaction: {
      txId, amount: provider.price_amount, asset: provider.price_asset,
      protocol: isStream ? 'usdcx-stream' : 'x402', blockHeight,
    },
    requestId: ctx.requestId,
  };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleMyBots(ctx: RequestContext) {
  requireAuth(ctx.userId);
  const { limit, offset, page } = parsePagination(ctx.url);
  const { data, error, count } = await ctx.supabase
    .from('bots').select('*', { count: 'exact' })
    .eq('owner_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleMyJobs(ctx: RequestContext) {
  requireAuth(ctx.userId);
  const { limit, offset, page } = parsePagination(ctx.url);
  const { data, error, count } = await ctx.supabase
    .from('jobs')
    .select('*, requester_bot:bots!jobs_requester_bot_id_fkey(name), provider_bot:bots!jobs_provider_bot_id_fkey(name)', { count: 'exact' })
    .eq('requester_user_id', ctx.userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleMyTransactions(ctx: RequestContext) {
  requireAuth(ctx.userId);
  const { limit, offset, page } = parsePagination(ctx.url);

  const { data: userBots } = await ctx.supabase.from('bots').select('id').eq('owner_id', ctx.userId);
  const botIds = (userBots || []).map((b: { id: number }) => b.id);
  if (botIds.length === 0) return jsonResponse(paginatedResponse([], 0, page, limit));

  const { data, error, count } = await ctx.supabase
    .from('transactions').select('*', { count: 'exact' })
    .or(`from_bot_id.in.(${botIds.join(',')}),to_bot_id.in.(${botIds.join(',')})`)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleStats(ctx: RequestContext) {
  const [botsResult, jobsResult, txResult] = await Promise.all([
    ctx.supabase.from('bots').select('*', { count: 'exact', head: true }).eq('active', true),
    ctx.supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    ctx.supabase.from('transactions').select('*', { count: 'exact', head: true }),
  ]);

  return jsonResponse({
    activeBots: botsResult.count || 0,
    completedJobs: jobsResult.count || 0,
    totalTransactions: txResult.count || 0,
    requestId: ctx.requestId,
  });
}

// ========== Route Map ==========

const routes = {
  'list-bots': { method: 'GET' as const, handler: handleListBots, public: true },
  'get-bot': { method: 'GET' as const, handler: handleGetBot, public: true },
  'create-bot': { method: 'POST' as const, handler: handleCreateBot, rateLimit: 10 },
  'hire-bot': { method: 'POST' as const, handler: handleHireBot, rateLimit: 20 },
  'my-bots': { method: 'GET' as const, handler: handleMyBots },
  'my-jobs': { method: 'GET' as const, handler: handleMyJobs },
  'my-transactions': { method: 'GET' as const, handler: handleMyTransactions },
  'stats': { method: 'GET' as const, handler: handleStats, public: true },
};

serve(createEdgeHandler('bot-api', routes));
