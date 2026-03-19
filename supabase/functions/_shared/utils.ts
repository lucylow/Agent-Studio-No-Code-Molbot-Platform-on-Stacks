// ========== Shared Edge Function Utilities ==========
// Centralized CORS, auth, rate limiting, validation, logging, and helpers
// Import via: import { ... } from "../_shared/utils.ts";

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ========== CORS ==========

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, idempotency-key',
};

// ========== Response Helpers ==========

export function jsonResponse(data: unknown, status = 200, headers?: Record<string, string>): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json', ...headers },
  });
}

export function errorResponse(message: string, status: number, requestId?: string): Response {
  return jsonResponse({ error: message, ...(requestId && { requestId }) }, status);
}

// ========== Validation ==========

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function validateString(val: unknown, field: string, min = 1, max = 256): string {
  if (typeof val !== 'string') throw new ValidationError(`${field} must be a string`);
  const trimmed = val.trim();
  if (trimmed.length < min) throw new ValidationError(`${field} must be at least ${min} characters`);
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  // Basic XSS prevention — strip HTML tags
  return trimmed.replace(/<[^>]*>/g, '');
}

export function validateNumber(val: unknown, field: string, min = 0, max = 1e12): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (typeof num !== 'number' || isNaN(num) || !isFinite(num)) {
    throw new ValidationError(`${field} must be a valid number`);
  }
  if (num < min) throw new ValidationError(`${field} must be >= ${min}`);
  if (num > max) throw new ValidationError(`${field} must be <= ${max}`);
  return num;
}

export function validateInt(val: unknown, field: string, min = 1): number {
  const num = validateNumber(val, field, min);
  if (!Number.isInteger(num)) throw new ValidationError(`${field} must be an integer`);
  return num;
}

export function validateEnum(val: unknown, field: string, allowed: string[]): string {
  const str = validateString(val, field);
  if (!allowed.includes(str)) throw new ValidationError(`${field} must be one of: ${allowed.join(', ')}`);
  return str;
}

export function validateArray(val: unknown, field: string, maxLength = 10): unknown[] {
  if (!Array.isArray(val)) throw new ValidationError(`${field} must be an array`);
  if (val.length > maxLength) throw new ValidationError(`${field} must have at most ${maxLength} items`);
  return val;
}

export function validateSkills(val: unknown): string[] {
  const arr = validateArray(val, 'skills', 10);
  return arr.map((s, i) => validateString(s, `skills[${i}]`, 1, 64));
}

// ========== Authentication ==========

export async function authenticateUser(
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string
): Promise<{ userId: string | null; authHeader: string | null }> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return { userId: null, authHeader: null };

  try {
    const token = authHeader.replace('Bearer ', '');
    const client = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data, error } = await client.auth.getClaims(token);
    if (error || !data?.claims) return { userId: null, authHeader };
    return { userId: data.claims.sub as string, authHeader };
  } catch {
    return { userId: null, authHeader };
  }
}

