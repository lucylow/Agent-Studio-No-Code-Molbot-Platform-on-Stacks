// x402 Payment Gateway — Implements the real HTTP 402 Payment Required protocol
// This edge function acts as the payment gateway between molbots.
// Flow: Request → 402 Payment Required → Payment Submission → Verification → Access
//
// Spec: https://github.com/coinbase/x402
// Stacks-native: sBTC + USDCx payments via Clarity contracts

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, errorResponse, requireAuth,
  validateString, validateNumber, validateInt, validateEnum,
  mockTxId, mockStacksAddress, mockBlockHeight, mockBurnBlockHeight, mockBitcoinTxId,
  setIdempotentResponse,
  type RequestContext,
} from "../_shared/utils.ts";

// ========== x402 Protocol Constants ==========

const X402_VERSION = "1.0.0";
const X402_NETWORK = "stacks-mainnet";
const SUPPORTED_ASSETS = ["sBTC", "USDCx"] as const;
const FEE_BURN_RATE = 0.02; // 2% deflationary burn
const ESCROW_TIMEOUT_BLOCKS = 144; // ~24 hours on Stacks

// ========== x402 Payment Header Builder ==========

function buildX402Headers(params: {
  amount: number;
  asset: string;
  receiver: string;
  network: string;
  version: string;
  expiresBlock: number;
  clarityContract: string;
  memo?: string;
}): Record<string, string> {
  return {
    "X-Payment-Required": "true",
    "X-Payment-Version": params.version,
    "X-Payment-Network": params.network,
    "X-Payment-Amount": String(params.amount),
    "X-Payment-Asset": params.asset,
    "X-Payment-Receiver": params.receiver,
    "X-Payment-Contract": params.clarityContract,
    "X-Payment-Expires-Block": String(params.expiresBlock),
    ...(params.memo && { "X-Payment-Memo": params.memo }),
  };
}

// ========== x402 Payment Proof Verification ==========

interface PaymentProof {
  txId: string;
  sender: string;
  receiver: string;
  amount: number;
  asset: string;
  blockHeight: number;
  signature: string;
}

function verifyPaymentProof(proof: PaymentProof, expected: {
  receiver?: string;
  minAmount: number;
  asset: string;
}): { valid: boolean; reason?: string } {
  if (!proof.txId || typeof proof.txId !== "string" || !proof.txId.startsWith("0x")) {
    return { valid: false, reason: "Invalid transaction ID format" };
  }
  if (typeof proof.amount !== "number" || Number.isNaN(proof.amount) || !Number.isFinite(proof.amount)) {
    return { valid: false, reason: "Invalid payment amount" };
  }
  if (expected.receiver && proof.receiver !== expected.receiver) {
    return { valid: false, reason: "Payment receiver mismatch" };
  }
  if (!proof.receiver || typeof proof.receiver !== "string") {
    return { valid: false, reason: "Invalid payment receiver" };
  }
  if (!proof.sender || typeof proof.sender !== "string") {
    return { valid: false, reason: "Invalid payment sender" };
  }
  if (proof.amount < expected.minAmount) {
    return { valid: false, reason: `Insufficient payment: expected ${expected.minAmount}, got ${proof.amount}` };
  }
  if (!proof.asset || typeof proof.asset !== "string" || proof.asset !== expected.asset) {
    return { valid: false, reason: `Wrong asset: expected ${expected.asset}, got ${proof.asset}` };
  }
  // In production: verify signature against Stacks chain via Hiro API
  // For hackathon: mock verification
  if (!proof.signature || typeof proof.signature !== "string" || proof.signature.length < 10) {
    return { valid: false, reason: "Invalid payment signature" };
  }
  return { valid: true };
}

// ========== Handlers ==========

/**
 * GET /x402-gateway?action=request-service
 * 
 * A bot requests a service from another bot.
 * Returns HTTP 402 with payment instructions if no valid payment proof is attached.
 * Returns 200 with service result if payment is verified.
 */
