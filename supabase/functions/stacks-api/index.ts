import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, requireAuth,
  validateNumber, validateInt,
  mockTxId, mockStacksAddress, mockBitcoinTxId, mockBlockHeight, mockBurnBlockHeight,
  type RequestContext,
} from "../_shared/utils.ts";

// ========== Route Handlers ==========

async function handleX402Payment(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const fromBotId = validateInt(ctx.body.fromBotId, 'fromBotId');
  const toBotId = validateInt(ctx.body.toBotId, 'toBotId');
  const amount = validateNumber(ctx.body.amount, 'amount', 0.000001, 1000000);
  const asset = typeof ctx.body.asset === 'string' && ['sBTC', 'USDCx'].includes(ctx.body.asset)
    ? ctx.body.asset : 'sBTC';

  if (fromBotId === toBotId) {
    return jsonResponse({ error: 'Cannot pay self', requestId: ctx.requestId }, 400);
  }

  const txId = mockTxId();
  const senderAddr = mockStacksAddress();
  const receiverAddr = mockStacksAddress();
  const blockHeight = mockBlockHeight();
  const burnBlock = mockBurnBlockHeight();

  await ctx.supabase.from('transactions').insert({
    tx_id: txId, from_bot_id: fromBotId, to_bot_id: toBotId,
    amount, asset, tx_type: 'payment', status: 'confirmed',
    metadata: {
      protocol: 'x402', version: '1.0',
      sender: senderAddr, receiver: receiverAddr,
      clarityContract: 'payment-router.send-x402-payment',
      blockHeight, bitcoinAnchor: mockBitcoinTxId(),
    },
  });

  return jsonResponse({
    success: true, txId, protocol: 'x402', requestId: ctx.requestId,
    clarityEvent: {
      event: 'x402-payment', version: '1.0',
      sender: senderAddr, receiver: receiverAddr,
      amount, asset, blockHeight,
    },
    bitcoinFinality: {
      anchored: true, burnBlockHeight: burnBlock,
      confirmations: 100 + Math.floor(Math.random() * 50),
    },
  });
}

async function handleCreateStream(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const botId = validateInt(ctx.body.botId, 'botId');
  const ratePerSecond = validateNumber(ctx.body.ratePerSecond, 'ratePerSecond', 0.000001, 1000);
  const initialDeposit = validateNumber(ctx.body.initialDeposit, 'initialDeposit', 0.01, 1000000);

  const streamId = Math.floor(Math.random() * 100000);
  const txId = mockTxId();
  const blockHeight = mockBlockHeight();

  await ctx.supabase.from('transactions').insert({
    tx_id: txId, to_bot_id: botId, amount: initialDeposit,
    asset: 'USDCx', tx_type: 'stream_create', status: 'confirmed',
    metadata: {
      protocol: 'usdcx-stream', streamId, ratePerSecond, initialDeposit,
      clarityContract: 'usdcx-stream.create-usdcx-stream',
      circleXReserve: true, cctpBridge: 'ethereum-to-stacks',
      blockHeight,
    },
  });

  return jsonResponse({
    success: true, streamId, txId, requestId: ctx.requestId,
    stream: {
      botId, ratePerSecond, balance: initialDeposit,
      withdrawn: 0, active: true, asset: 'USDCx', startBlock: blockHeight,
    },
    circleIntegration: { xReserve: true, cctp: { supported: true, bridge: 'ethereum-to-stacks' } },
  });
}

async function handleWithdrawStream(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const streamId = validateInt(ctx.body.streamId, 'streamId');
  const withdrawAmount = parseFloat((Math.random() * 10).toFixed(6));
  const txId = mockTxId();

  return jsonResponse({
    success: true, txId, streamId, requestId: ctx.requestId,
    withdrawAmount,
    clarityEvent: { event: 'stream-withdraw', streamId, amount: withdrawAmount },
  });
}

async function handleVerifyPoX(_ctx: RequestContext) {
  const stacksTxId = typeof _ctx.body.txId === 'string' ? _ctx.body.txId : mockTxId();
  const burnBlock = mockBurnBlockHeight();
  const confirmations = 100 + Math.floor(Math.random() * 200);

  return jsonResponse({
    stacksTxId, verified: true, requestId: _ctx.requestId,
    bitcoinFinality: {
      burnBlockHeight: burnBlock,
      currentBitcoinHeight: burnBlock + confirmations,
      confirmations,
      finalityReached: confirmations >= 100,
      proofOfTransfer: {
        mechanism: 'PoX',
        description: 'Transaction anchored to Bitcoin via Proof of Transfer',
        stxMiners: 'Miners commit BTC to mine STX blocks',
      },
    },
    dualStacking: {
      available: true,
      description: 'sBTC + STX dual stacking for enhanced yield',
      estimatedApy: '5-8%',
    },
  });
}

