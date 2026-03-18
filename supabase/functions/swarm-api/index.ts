import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key',
};

// ========== Helpers ==========

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

function log(level: string, message: string, data?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, service: 'swarm-api', message, ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function mockTxId(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

function validateString(val: unknown, field: string, min = 1, max = 256): string {
  if (typeof val !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = val.trim();
  if (trimmed.length < min || trimmed.length > max) throw new ValidationError(`${field} must be ${min}-${max} characters`);
  return trimmed;
}

function validateInt(val: unknown, field: string, min = 1): number {
  const num = typeof val === 'number' ? val : parseInt(String(val));
  if (!Number.isInteger(num) || num < min) throw new ValidationError(`${field} must be an integer >= ${min}`);
  return num;
}

function validateNumber(val: unknown, field: string, min = 0, max = 1e12): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (typeof num !== 'number' || isNaN(num) || num < min || num > max) throw new ValidationError(`${field} must be a number between ${min} and ${max}`);
  return num;
}

class ValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

async function authenticateUser(req: Request, supabaseUrl: string, supabaseAnonKey: string): Promise<string | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.replace('Bearer ', '');
  const client = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data, error } = await client.auth.getClaims(token);
  if (error || !data?.claims) return null;
  return data.claims.sub as string;
}

// ========== Rate Limiting ==========

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(key: string, max = 20): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