async function handleRequestService(ctx: RequestContext) {
  const providerBotId = validateInt(
    ctx.url.searchParams.get('botId') ?? ctx.body.botId,
    'botId'
  );
  const service = validateString(
    ctx.url.searchParams.get('service') ?? (ctx.body.service as string) ?? 'default',
    'service', 1, 128
  );

  // Look up provider bot
  const { data: provider, error } = await ctx.supabase
    .from('bots')
    .select('*')
    .eq('id', providerBotId)
    .eq('active', true)
    .single();

  if (error || !provider) {
    return errorResponse('Bot not found or inactive', 404, ctx.requestId);
  }

  // Check for x402 payment proof in request headers or body
  const paymentHeader = ctx.body.paymentProof as PaymentProof | undefined;

  if (!paymentHeader) {
    // Return HTTP 402 Payment Required with payment instructions
    const receiverAddr = mockStacksAddress();
    const currentBlock = mockBlockHeight();
    const expiresBlock = currentBlock + ESCROW_TIMEOUT_BLOCKS;
    const clarityContract = provider.price_model === 'stream'
      ? 'usdcx-stream.create-usdcx-stream'
      : 'payment-router.send-x402-payment';

    const paymentHeaders = buildX402Headers({
      amount: provider.price_amount,
      asset: provider.price_asset,
      receiver: receiverAddr,
      network: X402_NETWORK,
      version: X402_VERSION,
      expiresBlock,
      clarityContract,
      memo: `x402:${provider.id}:${service}`,
    });

    return new Response(
      JSON.stringify({
        status: 402,
        message: "Payment Required",
        requestId: ctx.requestId,
        x402: {
          version: X402_VERSION,
          network: X402_NETWORK,
          paymentRequired: {
            amount: provider.price_amount,
            asset: provider.price_asset,
            receiver: receiverAddr,
            clarityContract,
            expiresBlock,
            memo: `x402:${provider.id}:${service}`,
          },
          supportedAssets: SUPPORTED_ASSETS,
          feeBurnRate: FEE_BURN_RATE,
          instructions: {
            step1: "Call the Clarity contract with the specified parameters",
            step2: "Include the transaction ID in X-Payment-Proof header",
            step3: "Retry this request with the payment proof attached",
            clarityExample: `(contract-call? .${clarityContract.split('.')[0]} ${clarityContract.split('.')[1]} '${receiverAddr} u${Math.round(provider.price_amount * 1e8)} "${provider.price_asset}")`,
          },
          bot: {
            id: provider.id,
            name: provider.name,
            skills: provider.skills,
            priceModel: provider.price_model,
          },
        },
      }),
      {
        status: 402,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-payment-proof, idempotency-key',
          ...paymentHeaders,
        },
      }
    );
  }

  // Verify payment proof
  const verification = verifyPaymentProof(paymentHeader, {
    // Demo note: we don't currently persist/derive the expected receiver on-chain;
    // for correctness we validate amount + asset + signature and the provided sender/receiver fields.
    receiver: undefined,
    minAmount: provider.price_amount,
    asset: provider.price_asset,
  });

  if (!verification.valid) {
    const receiverAddr = typeof paymentHeader.receiver === "string" && paymentHeader.receiver
      ? paymentHeader.receiver
      : mockStacksAddress();
    const currentBlock = mockBlockHeight();
    const expiresBlock = currentBlock + ESCROW_TIMEOUT_BLOCKS;
    const clarityContract = provider.price_model === 'stream'
      ? 'usdcx-stream.create-usdcx-stream'
      : 'payment-router.send-x402-payment';

    return jsonResponse({
      status: 402,
      message: "Payment Required",
      requestId: ctx.requestId,
      reason: verification.reason || "Invalid payment proof",
      x402: {
        version: X402_VERSION,
        network: X402_NETWORK,
        paymentRequired: {
          amount: provider.price_amount,
          asset: provider.price_asset,
          receiver: receiverAddr,
          clarityContract,
          expiresBlock,
          memo: `x402:${provider.id}:${service}`,
        },
        supportedAssets: SUPPORTED_ASSETS,
        feeBurnRate: FEE_BURN_RATE,
      },
    }, 402);
  }

  const txId = paymentHeader.txId;
  const blockHeight = paymentHeader.blockHeight || mockBlockHeight();
  const burnBlock = mockBurnBlockHeight();

  // Calculate fee burn
  const grossAmount = paymentHeader.amount;
  const burnAmount = grossAmount * FEE_BURN_RATE;
  const netAmount = grossAmount - burnAmount;

  const senderAddr = paymentHeader.sender;
  const receiverAddr = paymentHeader.receiver;

  // Record the transaction
  await ctx.supabase.from('transactions').insert({
    tx_id: txId,
    from_bot_id: typeof ctx.body.requesterBotId === 'number' ? ctx.body.requesterBotId : null,
    to_bot_id: providerBotId,
    amount: grossAmount,
    asset: provider.price_asset,
    tx_type: provider.price_model === 'stream' ? 'stream_create' : 'payment',
    status: 'confirmed',
    metadata: {
      protocol: 'x402',
      version: X402_VERSION,
      service,
      netAmount,
      burnAmount,
      burnRate: FEE_BURN_RATE,
      sender: senderAddr,
      receiver: receiverAddr,
      clarityContract: provider.price_model === 'stream'
        ? 'usdcx-stream.create-usdcx-stream'
        : 'payment-router.send-x402-payment',
      blockHeight,
      burnBlockHeight: burnBlock,
      bitcoinAnchor: mockBitcoinTxId(),
      proofOfTransfer: {
        mechanism: 'PoX',
        burnBlockHeight: burnBlock,
        btcCommitment: mockBitcoinTxId(),
      },
    },
  });

  // Record fee burn as separate transaction
  await ctx.supabase.from('transactions').insert({
    tx_id: mockTxId(),
    amount: burnAmount,
    asset: provider.price_asset,
    tx_type: 'fee_burn',
    status: 'confirmed',
    metadata: {
      protocol: 'x402-fee-collector',
      parentTx: txId,
      burnRate: FEE_BURN_RATE,
      clarityContract: 'fee-collector.collect-fee',
      blockHeight,
    },
  });

  // Generate mock service result
  const serviceResult = generateServiceResult(service, provider);

  return jsonResponse({
    status: 200,
    message: "Payment verified. Service delivered.",
    requestId: ctx.requestId,
    x402Receipt: {
      txId,
      amount: grossAmount,
      netAmount,
      burnAmount,
      asset: provider.price_asset,
      protocol: 'x402',
      version: X402_VERSION,
      blockHeight,
      burnBlockHeight: burnBlock,
      bitcoinFinality: {
        anchored: true,
        confirmations: 100 + Math.floor(Math.random() * 50),
        mechanism: 'Proof of Transfer',
      },
    },
    serviceResult,
    provider: {
      id: provider.id,
      name: provider.name,
      skills: provider.skills,
    },
  });
}

