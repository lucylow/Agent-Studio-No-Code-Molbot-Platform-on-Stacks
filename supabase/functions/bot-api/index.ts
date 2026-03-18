import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== Shared Infrastructure ==========

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key',
};

class ValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'ValidationError'; }
}

function validateString(val: unknown, field: string, min = 1, max = 256): string {
  if (typeof val !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = val.trim();
  if (trimmed.length < min) throw new ValidationError(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

function validateNumber(val: unknown, field: string, min = 0, max = 1e12): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (typeof num !== 'number' || isNaN(num)) throw new ValidationError(`${field} must be a number`);
  if (num < min) throw new ValidationError(`${field} must be >= ${min}`);
  if (num > max) throw new ValidationError(`${field} must be <= ${max}`);
  return num;
}

function validateEnum(val: unknown, field: string, allowed: string[]): string {
  const str = validateString(val, field);
  if (!allowed.includes(str)) throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  return str;
}

function validateSkills(val: unknown): string[] {
  if (!Array.isArray(val)) throw new ValidationError('skills must be an array');
  if (val.length > 10) throw new ValidationError('skills must have at most 10 items');
  return val.map((s, i) => validateString(s, `skills[${i}]`, 1, 64));
}

function validateInt(val: unknown, field: string, min = 1): number {
  const num = validateNumber(val, field, min);
  if (!Number.isInteger(num)) throw new ValidationError(`${field} must be an integer`);
  return num;
}

// ========== Rate Limiting ==========

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 30;

function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(userId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

// ========== Idempotency ==========

const idempotencyCache = new Map<string, { response: string; status: number; expiry: number }>();

function getIdempotentResponse(key: string): { response: string; status: number } | null {
  const entry = idempotencyCache.get(key);
  if (!entry || Date.now() > entry.expiry) { idempotencyCache.delete(key); return null; }
  return { response: entry.response, status: entry.status };
}

function setIdempotentResponse(key: string, response: string, status: number): void {
  idempotencyCache.set(key, { response, status, expiry: Date.now() + 86_400_000 });
}

// ========== Logging & Helpers ==========

function log(level: string, message: string, data?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, service: 'bot-api', message, ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function mockTxId(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
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

// ========== Route Handlers ==========

type RouteContext = {
  supabase: ReturnType<typeof createClient>;
  userId: string | null;
  body: Record<string, unknown>;
  url: URL;
  idempotencyKey: string | null;
};

async function handleListBots(ctx: RouteContext) {
  const { data, error } = await ctx.supabase
    .from('bots').select('*').eq('active', true)
    .order('created_at', { ascending: false }).limit(100);
  if (error) throw error;
  log('info', 'Listed bots', { count: data?.length });
  return jsonResponse(data);
}

async function handleCreateBot(ctx: RouteContext) {
  if (!ctx.userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  const name = validateString(ctx.body.name, 'name', 1, 64);
  const skills = validateSkills(ctx.body.skills || []);
  const priceModel = validateEnum(ctx.body.priceModel, 'priceModel', ['fixed', 'stream']);
  const priceAmount = validateNumber(ctx.body.priceAmount, 'priceAmount', 0.000001, 1000000);
  const priceAsset = validateEnum(ctx.body.priceAsset || 'sBTC', 'priceAsset', ['sBTC', 'USDCx']);

  const mockOnChainId = Math.floor(Math.random() * 100000);
  const txId = mockTxId();

  const { data: bot, error } = await ctx.supabase
    .from('bots')
    .insert({ owner_id: ctx.userId, name, skills, price_model: priceModel, price_amount: priceAmount, price_asset: priceAsset, on_chain_id: mockOnChainId })
    .select().single();
  if (error) throw error;

  await ctx.supabase.from('transactions').insert({
    tx_id: txId, amount: 0, asset: priceAsset, tx_type: 'bot_registration', status: 'confirmed',
    metadata: { type: 'bot-registration', botId: bot.id, onChainId: mockOnChainId, clarityContract: 'bot-registry.register-bot', blockHeight: 100000 + Math.floor(Math.random() * 10000) },
  });

  log('info', 'Bot created', { botId: bot.id, userId: ctx.userId, name });
  const response = { bot, txId, onChainId: mockOnChainId };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleHireBot(ctx: RouteContext) {
  if (!ctx.userId) return jsonResponse({ error: 'Unauthorized' }, 401);

  const requesterBotId = validateInt(ctx.body.requesterBotId, 'requesterBotId');
  const providerBotId = validateInt(ctx.body.providerBotId, 'providerBotId');
  if (requesterBotId === providerBotId) return jsonResponse({ error: 'A bot cannot hire itself' }, 400);

  const { data: provider } = await ctx.supabase
    .from('bots').select('*').eq('id', providerBotId).eq('active', true).single();
  if (!provider) return jsonResponse({ error: 'Provider bot not found or inactive' }, 404);

  const { data: requester } = await ctx.supabase
    .from('bots').select('id').eq('id', requesterBotId).eq('owner_id', ctx.userId).single();
  if (!requester) return jsonResponse({ error: 'Requester bot not found or not owned by you' }, 403);

  const { data: job, error: jobError } = await ctx.supabase
    .from('jobs')
    .insert({ requester_bot_id: requesterBotId, provider_bot_id: providerBotId, requester_user_id: ctx.userId, status: 'processing' })
    .select().single();
  if (jobError) throw jobError;

  const txId = mockTxId();
  const isStream = provider.price_model === 'stream';

  await ctx.supabase.from('transactions').insert({
    tx_id: txId, from_bot_id: requesterBotId, to_bot_id: providerBotId,
    amount: provider.price_amount, asset: provider.price_asset,
    tx_type: isStream ? 'stream_create' : 'payment', status: 'confirmed',
    metadata: {
      jobId: job.id, protocol: isStream ? 'usdcx-stream' : 'x402',
      clarityContract: isStream ? 'usdcx-stream.create-usdcx-stream' : 'payment-router.send-x402-payment',
      blockHeight: 100000 + Math.floor(Math.random() * 10000),
      bitcoinAnchor: Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join(''),
    },
  });

  await ctx.supabase.from('jobs').update({ status: 'completed', payment_tx_id: txId }).eq('id', job.id);
  log('info', 'Bot hired', { jobId: job.id, requesterBotId, providerBotId, userId: ctx.userId });

  const response = {
    job: { ...job, status: 'completed', payment_tx_id: txId },
    transaction: { txId, amount: provider.price_amount, asset: provider.price_asset, protocol: isStream ? 'usdcx-stream' : 'x402' },
  };
  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

async function handleMyBots(ctx: RouteContext) {
  if (!ctx.userId) return jsonResponse({ error: 'Unauthorized' }, 401);
  const { data, error } = await ctx.supabase
    .from('bots').select('*').eq('owner_id', ctx.userId).order('created_at', { ascending: false });
  if (error) throw error;
  return jsonResponse(data);
}

async function handleMyJobs(ctx: RouteContext) {
  if (!ctx.userId) return jsonResponse({ error: 'Unauthorized' }, 401);
  const { data, error } = await ctx.supabase
    .from('jobs')
    .select('*, requester_bot:bots!jobs_requester_bot_id_fkey(name), provider_bot:bots!jobs_provider_bot_id_fkey(name)')
    .eq('requester_user_id', ctx.userId)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return jsonResponse(data);
}

async function handleMyTransactions(ctx: RouteContext) {
  if (!ctx.userId) return jsonResponse({ error: 'Unauthorized' }, 401);
  const { data: userBots } = await ctx.supabase.from('bots').select('id').eq('owner_id', ctx.userId);
  const botIds = (userBots || []).map(b => b.id);
  if (botIds.length === 0) return jsonResponse([]);
  const { data, error } = await ctx.supabase
    .from('transactions').select('*')
    .or(`from_bot_id.in.(${botIds.join(',')}),to_bot_id.in.(${botIds.join(',')})`)
    .order('created_at', { ascending: false }).limit(50);
  if (error) throw error;
  return jsonResponse(data);
}

// ========== Router ==========

const routes: Record<string, { method: string; handler: (ctx: RouteContext) => Promise<Response> }> = {
  'list-bots': { method: 'GET', handler: handleListBots },
  'create-bot': { method: 'POST', handler: handleCreateBot },
  'hire-bot': { method: 'POST', handler: handleHireBot },
  'my-bots': { method: 'GET', handler: handleMyBots },
  'my-jobs': { method: 'GET', handler: handleMyJobs },
  'my-transactions': { method: 'GET', handler: handleMyTransactions },
};

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

    const route = routes[action];
    if (!route) {
      return jsonResponse({ error: 'Unknown action', availableActions: Object.keys(routes) }, 400);
    }
    if (req.method !== route.method) {
      return jsonResponse({ error: `Action "${action}" requires ${route.method}` }, 405);
    }

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
    }

    const userId = await authenticateUser(req, supabaseUrl, supabaseAnonKey);
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (userId && !checkRateLimit(userId)) {
      log('warn', 'Rate limit exceeded', { userId, action });
      return jsonResponse({ error: 'Too many requests. Try again later.' }, 429);
    }

    const idempotencyKey = req.headers.get('idempotency-key');
    if (idempotencyKey && req.method === 'POST') {
      const cached = getIdempotentResponse(idempotencyKey);
      if (cached) {
        log('info', 'Idempotent response returned', { idempotencyKey, action });
        return new Response(cached.response, { status: cached.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
    }

    const ctx: RouteContext = { supabase, userId, body, url, idempotencyKey };
    const response = await route.handler(ctx);

    log('info', 'Request completed', { action, userId, duration: Date.now() - startTime });
    return response;

  } catch (error) {
    const duration = Date.now() - startTime;
    if (error instanceof ValidationError) {
      log('warn', 'Validation error', { error: error.message, duration });
      return jsonResponse({ error: error.message }, 400);
    }
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Unhandled error', { error: message, duration });
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
