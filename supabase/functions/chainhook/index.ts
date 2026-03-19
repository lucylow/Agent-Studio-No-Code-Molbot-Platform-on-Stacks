// Chainhook Webhook Handler — Processes real-time blockchain events from Stacks
// Receives events from Hiro Chainhook and updates the application state.
// In production: registered at https://api.hiro.so/chainhook
// For hackathon: can be triggered manually or by the simulator.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, errorResponse,
  validateString,
  mockTxId, mockBlockHeight, mockBurnBlockHeight,
  type RequestContext,
} from "../_shared/utils.ts";

// ========== Chainhook Event Types ==========

interface ChainhookPayload {
  apply: ChainhookBlock[];
  rollback?: ChainhookBlock[];
  chainhook: {
    uuid: string;
    predicate: {
      scope: string;
      contract_identifier?: string;
      method?: string;
    };
  };
}

interface ChainhookBlock {
  block_identifier: { index: number; hash: string };
  timestamp: number;
  transactions: ChainhookTransaction[];
}

interface ChainhookTransaction {
  transaction_identifier: { hash: string };
  operations: any[];
  metadata: {
    success: boolean;
    description: string;
    sender: string;
    fee: number;
    kind: { type: string; data?: any };
    receipt: {
      events: ChainhookEvent[];
    };
  };
}

interface ChainhookEvent {
  type: string;
  data: Record<string, any>;
}

// ========== Predicate Configurations ==========

const MONITORED_CONTRACTS = [
  { name: 'payment-router', events: ['x402-payment', 'escrow-lock', 'escrow-release'] },
  { name: 'bot-registry', events: ['bot-registered', 'bot-updated', 'bot-deactivated'] },
  { name: 'bot-swarm', events: ['swarm-created', 'bot-joined', 'swarm-activated', 'swarm-hired'] },
  { name: 'usdcx-stream', events: ['stream-created', 'stream-withdrawn', 'stream-cancelled'] },
  { name: 'fee-collector', events: ['fee-collected', 'fee-burned'] },
  { name: 'molbot-nft', events: ['nft-minted', 'nft-transferred', 'nft-burned'] },
  { name: 'skill-bot', events: ['skill-request', 'skill-response'] },
  { name: 'referral-system', events: ['referral-created', 'referral-reward'] },
  { name: 'impact-tracker', events: ['impact-recorded', 'milestone-reached'] },
];

// ========== Handlers ==========

/**
 * POST /chainhook?action=webhook
 * 
 * Receives Chainhook webhook payloads and processes blockchain events.
 * Public endpoint (webhooks don't have user auth).
 */
async function handleWebhook(ctx: RequestContext) {
  const payload = ctx.body as unknown as ChainhookPayload;

  if (!payload.apply || !Array.isArray(payload.apply)) {
    return errorResponse('Invalid Chainhook payload: missing apply array', 400, ctx.requestId);
  }

  let processedEvents = 0;
  const results: any[] = [];

  for (const block of payload.apply) {
    const blockHeight = block.block_identifier?.index || mockBlockHeight();
    const blockHash = block.block_identifier?.hash || mockTxId();

    for (const tx of block.transactions || []) {
      if (!tx.metadata?.success) continue;

      const txId = tx.transaction_identifier?.hash || mockTxId();

      for (const event of tx.metadata?.receipt?.events || []) {
        const processed = await processEvent(ctx, event, txId, blockHeight, blockHash);
        if (processed) {
          results.push(processed);
          processedEvents++;
        }
      }
    }
  }

  // Process rollbacks
  if (payload.rollback && Array.isArray(payload.rollback)) {
    for (const block of payload.rollback) {
      for (const tx of block.transactions || []) {
        const txId = tx.transaction_identifier?.hash;
        if (txId) {
          await ctx.supabase
            .from('transactions')
            .update({ status: 'rolled_back' })
            .eq('tx_id', txId);
        }
      }
    }
  }

  return jsonResponse({
    success: true,
    requestId: ctx.requestId,
    processed: processedEvents,
    results,
    chainhookUuid: payload.chainhook?.uuid,
  });
}