export function requireAuth(userId: string | null, requestId?: string): asserts userId is string {
  if (!userId) {
    throw new AuthError('Authentication required');
  }
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

// ========== Rate Limiting (with automatic cleanup) ==========

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const CLEANUP_INTERVAL = 300_000; // 5 minutes
let lastCleanup = Date.now();

function cleanupRateLimits() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  for (const [key, entry] of rateLimitMap) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

export function checkRateLimit(key: string, max = 30, windowMs = 60_000): boolean {
  cleanupRateLimits();
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (entry.count >= max) return false;
  entry.count++;
  return true;
}

export function getRateLimitHeaders(key: string, max = 30): Record<string, string> {
  const entry = rateLimitMap.get(key);
  const remaining = entry ? Math.max(0, max - entry.count) : max;
  const reset = entry ? Math.ceil((entry.resetAt - Date.now()) / 1000) : 60;
  return {
    'X-RateLimit-Limit': String(max),
    'X-RateLimit-Remaining': String(remaining),
    'X-RateLimit-Reset': String(Math.max(0, reset)),
  };
}

// ========== Idempotency ==========

const idempotencyCache = new Map<string, { response: string; status: number; expiry: number }>();

export function getIdempotentResponse(key: string): { response: string; status: number } | null {
  const entry = idempotencyCache.get(key);
  if (!entry || Date.now() > entry.expiry) {
    idempotencyCache.delete(key);
    return null;
  }
  return { response: entry.response, status: entry.status };
}

export function setIdempotentResponse(key: string, response: string, status: number, ttlMs = 86_400_000): void {
  idempotencyCache.set(key, { response, status, expiry: Date.now() + ttlMs });
  // Limit cache size
  if (idempotencyCache.size > 10_000) {
    const oldest = idempotencyCache.keys().next().value;
    if (oldest) idempotencyCache.delete(oldest);
  }
}

// ========== Structured Logging ==========

export interface LogContext {
  service: string;
  requestId: string;
  userId?: string | null;
  action?: string;
  [key: string]: unknown;
}

export function createLogger(service: string) {
  return {
    info: (message: string, data?: Record<string, unknown>) => logEntry('info', service, message, data),
    warn: (message: string, data?: Record<string, unknown>) => logEntry('warn', service, message, data),
    error: (message: string, data?: Record<string, unknown>) => logEntry('error', service, message, data),
  };
}

function logEntry(level: string, service: string, message: string, data?: Record<string, unknown>) {
  const entry = {
    timestamp: new Date().toISOString(),
    level,
    service,
    message,
    ...data,
  };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

// ========== Mock Blockchain Helpers ==========

export function mockTxId(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

export function mockStacksAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return `ST${Array.from({ length: 33 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
}

export function mockBitcoinTxId(): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

export function mockBlockHeight(): number {
  return 100000 + Math.floor(Math.random() * 10000);
}

export function mockBurnBlockHeight(): number {
  return 850000 + Math.floor(Math.random() * 1000);
}

// ========== Request Context ==========

export interface RequestContext {
  supabase: any;
  userId: string | null;
  body: Record<string, unknown>;
  url: URL;
  requestId: string;
  idempotencyKey: string | null;
  startTime: number;
}

export function getSupabaseClients() {
  const url = Deno.env.get('SUPABASE_URL')!;
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  return { url, anonKey, serviceKey, adminClient: createClient(url, serviceKey) };
}

// ========== Pagination ==========

export function parsePagination(url: URL, defaults = { limit: 20, maxLimit: 100 }): { limit: number; offset: number; page: number } {
  const page = Math.max(1, parseInt(url.searchParams.get('page') || '1') || 1);
  const rawLimit = parseInt(url.searchParams.get('limit') || String(defaults.limit)) || defaults.limit;
  const limit = Math.min(Math.max(1, rawLimit), defaults.maxLimit);
  return { limit, offset: (page - 1) * limit, page };
}

export function paginatedResponse(data: unknown[], total: number | null, page: number, limit: number) {
  return {
    data,
    pagination: {
      page,
      limit,
      total: total || data.length,
      totalPages: total ? Math.ceil(total / limit) : 1,
      hasMore: total ? page * limit < total : false,
    },
  };
}

// ========== Main Handler Wrapper ==========

type HandlerFn = (ctx: RequestContext) => Promise<Response>;

interface RouteMap {
  [action: string]: { method: 'GET' | 'POST' | 'PUT' | 'DELETE'; handler: HandlerFn; rateLimit?: number; public?: boolean };
}

export function createEdgeHandler(service: string, routes: RouteMap) {
  const logger = createLogger(service);

  return async (req: Request): Promise<Response> => {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const startTime = Date.now();
    const requestId = crypto.randomUUID();

    try {
      const { url: supabaseUrl, anonKey, adminClient } = getSupabaseClients();
      const reqUrl = new URL(req.url);
      const action = reqUrl.searchParams.get('action');

      // Health check — no auth needed
      if (action === 'health') {
        return jsonResponse({
          status: 'healthy',
          service,
          timestamp: new Date().toISOString(),
          requestId,
        });
      }

      if (!action) {
        return errorResponse('Missing action parameter', 400, requestId);
      }

      const route = routes[action];
      if (!route) {
        return jsonResponse({
          error: 'Unknown action',
          requestId,
          availableActions: Object.keys(routes),
        }, 400);
      }

      if (req.method !== route.method) {
        return errorResponse(`Action "${action}" requires ${route.method}`, 405, requestId);
      }

      // Parse body for non-GET
      let body: Record<string, unknown> = {};
      if (['POST', 'PUT', 'DELETE'].includes(req.method)) {
        try {
          body = await req.json();
        } catch {
          return errorResponse('Invalid JSON body', 400, requestId);
        }
      }

      // Auth
      const { userId } = await authenticateUser(req, supabaseUrl, anonKey);

      // Rate limiting
      const rateLimitKey = userId || `anon:${req.headers.get('x-forwarded-for') || 'unknown'}`;
      const maxRequests = route.rateLimit || 30;
      if (!checkRateLimit(rateLimitKey, maxRequests)) {
        logger.warn('Rate limit exceeded', { requestId, key: rateLimitKey, action });
        return jsonResponse(
          { error: 'Too many requests. Try again later.', requestId },
          429,
          getRateLimitHeaders(rateLimitKey, maxRequests)
        );
      }

      // Idempotency (POST only)
      const idempotencyKey = req.headers.get('idempotency-key');
      if (idempotencyKey && req.method === 'POST') {
        const cached = getIdempotentResponse(idempotencyKey);
        if (cached) {
          logger.info('Idempotent cache hit', { requestId, idempotencyKey, action });
          return new Response(cached.response, {
            status: cached.status,
            headers: { ...corsHeaders, 'Content-Type': 'application/json', 'X-Idempotent': 'true' },
          });
        }
      }

      const ctx: RequestContext = {
        supabase: adminClient,
        userId,
        body,
        url: reqUrl,
        requestId,
        idempotencyKey,
        startTime,
      };

      const response = await route.handler(ctx);

      const duration = Date.now() - startTime;
      logger.info('Request completed', { requestId, action, userId, duration });
      return response;

    } catch (error) {
      const duration = Date.now() - startTime;

      if (error instanceof ValidationError) {
        logger.warn('Validation error', { requestId, error: error.message, duration });
        return errorResponse(error.message, 400, requestId);
      }

      if (error instanceof AuthError) {
        return errorResponse('Unauthorized', 401, requestId);
      }

      const message = error instanceof Error ? error.message : 'Unknown error';
      logger.error('Unhandled error', { requestId, error: message, stack: error instanceof Error ? error.stack : undefined, duration });
      // Never leak internal error details to client
      return errorResponse('Internal server error', 500, requestId);
    }
  };
}