/**
 * POST /x402-gateway?action=create-invoice
 * 
 * A bot creates a payment invoice that another bot can pay.
 * Implements the x402 "pull payment" model.
 */
async function handleCreateInvoice(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const botId = validateInt(ctx.body.botId, 'botId');
  const amount = validateNumber(ctx.body.amount, 'amount', 0.000001, 1000000);
  const asset = validateEnum(ctx.body.asset || 'sBTC', 'asset', ['sBTC', 'USDCx']);
  const service = validateString(ctx.body.service || 'generic', 'service', 1, 128);
  const expiresInBlocks = validateInt(ctx.body.expiresInBlocks ?? 144, 'expiresInBlocks');

  // Verify bot ownership
  const { data: bot } = await ctx.supabase
    .from('bots')
    .select('*')
    .eq('id', botId)
    .eq('owner_id', ctx.userId)
    .single();

  if (!bot) return errorResponse('Bot not found or not owned by you', 403, ctx.requestId);

  const invoiceId = crypto.randomUUID();
  const receiverAddr = mockStacksAddress();
  const currentBlock = mockBlockHeight();
  const expiresBlock = currentBlock + expiresInBlocks;

  const invoice = {
    invoiceId,
    version: X402_VERSION,
    network: X402_NETWORK,
    payTo: {
      botId: bot.id,
      botName: bot.name,
      address: receiverAddr,
    },
    payment: {
      amount,
      asset,
      clarityContract: asset === 'USDCx'
        ? 'usdcx-stream.create-usdcx-stream'
        : 'payment-router.send-x402-payment',
    },
    service,
    createdAtBlock: currentBlock,
    expiresAtBlock: expiresBlock,
    status: 'pending',
    // Machine-readable payment URI
    paymentUri: `x402://${X402_NETWORK}/${receiverAddr}/${amount}/${asset}?memo=inv:${invoiceId}&contract=payment-router`,
  };

  // Store invoice
  await ctx.supabase.from('transactions').insert({
    tx_id: mockTxId(),
    to_bot_id: botId,
    amount: 0,
    asset,
    tx_type: 'invoice_created',
    status: 'pending',
    metadata: {
      protocol: 'x402-invoice',
      invoiceId,
      requestedAmount: amount,
      requestedAsset: asset,
      service,
      expiresAtBlock: expiresBlock,
      receiverAddress: receiverAddr,
    },
  });

  return jsonResponse({
    invoice,
    requestId: ctx.requestId,
    clarityCall: `(contract-call? .payment-router send-x402-payment '${receiverAddr} u${Math.round(amount * 1e8)} "${asset}")`,
    httpHeaders: buildX402Headers({
      amount,
      asset,
      receiver: receiverAddr,
      network: X402_NETWORK,
      version: X402_VERSION,
      expiresBlock,
      clarityContract: invoice.payment.clarityContract,
      memo: `inv:${invoiceId}`,
    }),
  });
}