async function processEvent(
  ctx: RequestContext,
  event: ChainhookEvent,
  txId: string,
  blockHeight: number,
  blockHash: string
): Promise<any | null> {
  const eventType = event.type;
  const eventData = event.data || {};

  // Map Chainhook event types to our internal types
  if (eventType === 'print_event' || eventType === 'contract_event') {
    const topic = eventData.topic || eventData.type || 'unknown';

    // Record the event
    await ctx.supabase.from('transactions').insert({
      tx_id: txId,
      amount: eventData.amount ? parseFloat(eventData.amount) / 1e8 : 0,
      asset: eventData.asset || 'sBTC',
      tx_type: `chainhook_${topic}`,
      status: 'confirmed',
      from_bot_id: eventData.fromBotId || null,
      to_bot_id: eventData.toBotId || null,
      metadata: {
        protocol: 'chainhook',
        source: 'blockchain',
        eventType,
        topic,
        blockHeight,
        blockHash,
        rawData: eventData,
        processedAt: new Date().toISOString(),
      },
    });

    return { txId, topic, blockHeight, eventType };
  }

  // Handle STX transfer events
  if (eventType === 'stx_transfer_event') {
    await ctx.supabase.from('transactions').insert({
      tx_id: txId,
      amount: (eventData.amount || 0) / 1e6,
      asset: 'STX',
      tx_type: 'chainhook_stx_transfer',
      status: 'confirmed',
      metadata: {
        protocol: 'chainhook',
        source: 'blockchain',
        sender: eventData.sender,
        recipient: eventData.recipient,
        blockHeight,
        blockHash,
      },
    });

    return { txId, topic: 'stx_transfer', blockHeight };
  }

  return null;
}

/**
 * POST /chainhook?action=simulate-event
 * 
 * Simulate a Chainhook event for testing (authenticated).
 */
async function handleSimulateEvent(ctx: RequestContext) {
  if (!ctx.userId) throw new Error('Authentication required');

  const eventType = validateString(ctx.body.eventType || 'x402-payment', 'eventType');
  const blockHeight = mockBlockHeight();
  const burnBlock = mockBurnBlockHeight();

  const simulatedEvents: Record<string, any> = {
    'x402-payment': {
      type: 'print_event',
      data: {
        topic: 'x402-payment',
        amount: String(Math.floor(Math.random() * 10000)),
        asset: 'sBTC',
        fromBotId: 1 + Math.floor(Math.random() * 10),
        toBotId: 1 + Math.floor(Math.random() * 10),
        protocol: 'x402',
        version: '1.0.0',
      },
    },
    'stream-created': {
      type: 'print_event',
      data: {
        topic: 'stream-created',
        streamId: Math.floor(Math.random() * 100000),
        ratePerSecond: '100000',
        asset: 'USDCx',
        toBotId: 1 + Math.floor(Math.random() * 10),
      },
    },
    'bot-registered': {
      type: 'print_event',
      data: {
        topic: 'bot-registered',
        botId: 1 + Math.floor(Math.random() * 100),
        name: `Bot-${Math.random().toString(36).slice(2, 6)}`,
        skills: ['analysis', 'generation'],
      },
    },
    'swarm-created': {
      type: 'print_event',
      data: {
        topic: 'swarm-created',
        swarmId: 1 + Math.floor(Math.random() * 50),
        creator: ctx.userId,
        minBond: '1000',
      },
    },
    'fee-burned': {
      type: 'print_event',
      data: {
        topic: 'fee-burned',
        amount: String(Math.floor(Math.random() * 500)),
        asset: 'sBTC',
        burnRate: '200', // basis points
      },
    },
    'nft-minted': {
      type: 'print_event',
      data: {
        topic: 'nft-minted',
        tokenId: 1 + Math.floor(Math.random() * 1000),
        owner: ctx.userId,
        sip: 'SIP-009',
      },
    },
  };

  const event = simulatedEvents[eventType] || simulatedEvents['x402-payment'];
  const txId = mockTxId();

  // Process the simulated event
  const payload: ChainhookPayload = {
    apply: [{
      block_identifier: { index: blockHeight, hash: mockTxId() },
      timestamp: Math.floor(Date.now() / 1000),
      transactions: [{
        transaction_identifier: { hash: txId },
        operations: [],
        metadata: {
          success: true,
          description: `Simulated ${eventType}`,
          sender: 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM',
          fee: 2000,
          kind: { type: 'contract_call' },
          receipt: { events: [event] },
        },
      }],
    }],
    chainhook: {
      uuid: `sim-${crypto.randomUUID().slice(0, 8)}`,
      predicate: { scope: 'contract_call' },
    },
  };

  // Process via the webhook handler logic
  const processed = await processEvent(ctx, event, txId, blockHeight, mockTxId());

  return jsonResponse({
    success: true,
    requestId: ctx.requestId,
    simulated: {
      eventType,
      txId,
      blockHeight,
      burnBlockHeight: burnBlock,
    },
    processed,
    payload: payload.apply[0],
  });
}

