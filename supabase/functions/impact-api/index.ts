// Impact Tracker & Template Royalties API
// Backend edge function for ecosystem metrics and template royalty management.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, requireAuth,
  validateString, validateNumber, validateInt,
  mockTxId, mockBlockHeight,
  type RequestContext,
} from "../_shared/utils.ts";

// ========== Impact Stats ==========

async function handleGetStats(_ctx: RequestContext) {
  // Aggregate stats from transactions
  const [botCount, jobCount, txCount, nftCount, swarmCount] = await Promise.all([
    _ctx.supabase.from('bots').select('*', { count: 'exact', head: true }),
    _ctx.supabase.from('jobs').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    _ctx.supabase.from('transactions').select('*', { count: 'exact', head: true }),
    _ctx.supabase.from('nft_tokens').select('*', { count: 'exact', head: true }).eq('burned', false),
    _ctx.supabase.from('swarms').select('*', { count: 'exact', head: true }),
  ]);

  // Calculate total volumes
  const { data: sbtcTxs } = await _ctx.supabase
    .from('transactions')
    .select('amount')
    .eq('asset', 'sBTC')
    .eq('status', 'confirmed');

  const { data: usdcxTxs } = await _ctx.supabase
    .from('transactions')
    .select('amount')
    .eq('asset', 'USDCx')
    .eq('status', 'confirmed');

  const totalSbtcVolume = (sbtcTxs || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);
  const totalUsdcxVolume = (usdcxTxs || []).reduce((sum: number, tx: any) => sum + (tx.amount || 0), 0);

  return jsonResponse({
    requestId: _ctx.requestId,
    ecosystem: {
      totalBots: botCount.count || 0,
      completedJobs: jobCount.count || 0,
      totalTransactions: txCount.count || 0,
      circulatingNFTs: nftCount.count || 0,
      activeSwarms: swarmCount.count || 0,
      sbtcVolume: parseFloat(totalSbtcVolume.toFixed(8)),
      usdcxVolume: parseFloat(totalUsdcxVolume.toFixed(6)),
      totalVolumeUsd: parseFloat((totalSbtcVolume * 60000 + totalUsdcxVolume).toFixed(2)),
    },
    // Maps to impact-tracker.clar on-chain stats
    onChainMapping: {
      'total-bots': botCount.count || 0,
      'total-payments': txCount.count || 0,
      'total-sbtc-volume': Math.round(totalSbtcVolume * 1e8),
      'total-usdcx-volume': Math.round(totalUsdcxVolume * 1e6),
    },
    clarityContract: 'impact-tracker.get-ecosystem-summary',
  });
}

async function handleIncrementStat(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const statName = validateString(ctx.body.stat as string, 'stat', 1, 64);
  const amount = validateInt(ctx.body.amount ?? 1, 'amount');

  // Record as a transaction for auditability
  await ctx.supabase.from('transactions').insert({
    tx_id: mockTxId(),
    amount: 0,
    asset: 'sBTC',
    tx_type: 'impact_stat',
    status: 'confirmed',
    metadata: {
      protocol: 'impact-tracker',
      stat: statName,
      incrementAmount: amount,
      clarityContract: 'impact-tracker.increment-stat',
      blockHeight: mockBlockHeight(),
    },
  });

  return jsonResponse({
    success: true,
    stat: statName,
    incrementedBy: amount,
    clarityEvent: { topic: 'stat-incremented', stat: statName, amount },
    requestId: ctx.requestId,
  });
}

// ========== Template Royalties ==========

async function handleCreateTemplate(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const name = validateString(ctx.body.name as string, 'name', 1, 64);
  const description = validateString(ctx.body.description as string || '', 'description', 0, 256);
  const royaltyBps = validateInt(ctx.body.royaltyBps ?? 500, 'royaltyBps');

  if (royaltyBps > 2000) {
    return jsonResponse({ error: 'Royalty cannot exceed 20% (2000 bps)', requestId: ctx.requestId }, 400);
  }

  const templateId = `tpl-${crypto.randomUUID().slice(0, 8)}`;
  const txId = mockTxId();

  await ctx.supabase.from('transactions').insert({
    tx_id: txId,
    amount: 0,
    asset: 'sBTC',
    tx_type: 'template_created',
    status: 'confirmed',
    metadata: {
      protocol: 'template-royalties',
      templateId,
      name,
      description,
      royaltyBps,
      creator: ctx.userId,
      clarityContract: 'template-royalties.create-template',
      blockHeight: mockBlockHeight(),
    },
  });

  return jsonResponse({
    templateId,
    name,
    royaltyBps,
    royaltyPercent: `${(royaltyBps / 100).toFixed(1)}%`,
    txId,
    clarityEvent: { topic: 'template-created', templateId, royaltyBps },
    requestId: ctx.requestId,
  });
}

async function handlePayRoyalty(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const templateId = validateString(ctx.body.templateId as string, 'templateId');
  const revenue = validateNumber(ctx.body.revenue, 'revenue', 0.000001, 1000000);

  // Look up template
  const { data: templateTxs } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_type', 'template_created')
    .limit(100);

  const templateTx = (templateTxs || []).find(
    (tx: any) => tx.metadata?.templateId === templateId
  );

  if (!templateTx) {
    return jsonResponse({ error: 'Template not found', requestId: ctx.requestId }, 404);
  }

  const meta = templateTx.metadata as any;
  const royaltyBps = meta.royaltyBps || 500;
  const royaltyAmount = (revenue * royaltyBps) / 10000;
  const txId = mockTxId();

  await ctx.supabase.from('transactions').insert({
    tx_id: txId,
    amount: royaltyAmount,
    asset: 'sBTC',
    tx_type: 'royalty_payment',
    status: 'confirmed',
    metadata: {
      protocol: 'template-royalties',
      templateId,
      revenue,
      royaltyBps,
      royaltyAmount,
      creator: meta.creator,
      clarityContract: 'template-royalties.pay-royalty',
      blockHeight: mockBlockHeight(),
    },
  });

  return jsonResponse({
    success: true,
    templateId,
    revenue,
    royaltyAmount,
    royaltyBps,
    txId,
    creator: meta.creator,
    clarityEvent: { topic: 'royalty-paid', templateId, royaltyAmount },
    requestId: ctx.requestId,
  });
}

async function handleListTemplates(ctx: RequestContext) {
  const { data } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_type', 'template_created')
    .order('created_at', { ascending: false })
    .limit(50);

  const templates = (data || []).map((tx: any) => ({
    templateId: tx.metadata?.templateId,
    name: tx.metadata?.name,
    description: tx.metadata?.description,
    royaltyBps: tx.metadata?.royaltyBps,
    royaltyPercent: `${((tx.metadata?.royaltyBps || 0) / 100).toFixed(1)}%`,
    creator: tx.metadata?.creator,
    createdAt: tx.created_at,
  }));

  return jsonResponse({ templates, requestId: ctx.requestId });
}

// ========== Route Map ==========

const routes = {
  'stats': { method: 'GET' as const, handler: handleGetStats, public: true },
  'increment': { method: 'POST' as const, handler: handleIncrementStat, rateLimit: 30 },
  'create-template': { method: 'POST' as const, handler: handleCreateTemplate, rateLimit: 10 },
  'pay-royalty': { method: 'POST' as const, handler: handlePayRoyalty, rateLimit: 20 },
  'list-templates': { method: 'GET' as const, handler: handleListTemplates, public: true },
};

serve(createEdgeHandler('impact-api', routes));