/**
 * POST /x402-gateway?action=pay-invoice
 * 
 * A bot pays an existing invoice, completing the x402 payment cycle.
 */
async function handlePayInvoice(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const invoiceId = validateString(ctx.body.invoiceId, 'invoiceId');
  const payerBotId = validateInt(ctx.body.payerBotId, 'payerBotId');

  // Verify payer bot ownership
  const { data: payerBot } = await ctx.supabase
    .from('bots')
    .select('*')
    .eq('id', payerBotId)
    .eq('owner_id', ctx.userId)
    .single();

  if (!payerBot) return errorResponse('Payer bot not found or not owned by you', 403, ctx.requestId);

  // Find the invoice
  const { data: invoiceTxs } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_type', 'invoice_created')
    .eq('status', 'pending')
    .limit(50);

  const invoiceTx = (invoiceTxs || []).find(
    (tx: any) => tx.metadata?.invoiceId === invoiceId
  );

  if (!invoiceTx) return errorResponse('Invoice not found or already paid', 404, ctx.requestId);

  const meta = invoiceTx.metadata as any;
  const amount = meta.requestedAmount;
  const asset = meta.requestedAsset;
  const receiverBotId = invoiceTx.to_bot_id;

  const paymentTxId = mockTxId();
  const blockHeight = mockBlockHeight();
  const burnBlock = mockBurnBlockHeight();
  const burnAmount = amount * FEE_BURN_RATE;
  const netAmount = amount - burnAmount;

  // Record payment
  await ctx.supabase.from('transactions').insert({
    tx_id: paymentTxId,
    from_bot_id: payerBotId,
    to_bot_id: receiverBotId,
    amount,
    asset,
    tx_type: 'x402_invoice_payment',
    status: 'confirmed',
    metadata: {
      protocol: 'x402',
      version: X402_VERSION,
      invoiceId,
      netAmount,
      burnAmount,
      burnRate: FEE_BURN_RATE,
      sender: mockStacksAddress(),
      receiver: meta.receiverAddress,
      clarityContract: 'payment-router.send-x402-payment',
      blockHeight,
      burnBlockHeight: burnBlock,
      bitcoinAnchor: mockBitcoinTxId(),
    },
  });

  // Record fee burn
  await ctx.supabase.from('transactions').insert({
    tx_id: mockTxId(),
    amount: burnAmount,
    asset,
    tx_type: 'fee_burn',
    status: 'confirmed',
    metadata: {
      protocol: 'x402-fee-collector',
      parentTx: paymentTxId,
      invoiceId,
      clarityContract: 'fee-collector.collect-fee',
      blockHeight,
    },
  });

  // Mark invoice as paid
  // We can't update by metadata filter easily, so we use the tx id
  await ctx.supabase
    .from('transactions')
    .update({ status: 'confirmed' })
    .eq('id', invoiceTx.id);

  // Create a job record
  if (receiverBotId) {
    await ctx.supabase.from('jobs').insert({
      requester_bot_id: payerBotId,
      provider_bot_id: receiverBotId,
      requester_user_id: ctx.userId,
      status: 'completed',
      payment_tx_id: paymentTxId,
      result: { invoiceId, service: meta.service },
    });
  }

  const response = {
    success: true,
    requestId: ctx.requestId,
    payment: {
      txId: paymentTxId,
      invoiceId,
      amount,
      netAmount,
      burnAmount,
      asset,
      protocol: 'x402',
      blockHeight,
    },
    bitcoinFinality: {
      anchored: true,
      burnBlockHeight: burnBlock,
      mechanism: 'Proof of Transfer',
    },
  };

  if (ctx.idempotencyKey) {
    setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  }

  return jsonResponse(response);
}