async function handleBitflowDeposit(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const botId = validateInt(ctx.body.botId, 'botId');
  const amount = validateNumber(ctx.body.amount, 'amount', 0.000001, 1000000);
  const asset = typeof ctx.body.asset === 'string' && ['sBTC', 'USDCx'].includes(ctx.body.asset)
    ? ctx.body.asset : 'sBTC';
  const poolId = typeof ctx.body.poolId === 'number' ? ctx.body.poolId : 1;
  const txId = mockTxId();

  await ctx.supabase.from('transactions').insert({
    tx_id: txId, from_bot_id: botId, amount, asset,
    tx_type: 'bitflow_deposit', status: 'confirmed',
    metadata: {
      protocol: 'bitflow', poolId, hodlmm: true,
      clarityContract: 'bitflow-router.add-liquidity',
      blockHeight: mockBlockHeight(),
    },
  });

  return jsonResponse({
    success: true, txId, requestId: ctx.requestId,
    bitflow: {
      poolId, depositAmount: amount, asset,
      hodlmm: {
        positionId: Math.floor(Math.random() * 10000),
        tickLower: -887272, tickUpper: 887272,
        liquidity: amount * 1000,
      },
      estimatedApy: `${(5 + Math.random() * 15).toFixed(2)}%`,
    },
  });
}

async function handleChainhookEvents(_ctx: RequestContext) {
  const events = Array.from({ length: 5 }, (_, i) => ({
    id: i + 1,
    event: ['x402-payment', 'stream-withdraw', 'bot-registered', 'swarm-created', 'bitflow-deposit'][i],
    contract: 'ST1PQ...bot-swarm',
    blockHeight: 100000 + i * 100,
    burnBlockHeight: 850000 + i * 50,
    data: {
      sender: mockStacksAddress(),
      receiver: mockStacksAddress(),
      amount: (Math.random() * 0.1).toFixed(8),
    },
    timestamp: new Date(Date.now() - i * 3600000).toISOString(),
  }));

  return jsonResponse({
    events,
    chainhookConfig: {
      name: 'Bot Payment Monitor', chain: 'stacks',
      predicate: 'contract_principal.events.print',
      webhook: 'https://api.agentstudio.io/webhooks/payment',
    },
    requestId: _ctx.requestId,
  });
}

async function handlePasskeyVerify(ctx: RequestContext) {
  const publicKey = typeof ctx.body.publicKey === 'string'
    ? ctx.body.publicKey
    : '0x' + Array.from({ length: 66 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

  return jsonResponse({
    verified: true, clarity4Feature: 'secp256r1-verify', requestId: ctx.requestId,
    description: 'Clarity 4 native passkey authentication using secp256r1 curve',
    mockResult: { publicKey, signatureValid: true, curve: 'secp256r1', standard: 'WebAuthn / FIDO2' },
  });
}

async function handleMockWallet(ctx: RequestContext) {
  const stacksAddress = mockStacksAddress();
  const btcAddress = `bc1q${Array.from({ length: 38 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('')}`;

  if (ctx.userId) {
    await ctx.supabase.from('profiles').update({ wallet_address: stacksAddress }).eq('user_id', ctx.userId);
  }

  return jsonResponse({
    connected: true, stacksAddress, btcAddress, network: 'testnet', requestId: ctx.requestId,
    appConfig: { scopes: ['store_write', 'publish_data'], userSession: 'active' },
  });
}

// ========== Route Map ==========

const routes = {
  'x402-payment': { method: 'POST' as const, handler: handleX402Payment, rateLimit: 20 },
  'create-stream': { method: 'POST' as const, handler: handleCreateStream, rateLimit: 10 },
  'withdraw-stream': { method: 'POST' as const, handler: handleWithdrawStream, rateLimit: 10 },
  'verify-pox': { method: 'POST' as const, handler: handleVerifyPoX, public: true },
  'bitflow-deposit': { method: 'POST' as const, handler: handleBitflowDeposit, rateLimit: 10 },
  'chainhook-events': { method: 'GET' as const, handler: handleChainhookEvents, public: true },
  'passkey-verify': { method: 'POST' as const, handler: handlePasskeyVerify, public: true },
  'mock-wallet': { method: 'POST' as const, handler: handleMockWallet },
};

serve(createEdgeHandler('stacks-api', routes));
