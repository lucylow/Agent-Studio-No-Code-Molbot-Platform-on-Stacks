import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ========== Helpers ==========

function mockStacksAddress(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return `ST${Array.from({ length: 33 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')}`;
}

function mockTxId(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

function mockBitcoinTxId(): string {
  return Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function log(level: string, message: string, data?: Record<string, unknown>) {
  const entry = { timestamp: new Date().toISOString(), level, service: 'stacks-api', message, ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function validateNumber(val: unknown, field: string, min = 0, max = 1e12): number {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (typeof num !== 'number' || isNaN(num)) throw new Error(`${field} must be a number`);
  if (num < min || num > max) throw new Error(`${field} must be between ${min} and ${max}`);
  return num;
}

function validateInt(val: unknown, field: string, min = 1): number {
  const num = validateNumber(val, field, min);
  if (!Number.isInteger(num)) throw new Error(`${field} must be an integer`);
  return num;
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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const action = url.searchParams.get('action');
    if (!action) return jsonResponse({ error: 'Missing action parameter' }, 400);

    let body: Record<string, unknown> = {};
    if (req.method === 'POST') {
      try { body = await req.json(); } catch { return jsonResponse({ error: 'Invalid JSON body' }, 400); }
    }

    const userId = await authenticateUser(req, supabaseUrl, supabaseAnonKey);

    // Rate limit by userId or IP-based fallback key
    const rateLimitKey = userId || 'anon';
    if (!checkRateLimit(rateLimitKey)) {
      log('warn', 'Rate limit exceeded', { key: rateLimitKey, action });
      return jsonResponse({ error: 'Too many requests' }, 429);
    }

    // ========== x402 sBTC PAYMENT ==========
    if (action === 'x402-payment' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const fromBotId = validateInt(body.fromBotId, 'fromBotId');
      const toBotId = validateInt(body.toBotId, 'toBotId');
      const amount = validateNumber(body.amount, 'amount', 0.000001, 1000000);
      const asset = typeof body.asset === 'string' && ['sBTC', 'USDCx'].includes(body.asset) ? body.asset : 'sBTC';

      if (fromBotId === toBotId) return jsonResponse({ error: 'Cannot pay self' }, 400);

      const txId = mockTxId();
      const senderAddr = mockStacksAddress();
      const receiverAddr = mockStacksAddress();
      const blockHeight = 100000 + Math.floor(Math.random() * 10000);

      await supabase.from('transactions').insert({
        tx_id: txId, from_bot_id: fromBotId, to_bot_id: toBotId,
        amount, asset, tx_type: 'payment', status: 'confirmed',
        metadata: { protocol: 'x402', version: '1.0', sender: senderAddr, receiver: receiverAddr, clarityContract: 'payment-router.send-x402-payment', blockHeight, bitcoinAnchor: mockBitcoinTxId() },
      });

      log('info', 'x402 payment processed', { txId, fromBotId, toBotId, amount, userId });
      return jsonResponse({
        success: true, txId, protocol: 'x402',
        clarityEvent: { event: 'x402-payment', version: '1.0', sender: senderAddr, receiver: receiverAddr, amount, asset, blockHeight },
        bitcoinFinality: { anchored: true, burnBlockHeight: 850000 + Math.floor(Math.random() * 1000), confirmations: 100 + Math.floor(Math.random() * 50) },
      });
    }

    // ========== USDCx STREAM ==========
    if (action === 'create-stream' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const botId = validateInt(body.botId, 'botId');
      const ratePerSecond = validateNumber(body.ratePerSecond, 'ratePerSecond', 0.000001, 1000);
      const initialDeposit = validateNumber(body.initialDeposit, 'initialDeposit', 0.01, 1000000);

      const streamId = Math.floor(Math.random() * 100000);
      const txId = mockTxId();

      await supabase.from('transactions').insert({
        tx_id: txId, to_bot_id: botId, amount: initialDeposit,
        asset: 'USDCx', tx_type: 'stream_create', status: 'confirmed',
        metadata: { protocol: 'usdcx-stream', streamId, ratePerSecond, initialDeposit, clarityContract: 'usdcx-stream.create-usdcx-stream', circleXReserve: true, cctpBridge: 'ethereum-to-stacks' },
      });

      log('info', 'Stream created', { streamId, botId, userId });
      return jsonResponse({
        success: true, streamId, txId,
        stream: { botId, ratePerSecond, balance: initialDeposit, withdrawn: 0, active: true, asset: 'USDCx', startBlock: 100000 + Math.floor(Math.random() * 10000) },
        circleIntegration: { xReserve: true, cctp: { supported: true, bridge: 'ethereum-to-stacks' } },
      });
    }

    // ========== WITHDRAW STREAM ==========
    if (action === 'withdraw-stream' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const streamId = validateInt(body.streamId, 'streamId');
      const withdrawAmount = Math.random() * 10;
      const txId = mockTxId();

      log('info', 'Stream withdrawal', { streamId, withdrawAmount, userId });
      return jsonResponse({
        success: true, txId, streamId,
        withdrawAmount: parseFloat(withdrawAmount.toFixed(6)),
        clarityEvent: { event: 'stream-withdraw', streamId, amount: withdrawAmount },
      });
    }

    // ========== PoX VERIFICATION ==========
    if (action === 'verify-pox' && req.method === 'POST') {
      const stacksTxId = typeof body.txId === 'string' ? body.txId : mockTxId();
      const burnBlockHeight = 850000 + Math.floor(Math.random() * 1000);
      const confirmations = 100 + Math.floor(Math.random() * 200);

      return jsonResponse({
        stacksTxId, verified: true,
        bitcoinFinality: {
          burnBlockHeight, currentBitcoinHeight: burnBlockHeight + confirmations, confirmations,
          finalityReached: confirmations >= 100,
          proofOfTransfer: { mechanism: 'PoX', description: 'Transaction anchored to Bitcoin via Proof of Transfer', stxMiners: 'Miners commit BTC to mine STX blocks' },
        },
        dualStacking: { available: true, description: 'sBTC + STX dual stacking for enhanced yield', estimatedApy: '5-8%' },
      });
    }

    // ========== BITFLOW DEPOSIT ==========
    if (action === 'bitflow-deposit' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const botId = validateInt(body.botId, 'botId');
      const amount = validateNumber(body.amount, 'amount', 0.000001, 1000000);
      const asset = typeof body.asset === 'string' && ['sBTC', 'USDCx'].includes(body.asset) ? body.asset : 'sBTC';
      const poolId = typeof body.poolId === 'number' ? body.poolId : 1;
      const txId = mockTxId();

      await supabase.from('transactions').insert({
        tx_id: txId, from_bot_id: botId, amount, asset,
        tx_type: 'bitflow_deposit', status: 'confirmed',
        metadata: { protocol: 'bitflow', poolId, hodlmm: true, clarityContract: 'bitflow-router.add-liquidity' },
      });

      log('info', 'Bitflow deposit', { txId, botId, amount, userId });
      return jsonResponse({
        success: true, txId,
        bitflow: {
          poolId, depositAmount: amount, asset,
          hodlmm: { positionId: Math.floor(Math.random() * 10000), tickLower: -887272, tickUpper: 887272, liquidity: amount * 1000 },
          estimatedApy: `${(5 + Math.random() * 15).toFixed(2)}%`,
        },
      });
    }

    // ========== CHAINHOOK EVENTS (public) ==========
    if (action === 'chainhook-events' && req.method === 'GET') {
      const events = Array.from({ length: 5 }, (_, i) => ({
        id: i + 1,
        event: ['x402-payment', 'stream-withdraw', 'bot-registered', 'swarm-created', 'bitflow-deposit'][i],
        contract: 'ST1PQ...bot-swarm',
        blockHeight: 100000 + i * 100,
        burnBlockHeight: 850000 + i * 50,
        data: { sender: mockStacksAddress(), receiver: mockStacksAddress(), amount: (Math.random() * 0.1).toFixed(8) },
        timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      }));
      return jsonResponse({
        events,
        chainhookConfig: { name: 'Bot Payment Monitor', chain: 'stacks', predicate: 'contract_principal.events.print', webhook: 'https://api.agentstudio.io/webhooks/payment' },
      });
    }

    // ========== PASSKEY VERIFY (public) ==========
    if (action === 'passkey-verify' && req.method === 'POST') {
      const publicKey = typeof body.publicKey === 'string' ? body.publicKey : '0x' + Array.from({ length: 66 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      return jsonResponse({
        verified: true, clarity4Feature: 'secp256r1-verify',
        description: 'Clarity 4 native passkey authentication using secp256r1 curve',
        mockResult: { publicKey, signatureValid: true, curve: 'secp256r1', standard: 'WebAuthn / FIDO2' },
      });
    }

    // ========== MOCK WALLET ==========
    if (action === 'mock-wallet' && req.method === 'POST') {
      const stacksAddress = mockStacksAddress();
      const btcAddress = `bc1q${Array.from({ length: 38 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`;

      if (userId) {
        await supabase.from('profiles').update({ wallet_address: stacksAddress }).eq('user_id', userId);
      }

      log('info', 'Wallet connected', { userId, stacksAddress: stacksAddress.slice(0, 8) });
      return jsonResponse({
        connected: true, stacksAddress, btcAddress, network: 'testnet',
        appConfig: { scopes: ['store_write', 'publish_data'], userSession: 'active' },
      });
    }

    return jsonResponse({
      error: 'Unknown action',
      availableActions: ['x402-payment', 'create-stream', 'withdraw-stream', 'verify-pox', 'bitflow-deposit', 'chainhook-events', 'passkey-verify', 'mock-wallet'],
    }, 400);

  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Request failed', { error: message, duration });
    return jsonResponse({ error: message }, 500);
  }
});