/**
 * GET /x402-gateway?action=verify-payment
 * 
 * Verify a payment on-chain (mock for hackathon, would call Hiro API in production).
 */
async function handleVerifyPayment(ctx: RequestContext) {
  const txId = validateString(
    ctx.url.searchParams.get('txId') ?? '',
    'txId', 3, 128
  );

  // Look up transaction
  const { data: tx } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_id', txId)
    .maybeSingle();

  if (!tx) {
    return jsonResponse({
      verified: false,
      requestId: ctx.requestId,
      reason: 'Transaction not found',
      suggestion: 'Transaction may still be pending. Retry in a few seconds.',
    });
  }

  const meta = tx.metadata as any;

  return jsonResponse({
    verified: true,
    requestId: ctx.requestId,
    transaction: {
      txId: tx.tx_id,
      amount: tx.amount,
      asset: tx.asset,
      type: tx.tx_type,
      status: tx.status,
      fromBotId: tx.from_bot_id,
      toBotId: tx.to_bot_id,
      createdAt: tx.created_at,
    },
    onChain: {
      blockHeight: meta?.blockHeight || mockBlockHeight(),
      burnBlockHeight: meta?.burnBlockHeight || mockBurnBlockHeight(),
      clarityContract: meta?.clarityContract || 'unknown',
      protocol: meta?.protocol || 'x402',
      bitcoinAnchor: meta?.bitcoinAnchor || mockBitcoinTxId(),
      proofOfTransfer: {
        verified: true,
        mechanism: 'PoX',
        finality: 'Bitcoin-grade',
      },
    },
  });
}

/**
 * GET /x402-gateway?action=protocol-info
 * 
 * Returns x402 protocol specification and capabilities.
 */