function requireAuth(ctx: RequestContext): asserts ctx is RequestContext & { userId: string } {
  if (!ctx.userId) throw new Error('Authentication required');
}

/**
 * GET /chainhook?action=predicates
 * 
 * Returns the Chainhook predicate configurations for all monitored contracts.
 */
async function handlePredicates(_ctx: RequestContext) {
  return jsonResponse({
    requestId: _ctx.requestId,
    predicates: MONITORED_CONTRACTS.map(contract => ({
      name: `${contract.name}-monitor`,
      chain: 'stacks',
      version: 1,
      networks: {
        mainnet: {
          if_this: {
            scope: 'contract_call',
            contract_identifier: `ST1PQ...${contract.name}`,
            method: '*',
          },
          then_that: {
            http_post: {
              url: 'https://api.agentstudio.io/functions/v1/chainhook?action=webhook',
              authorization_header: 'Bearer <CHAINHOOK_SECRET>',
            },
          },
        },
      },
      monitoredEvents: contract.events,
    })),
    registrationEndpoint: 'https://api.hiro.so/v1/chainhooks',
    documentation: 'https://docs.hiro.so/stacks/chainhook',
  });
}

/**
 * GET /chainhook?action=recent-events
 * 
 * Returns recent blockchain events processed by the webhook.
 */
async function handleRecentEvents(ctx: RequestContext) {
  const { data, error } = await ctx.supabase
    .from('transactions')
    .select('*')
    .like('tx_type', 'chainhook_%')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) throw error;

  const events = (data || []).map((tx: any) => ({
    txId: tx.tx_id,
    eventType: tx.tx_type.replace('chainhook_', ''),
    amount: tx.amount,
    asset: tx.asset,
    blockHeight: tx.metadata?.blockHeight,
    topic: tx.metadata?.topic,
    timestamp: tx.created_at,
    fromBotId: tx.from_bot_id,
    toBotId: tx.to_bot_id,
  }));

  return jsonResponse({ events, requestId: ctx.requestId });
}

// ========== Route Map ==========

const routes = {
  'webhook': { method: 'POST' as const, handler: handleWebhook, public: true, rateLimit: 100 },
  'simulate-event': { method: 'POST' as const, handler: handleSimulateEvent, rateLimit: 10 },
  'predicates': { method: 'GET' as const, handler: handlePredicates, public: true },
  'recent-events': { method: 'GET' as const, handler: handleRecentEvents, public: true },
};

serve(createEdgeHandler('chainhook', routes));
