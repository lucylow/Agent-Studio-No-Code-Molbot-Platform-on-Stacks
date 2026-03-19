import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, requireAuth,
  validateInt, mockTxId, mockBlockHeight,
  parsePagination, paginatedResponse,
  type RequestContext,
} from "../_shared/utils.ts";

// ========== Route Handlers ==========

async function handleListNFTs(ctx: RequestContext) {
  const { limit, offset, page } = parsePagination(ctx.url);
  const { data, error, count } = await ctx.supabase
    .from('nft_tokens').select('*', { count: 'exact' })
    .eq('burned', false)
    .order('minted_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleGetNFT(ctx: RequestContext) {
  const tokenIdParam = ctx.url.searchParams.get('tokenId');
  if (!tokenIdParam) return jsonResponse({ error: 'Missing tokenId', requestId: ctx.requestId }, 400);
  const tokenId = parseInt(tokenIdParam);
  if (!Number.isInteger(tokenId) || tokenId < 1) return jsonResponse({ error: 'Invalid tokenId', requestId: ctx.requestId }, 400);

  const { data, error } = await ctx.supabase.from('nft_tokens').select('*').eq('token_id', tokenId).single();
  if (error || !data) return jsonResponse({ error: 'NFT not found', requestId: ctx.requestId }, 404);
  return jsonResponse(data);
}

async function handleMyNFTs(ctx: RequestContext) {
  requireAuth(ctx.userId);
  const { limit, offset, page } = parsePagination(ctx.url);
  const { data, error, count } = await ctx.supabase
    .from('nft_tokens').select('*', { count: 'exact' })
    .eq('owner_id', ctx.userId)
    .order('minted_at', { ascending: false })
    .range(offset, offset + limit - 1);
  if (error) throw error;
  return jsonResponse(paginatedResponse(data || [], count, page, limit));
}

async function handleMintNFT(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const botId = validateInt(ctx.body.botId, 'botId');

  // Parallel: verify bot ownership + check for duplicate NFT
  const [botResult, existingResult] = await Promise.all([
    ctx.supabase.from('bots').select('*').eq('id', botId).eq('owner_id', ctx.userId).single(),
    ctx.supabase.from('nft_tokens').select('id').eq('bot_id', botId).eq('burned', false).maybeSingle(),
  ]);

  if (botResult.error || !botResult.data) {
    return jsonResponse({ error: 'Bot not found or not owned by you', requestId: ctx.requestId }, 403);
  }
  if (existingResult.data) {
    return jsonResponse({ error: 'This bot already has an active NFT', requestId: ctx.requestId }, 409);
  }

  const bot = botResult.data;
  const { data: lastToken } = await ctx.supabase
    .from('nft_tokens').select('token_id')
    .order('token_id', { ascending: false }).limit(1).maybeSingle();

  const newTokenId = (lastToken?.token_id || 0) + 1;
  const mintTxId = mockTxId();
  const mintFee = 0.001;
  const blockHeight = mockBlockHeight();

  const { data: nft, error: nftErr } = await ctx.supabase.from('nft_tokens').insert({
    token_id: newTokenId, bot_id: botId, owner_id: ctx.userId, name: bot.name,
    metadata_uri: `https://agent.studio/api/nft/metadata/${newTokenId}`,
    mint_tx_id: mintTxId, mint_fee: mintFee, mint_fee_asset: 'sBTC',
  }).select().single();
  if (nftErr) throw nftErr;

  await ctx.supabase.from('transactions').insert({
    tx_id: mintTxId, amount: mintFee, asset: 'sBTC', tx_type: 'nft_mint', status: 'confirmed', to_bot_id: botId,
    metadata: {
      type: 'molbot-nft-mint', tokenId: newTokenId, botId,
      clarityContract: 'molbot-nft.mint', sip: 'SIP-009', blockHeight,
    },
  });

  return jsonResponse({
    nft,
    transaction: { txId: mintTxId, fee: mintFee, asset: 'sBTC', protocol: 'x402', blockHeight },
    message: `Molbot NFT #${newTokenId} minted for ${bot.name}`,
    requestId: ctx.requestId,
  });
}

async function handleBurnNFT(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const tokenId = validateInt(ctx.body.tokenId, 'tokenId');
  const { data: nft } = await ctx.supabase
    .from('nft_tokens').select('*')
    .eq('token_id', tokenId).eq('owner_id', ctx.userId).eq('burned', false).single();
  if (!nft) return jsonResponse({ error: 'NFT not found or not owned by you', requestId: ctx.requestId }, 403);

  const burnTxId = mockTxId();

  // Parallel: update NFT + record transaction
  await Promise.all([
    ctx.supabase.from('nft_tokens').update({ burned: true, burned_at: new Date().toISOString() }).eq('token_id', tokenId),
    ctx.supabase.from('transactions').insert({
      tx_id: burnTxId, amount: 0, asset: 'sBTC', tx_type: 'nft_burn', status: 'confirmed', from_bot_id: nft.bot_id,
      metadata: {
        type: 'molbot-nft-burn', tokenId,
        clarityContract: 'molbot-nft.burn', blockHeight: mockBlockHeight(),
      },
    }),
  ]);

  return jsonResponse({ message: `NFT #${tokenId} burned`, txId: burnTxId, requestId: ctx.requestId });
}

async function handleNFTStats(ctx: RequestContext) {
  const [totalResult, burnedResult] = await Promise.all([
    ctx.supabase.from('nft_tokens').select('*', { count: 'exact', head: true }),
    ctx.supabase.from('nft_tokens').select('*', { count: 'exact', head: true }).eq('burned', true),
  ]);

  return jsonResponse({
    totalMinted: totalResult.count || 0,
    totalBurned: burnedResult.count || 0,
    circulating: (totalResult.count || 0) - (burnedResult.count || 0),
    requestId: ctx.requestId,
  });
}

// ========== Route Map ==========

const routes = {
  'list': { method: 'GET' as const, handler: handleListNFTs, public: true },
  'get': { method: 'GET' as const, handler: handleGetNFT, public: true },
  'my-nfts': { method: 'GET' as const, handler: handleMyNFTs },
  'mint': { method: 'POST' as const, handler: handleMintNFT, rateLimit: 5 },
  'burn': { method: 'POST' as const, handler: handleBurnNFT, rateLimit: 5 },
  'stats': { method: 'GET' as const, handler: handleNFTStats, public: true },
};

serve(createEdgeHandler('nft-api', routes));