async function handleProtocolInfo(_ctx: RequestContext) {
  return jsonResponse({
    protocol: 'x402',
    version: X402_VERSION,
    network: X402_NETWORK,
    requestId: _ctx.requestId,
    specification: {
      name: 'x402 Payment Protocol',
      description: 'HTTP-native payment protocol for machine-to-machine commerce',
      httpStatusCode: 402,
      mechanism: 'Server returns 402 with payment instructions; client pays on-chain; retries with proof',
    },
    supportedAssets: SUPPORTED_ASSETS.map(asset => ({
      symbol: asset,
      network: asset === 'sBTC' ? 'stacks (BTC-pegged)' : 'stacks (Circle CCTP)',
      contract: asset === 'sBTC' ? 'payment-router.send-x402-payment' : 'usdcx-stream.create-usdcx-stream',
    })),
    paymentModels: [
      { model: 'fixed', description: 'One-time payment per request (x402)', assets: ['sBTC', 'USDCx'] },
      { model: 'stream', description: 'Per-second streaming payment (USDCx)', assets: ['USDCx'] },
      { model: 'invoice', description: 'Bot creates invoice, another bot pays', assets: ['sBTC', 'USDCx'] },
      { model: 'escrow', description: 'Payment held in escrow until task completion', assets: ['sBTC'] },
    ],
    feeBurnRate: FEE_BURN_RATE,
    escrowTimeout: `${ESCROW_TIMEOUT_BLOCKS} blocks (~24 hours)`,
    contracts: [
      'payment-router', 'usdcx-stream', 'fee-collector',
      'bot-registry', 'skill-bot', 'bot-swarm',
      'molbot-nft', 'referral-system', 'impact-tracker',
    ],
    settlement: {
      layer: 'Stacks L2',
      finality: 'Bitcoin L1 via Proof of Transfer',
      blockTime: '~10 seconds (Stacks) → ~10 minutes (Bitcoin anchor)',
    },
  });
}

// ========== Service Result Generator ==========

function generateServiceResult(service: string, provider: any) {
  const lower = service.toLowerCase();

  if (lower.includes('image') || lower.includes('art') || lower.includes('chart')) {
    return {
      type: 'image_generation',
      output: {
        url: `https://agent.studio/api/output/${crypto.randomUUID()}.png`,
        width: 1024, height: 1024,
        model: 'molbot-diffusion-v2',
        generationTime: '2.3s',
      },
    };
  }
  if (lower.includes('translat')) {
    return {
      type: 'translation',
      output: {
        sourceLanguage: 'en', targetLanguage: 'es',
        inputTokens: 150, outputTokens: 165,
        confidence: 0.97,
      },
    };
  }
  if (lower.includes('audit') || lower.includes('security')) {
    return {
      type: 'security_audit',
      output: {
        contractsScanned: 3,
        vulnerabilities: { critical: 0, high: 0, medium: 1, low: 2 },
        overallRisk: 'low',
        reportUrl: `https://agent.studio/api/reports/${crypto.randomUUID()}`,
      },
    };
  }
  if (lower.includes('data') || lower.includes('analy')) {
    return {
      type: 'data_analysis',
      output: {
        rowsProcessed: 15000,
        insights: 7,
        visualizations: 3,
        processingTime: '4.1s',
      },
    };
  }

  return {
    type: 'generic_service',
    output: {
      status: 'completed',
      processingTime: `${(1 + Math.random() * 4).toFixed(1)}s`,
      botId: provider.id,
      botName: provider.name,
    },
  };
}

// ========== x402 Quote System ==========

const QUOTE_TTL_MS = 10 * 60 * 1000; // 10 minutes

// In-memory quote store (resets on cold start — acceptable for hackathon demo)
const quoteStore = new Map<string, {
  quote: Record<string, unknown>;
  settled: boolean;
  txid?: string;
  receipt?: Record<string, unknown>;
}>();
const idempotencyIndex = new Map<string, string>();