// ========== Main ==========

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const startTime = Date.now();

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    if (!action) return jsonResponse({ error: 'Missing action parameter' }, 400);

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
    }

    const userId = await authenticateUser(req, supabaseUrl, supabaseAnonKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (userId && !checkRateLimit(userId)) {
      return jsonResponse({ error: 'Too many requests' }, 429);
    }

    // ========== LIST SWARMS ==========
    if (action === 'list' && req.method === 'GET') {
      const { data, error } = await supabase.from('swarms').select('*').order('created_at', { ascending: false }).limit(50);
      if (error) throw error;
      return jsonResponse(data);
    }

    // ========== GET SWARM ==========
    if (action === 'get' && req.method === 'GET') {
      const swarmId = url.searchParams.get('id');
      if (!swarmId) return jsonResponse({ error: 'Missing id parameter' }, 400);
      const id = parseInt(swarmId);
      if (!Number.isInteger(id) || id < 1) return jsonResponse({ error: 'Invalid id' }, 400);

      const { data, error } = await supabase.from('swarms').select('*').eq('id', id).single();
      if (error) return jsonResponse({ error: 'Swarm not found' }, 404);
      return jsonResponse(data);
    }

    // ========== CREATE SWARM ==========
    if (action === 'create' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const name = validateString(body.name, 'name', 1, 64);
      const taskDescription = typeof body.taskDescription === 'string' ? body.taskDescription.trim().slice(0, 256) : '';
      const requiredSkills = Array.isArray(body.requiredSkills) ? body.requiredSkills.slice(0, 10) : [];
      const minBond = validateNumber(body.minBond ?? 0.001, 'minBond', 0.0001, 100);

      const { data: swarm, error } = await supabase.from('swarms').insert({
        name, task_description: taskDescription, required_skills: requiredSkills,
        min_bond: minBond, creator_id: userId, members: [], status: 'forming',
      }).select().single();
      if (error) throw error;

      log('info', 'Swarm created', { swarmId: swarm.id, userId, name });
      return jsonResponse({
        swarm,
        clarityEvent: { topic: 'swarm-created', swarmId: swarm.id, creator: userId, blockHeight: 100000 + Math.floor(Math.random() * 10000) },
      });
    }

    // ========== JOIN SWARM ==========
    if (action === 'join' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const swarmId = validateInt(body.swarmId, 'swarmId');
      const botId = validateInt(body.botId, 'botId');
      const share = validateInt(body.share, 'share');
      if (share > 10000) return jsonResponse({ error: 'Share must be 1-10000 basis points' }, 400);

      const { data: bot } = await supabase.from('bots').select('id').eq('id', botId).eq('owner_id', userId).single();
      if (!bot) return jsonResponse({ error: 'Bot not found or not owned by you' }, 403);

      const { data: swarm } = await supabase.from('swarms').select('*').eq('id', swarmId).single();
      if (!swarm) return jsonResponse({ error: 'Swarm not found' }, 404);
      if (swarm.status !== 'forming') return jsonResponse({ error: 'Swarm is not in forming state' }, 400);

      const members = (swarm.members as any[]) || [];
      if (members.length >= 20) return jsonResponse({ error: 'Swarm is full (max 20)' }, 400);
      if (members.some((m: any) => m.botId === botId)) return jsonResponse({ error: 'Bot already in swarm' }, 409);

      const totalShares = members.reduce((sum: number, m: any) => sum + m.share, 0);
      if (totalShares + share > 10000) return jsonResponse({ error: `Only ${10000 - totalShares} basis points remaining` }, 400);

      const bondTxId = mockTxId();
      const updatedMembers = [...members, { botId, share, owner: userId, bondTxId }];

      await supabase.from('swarms').update({ members: updatedMembers }).eq('id', swarmId);
      await supabase.from('transactions').insert({
        tx_id: bondTxId, from_bot_id: botId, amount: swarm.min_bond, asset: 'sBTC',
        tx_type: 'swarm_bond', status: 'confirmed',
        metadata: { swarmId, protocol: 'swarm-coordination', clarityContract: 'bot-swarm.join-swarm' },
      });

      log('info', 'Bot joined swarm', { swarmId, botId, userId });
      return jsonResponse({
        success: true, bondTxId, member: { botId, share },
        totalMembers: updatedMembers.length, totalShares: totalShares + share,
        clarityEvent: { topic: 'bot-joined-swarm', swarmId, botId, share },
      });
    }

    // ========== ACTIVATE SWARM ==========
    if (action === 'activate' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const swarmId = validateInt(body.swarmId, 'swarmId');
      const { data: swarm } = await supabase.from('swarms').select('*').eq('id', swarmId).single();
      if (!swarm) return jsonResponse({ error: 'Swarm not found' }, 404);
      if (swarm.creator_id !== userId) return jsonResponse({ error: 'Only creator can activate' }, 403);
      if (swarm.status !== 'forming') return jsonResponse({ error: 'Swarm must be in forming state' }, 400);

      const members = (swarm.members as any[]) || [];
      if (members.length < 2) return jsonResponse({ error: 'Need at least 2 members' }, 400);
      const totalShares = members.reduce((sum: number, m: any) => sum + m.share, 0);
      if (totalShares !== 10000) return jsonResponse({ error: `Shares must total 10000 (currently ${totalShares})` }, 400);

      await supabase.from('swarms').update({ status: 'active' }).eq('id', swarmId);
      log('info', 'Swarm activated', { swarmId, userId, memberCount: members.length });
      return jsonResponse({ success: true, swarmId, status: 'active', memberCount: members.length });
    }

    // ========== HIRE SWARM ==========
    if (action === 'hire' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const swarmId = validateInt(body.swarmId, 'swarmId');
      const paymentAmount = validateNumber(body.paymentAmount ?? 0.01, 'paymentAmount', 0.000001, 1000000);

      const { data: swarm } = await supabase.from('swarms').select('*').eq('id', swarmId).single();
      if (!swarm) return jsonResponse({ error: 'Swarm not found' }, 404);
      if (swarm.status !== 'active') return jsonResponse({ error: 'Swarm is not active' }, 400);

      const paymentTxId = mockTxId();

      const { data: job, error: jobError } = await supabase.from('swarm_jobs').insert({
        swarm_id: swarmId, client_id: userId, payment_amount: paymentAmount,
        payment_asset: 'sBTC', status: 'pending', payment_tx_id: paymentTxId,
      }).select().single();
      if (jobError) throw jobError;

      await supabase.from('transactions').insert({
        tx_id: paymentTxId, amount: paymentAmount, asset: 'sBTC',
        tx_type: 'swarm_escrow', status: 'confirmed',
        metadata: { swarmId, jobId: job.id, protocol: 'x402', clarityContract: 'bot-swarm.hire-swarm', escrow: true },
      });

      const resultHash = `QmResult${crypto.randomUUID().slice(0, 12)}`;
      const members = (swarm.members as any[]) || [];

      // Batch split transactions
      const splits = members.map((m: any) => ({
        botId: m.botId, share: m.share,
        amount: parseFloat(((paymentAmount * m.share) / 10000).toFixed(8)),
        txId: mockTxId(),
      }));

      const splitInserts = splits.map(s => ({
        tx_id: s.txId, to_bot_id: s.botId, amount: s.amount, asset: 'sBTC',
        tx_type: 'swarm_split', status: 'confirmed',
        metadata: { swarmId, jobId: job.id, share: s.share, protocol: 'x402', clarityEvent: { topic: 'swarm-payment-split', botId: s.botId, share: s.share } },
      }));

      // Batch insert all split transactions at once
      if (splitInserts.length > 0) {
        await supabase.from('transactions').insert(splitInserts);
      }

      await supabase.from('swarm_jobs').update({ status: 'completed', result_hash: resultHash }).eq('id', job.id);
      await supabase.from('swarms').update({ total_earned: (swarm.total_earned || 0) + paymentAmount }).eq('id', swarmId);

      log('info', 'Swarm hired', { swarmId, jobId: job.id, userId, paymentAmount });
      return jsonResponse({
        job: { ...job, status: 'completed', result_hash: resultHash },
        paymentTxId, splits, resultHash,
        clarityEvents: [
          { topic: 'swarm-job-created', jobId: job.id, swarmId, paymentAmount },
          { topic: 'swarm-job-completed', jobId: job.id, resultHash },
          ...splits.map(s => ({ topic: 'swarm-payment-split', botId: s.botId, amount: s.amount, share: s.share })),
        ],
      });
    }

    // ========== MY SWARMS ==========
    if (action === 'my-swarms' && req.method === 'GET') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { data, error } = await supabase.from('swarms').select('*').eq('creator_id', userId).order('created_at', { ascending: false });
      if (error) throw error;
      return jsonResponse(data);
    }

    return jsonResponse({
      error: 'Unknown action',
      availableActions: ['list', 'get', 'create', 'join', 'activate', 'hire', 'my-swarms'],
    }, 400);

  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof ValidationError) {
      return jsonResponse({ error: error.message }, 400);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Request failed', { error: message, duration });
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
