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
  const entry = { timestamp: new Date().toISOString(), level, service: 'nft-api', message, ...data };
  if (level === 'error') console.error(JSON.stringify(entry));
  else console.log(JSON.stringify(entry));
}

function mockTxId(): string {
  return `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
}

function validateInt(val: unknown, field: string, min = 1): number {
  const num = typeof val === 'number' ? val : parseInt(String(val));
  if (!Number.isInteger(num) || num < min) throw new Error(`${field} must be an integer >= ${min}`);
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

    // ========== LIST NFTs ==========
    if (action === 'list' && req.method === 'GET') {
      const { data, error } = await supabase.from('nft_tokens').select('*').eq('burned', false).order('minted_at', { ascending: false }).limit(100);
      if (error) throw error;
      return jsonResponse(data);
    }

    // ========== GET NFT ==========
    if (action === 'get' && req.method === 'GET') {
      const tokenIdParam = url.searchParams.get('tokenId');
      if (!tokenIdParam) return jsonResponse({ error: 'Missing tokenId' }, 400);
      const tokenId = parseInt(tokenIdParam);
      if (!Number.isInteger(tokenId) || tokenId < 1) return jsonResponse({ error: 'Invalid tokenId' }, 400);

      const { data, error } = await supabase.from('nft_tokens').select('*').eq('token_id', tokenId).single();
      if (error) return jsonResponse({ error: 'NFT not found' }, 404);
      return jsonResponse(data);
    }

    // ========== MY NFTs ==========
    if (action === 'my-nfts' && req.method === 'GET') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);
      const { data, error } = await supabase.from('nft_tokens').select('*').eq('owner_id', userId).order('minted_at', { ascending: false });
      if (error) throw error;
      return jsonResponse(data);
    }

    // ========== MINT NFT ==========
    if (action === 'mint' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const botId = validateInt(body.botId, 'botId');

      // Verify bot exists and belongs to user
      const { data: bot, error: botErr } = await supabase.from('bots').select('*').eq('id', botId).eq('owner_id', userId).single();
      if (botErr || !bot) return jsonResponse({ error: 'Bot not found or not owned by you' }, 403);

      // Check duplicate
      const { data: existing } = await supabase.from('nft_tokens').select('id').eq('bot_id', botId).eq('burned', false).maybeSingle();
      if (existing) return jsonResponse({ error: 'This bot already has an active NFT' }, 409);

      // Get next token ID
      const { data: lastToken } = await supabase.from('nft_tokens').select('token_id').order('token_id', { ascending: false }).limit(1).maybeSingle();
      const newTokenId = (lastToken?.token_id || 0) + 1;
      const mintTxId = mockTxId();
      const mintFee = 0.001;

      const { data: nft, error: nftErr } = await supabase.from('nft_tokens').insert({
        token_id: newTokenId, bot_id: botId, owner_id: userId, name: bot.name,
        metadata_uri: `https://agent.studio/api/nft/metadata/${newTokenId}`,
        mint_tx_id: mintTxId, mint_fee: mintFee, mint_fee_asset: 'sBTC',
      }).select().single();
      if (nftErr) throw nftErr;

      await supabase.from('transactions').insert({
        tx_id: mintTxId, amount: mintFee, asset: 'sBTC', tx_type: 'nft_mint', status: 'confirmed', to_bot_id: botId,
        metadata: { type: 'molbot-nft-mint', tokenId: newTokenId, botId, clarityContract: 'molbot-nft.mint', sip: 'SIP-009', blockHeight: 100000 + Math.floor(Math.random() * 10000) },
      });

      log('info', 'NFT minted', { tokenId: newTokenId, botId, userId });
      return jsonResponse({
        nft, transaction: { txId: mintTxId, fee: mintFee, asset: 'sBTC', protocol: 'x402' },
        message: `Molbot NFT #${newTokenId} minted for ${bot.name}`,
      });
    }

    // ========== BURN NFT ==========
    if (action === 'burn' && req.method === 'POST') {
      if (!userId) return jsonResponse({ error: 'Unauthorized' }, 401);

      const tokenId = validateInt(body.tokenId, 'tokenId');

      const { data: nft } = await supabase.from('nft_tokens').select('*').eq('token_id', tokenId).eq('owner_id', userId).eq('burned', false).single();
      if (!nft) return jsonResponse({ error: 'NFT not found or not owned by you' }, 403);

      const burnTxId = mockTxId();
      await supabase.from('nft_tokens').update({ burned: true, burned_at: new Date().toISOString() }).eq('token_id', tokenId);
      await supabase.from('transactions').insert({
        tx_id: burnTxId, amount: 0, asset: 'sBTC', tx_type: 'nft_burn', status: 'confirmed', from_bot_id: nft.bot_id,
        metadata: { type: 'molbot-nft-burn', tokenId, clarityContract: 'molbot-nft.burn', blockHeight: 100000 + Math.floor(Math.random() * 10000) },
      });

      log('info', 'NFT burned', { tokenId, userId });
      return jsonResponse({ message: `NFT #${tokenId} burned`, txId: burnTxId });
    }

    // ========== STATS ==========
    if (action === 'stats' && req.method === 'GET') {
      const { count: totalMinted } = await supabase.from('nft_tokens').select('*', { count: 'exact', head: true });
      const { count: totalBurned } = await supabase.from('nft_tokens').select('*', { count: 'exact', head: true }).eq('burned', true);
      return jsonResponse({
        totalMinted: totalMinted || 0, totalBurned: totalBurned || 0,
        circulating: (totalMinted || 0) - (totalBurned || 0),
      });
    }

    return jsonResponse({ error: 'Unknown action', actions: ['list', 'get', 'my-nfts', 'mint', 'burn', 'stats'] }, 400);

  } catch (error) {
    const duration = Date.now() - startTime;
    const message = error instanceof Error ? error.message : 'Unknown error';
    log('error', 'Request failed', { error: message, duration });
    return jsonResponse({ error: 'Internal server error' }, 500);
  }
});