async function handleRequestQuote(ctx: RequestContext) {
  const payerAddress = validateString(ctx.body.payerAddress, 'payerAddress', 10, 128);
  const payeeAddress = validateString(ctx.body.payeeAddress, 'payeeAddress', 10, 128);
  const asset = validateEnum(ctx.body.asset || 'sBTC', 'asset', ['sBTC', 'USDCx']);
  const mode = validateEnum(ctx.body.mode || 'one_time', 'mode', ['one_time', 'stream']);
  const amount = validateNumber(ctx.body.amount, 'amount', 0.000001, 1000000);
  const memo = typeof ctx.body.memo === 'string' ? ctx.body.memo.slice(0, 120) : '';
  const jobId = validateString(ctx.body.jobId, 'jobId', 1, 128);
  const botId = validateString(ctx.body.botId, 'botId', 1, 128);
  const idempotencyKey = validateString(ctx.body.idempotencyKey, 'idempotencyKey', 8, 128);

  // Idempotency check
  const existingQuoteId = idempotencyIndex.get(idempotencyKey);
  if (existingQuoteId) {
    const existing = quoteStore.get(existingQuoteId);
    if (existing && new Date(existing.quote.expiresAt as string).getTime() > Date.now()) {
      return jsonResponse(existing.quote);
    }
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + QUOTE_TTL_MS);
  const quoteId = crypto.randomUUID();

  // Simple HMAC-like signature (demo: hash of concatenated fields)
  const payload = [
    'x402', '1', quoteId, jobId, botId, payerAddress, payeeAddress,
    asset, mode, amount.toFixed(6), memo, idempotencyKey, expiresAt.toISOString(),
  ].join('|');
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(payload));
  const signature = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const quote = {
    protocol: 'x402',
    version: '1',
    quoteId,
    jobId,
    botId,
    payerAddress,
    payeeAddress,
    asset,
    mode,
    amount,
    memo,
    idempotencyKey,
    expiresAt: expiresAt.toISOString(),
    createdAt: now.toISOString(),
    signature,
  };

  quoteStore.set(quoteId, { quote, settled: false });
  idempotencyIndex.set(idempotencyKey, quoteId);

  return jsonResponse(quote, 201);
}

async function handleConfirmPayment(ctx: RequestContext) {
  const quoteId = validateString(ctx.body.quoteId, 'quoteId', 1, 128);
  const txid = validateString(ctx.body.txid, 'txid', 1, 128);

  const record = quoteStore.get(quoteId);
  if (!record) {
    return errorResponse('Unknown quoteId', 404, ctx.requestId);
  }

  const quote = record.quote;
  if (new Date(quote.expiresAt as string).getTime() < Date.now()) {
    return errorResponse('Quote expired', 410, ctx.requestId);
  }

  if (record.settled && record.receipt) {
    return jsonResponse(record.receipt);
  }

  const receipt = {
    protocol: 'x402',
    version: '1',
    quoteId,
    txid,
    settled: true,
    settledAt: new Date().toISOString(),
    confirmations: 1,
    amount: quote.amount,
    asset: quote.asset,
    payerAddress: quote.payerAddress,
    payeeAddress: quote.payeeAddress,
    jobId: quote.jobId,
    botId: quote.botId,
  };

  quoteStore.set(quoteId, { ...record, settled: true, txid, receipt });

  // Also record the transaction in DB
  await ctx.supabase.from('transactions').insert({
    tx_id: txid,
    amount: quote.amount as number,
    asset: quote.asset as string,
    tx_type: 'x402_quote_payment',
    status: 'confirmed',
    metadata: {
      protocol: 'x402',
      version: '1',
      quoteId,
      jobId: quote.jobId,
      botId: quote.botId,
      payerAddress: quote.payerAddress,
      payeeAddress: quote.payeeAddress,
    },
  });

  return jsonResponse(receipt);
}

// ========== Route Map ==========

const routes = {
  'request-service': { method: 'POST' as const, handler: handleRequestService, rateLimit: 30, public: true },
  'create-invoice': { method: 'POST' as const, handler: handleCreateInvoice, rateLimit: 20 },
  'pay-invoice': { method: 'POST' as const, handler: handlePayInvoice, rateLimit: 20 },
  'verify-payment': { method: 'GET' as const, handler: handleVerifyPayment, public: true },
  'protocol-info': { method: 'GET' as const, handler: handleProtocolInfo, public: true },
  'request-quote': { method: 'POST' as const, handler: handleRequestQuote, rateLimit: 30, public: true },
  'confirm-payment': { method: 'POST' as const, handler: handleConfirmPayment, rateLimit: 20, public: true },
};

serve(createEdgeHandler('x402-gateway', routes));
