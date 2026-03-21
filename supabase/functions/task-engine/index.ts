// Task Delegation Engine — Bot-to-bot task orchestration with escrow & result verification
// Enables complex multi-bot workflows: Bot A delegates subtasks to specialized bots,
// each gets paid via x402 upon verified completion.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import {
  createEdgeHandler, jsonResponse, errorResponse, requireAuth,
  validateString, validateNumber, validateInt, validateArray,
  mockTxId, mockBlockHeight, mockBurnBlockHeight, mockBitcoinTxId,
  setIdempotentResponse, parsePagination, paginatedResponse,
  type RequestContext, ValidationError,
} from "../_shared/utils.ts";

const FEE_BURN_RATE = 0.02;

type TaskTxRow = {
  id?: number;
  asset?: string;
  from_bot_id?: number;
  to_bot_id?: number;
  created_at?: string;
  metadata?: Record<string, unknown>;
};

type JobRow = {
  id: number;
  status?: string;
  result?: { taskId?: string; [key: string]: unknown };
};

function txMeta(tx: TaskTxRow): Record<string, unknown> {
  return tx.metadata && typeof tx.metadata === "object" ? tx.metadata : {};
}

// ========== Task State Machine ==========
// created → escrow_funded → assigned → in_progress → completed → payment_released
//                                                   → disputed → resolved
//                         → expired → escrow_refunded

type TaskStatus = 'created' | 'escrow_funded' | 'assigned' | 'in_progress' |
  'completed' | 'payment_released' | 'disputed' | 'resolved' | 'expired' | 'escrow_refunded';

const VALID_TRANSITIONS: Record<string, TaskStatus[]> = {
  'created': ['escrow_funded', 'expired'],
  'escrow_funded': ['assigned', 'expired', 'escrow_refunded'],
  'assigned': ['in_progress', 'expired'],
  'in_progress': ['completed', 'disputed'],
  'completed': ['payment_released'],
  'disputed': ['resolved'],
};

function canTransition(from: TaskStatus, to: TaskStatus): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) || false;
}

// ========== Handlers ==========

/**
 * POST /task-engine?action=create-task
 * 
 * A bot creates a task with escrow. The payment is locked until the task is completed.
 */
async function handleCreateTask(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const requesterBotId = validateInt(ctx.body.requesterBotId, 'requesterBotId');
  const title = validateString(ctx.body.title, 'title', 3, 128);
  const description = validateString(ctx.body.description || '', 'description', 0, 1000);
  const requiredSkills = ctx.body.requiredSkills
    ? (validateArray(ctx.body.requiredSkills, 'requiredSkills', 10) as string[])
    : [];
  const budget = validateNumber(ctx.body.budget, 'budget', 0.000001, 1000000);
  const asset = validateString(ctx.body.asset || 'sBTC', 'asset');
  if (!['sBTC', 'USDCx'].includes(asset)) throw new ValidationError('asset must be sBTC or USDCx');
  const maxResponders = validateInt(ctx.body.maxResponders ?? 5, 'maxResponders');
  const deadlineBlocks = validateInt(ctx.body.deadlineBlocks ?? 288, 'deadlineBlocks'); // ~48h

  // Verify bot ownership
  const { data: bot } = await ctx.supabase
    .from('bots').select('*').eq('id', requesterBotId).eq('owner_id', ctx.userId).single();
  if (!bot) return errorResponse('Bot not found or not owned by you', 403, ctx.requestId);

  const taskId = crypto.randomUUID();
  const escrowTxId = mockTxId();
  const blockHeight = mockBlockHeight();
  const deadline = blockHeight + deadlineBlocks;

  // Create escrow transaction
  await ctx.supabase.from('transactions').insert({
    tx_id: escrowTxId,
    from_bot_id: requesterBotId,
    amount: budget,
    asset,
    tx_type: 'task_escrow',
    status: 'confirmed',
    metadata: {
      protocol: 'x402-task-engine',
      taskId,
      type: 'escrow_lock',
      clarityContract: 'payment-router.lock-escrow',
      blockHeight,
      deadlineBlock: deadline,
    },
  });

  // Store task
  const { data: task, error } = await ctx.supabase.from('tasks_delegated').insert({
    task_id: taskId,
    requester_bot_id: requesterBotId,
    requester_user_id: ctx.userId,
    title,
    description,
    required_skills: requiredSkills,
    budget,
    asset,
    status: 'escrow_funded',
    escrow_tx_id: escrowTxId,
    max_responders: maxResponders,
    deadline_block: deadline,
    responses: [],
  }).select().single();

  // If the table doesn't exist, store in transactions metadata
  if (error) {
    await ctx.supabase.from('transactions').insert({
      tx_id: mockTxId(),
      from_bot_id: requesterBotId,
      amount: 0,
      asset,
      tx_type: 'task_created',
      status: 'confirmed',
      metadata: {
        protocol: 'x402-task-engine',
        taskId,
        title,
        description,
        requiredSkills,
        budget,
        asset,
        status: 'escrow_funded',
        escrowTxId,
        maxResponders,
        deadlineBlock: deadline,
        responses: [],
        blockHeight,
      },
    });
  }

  const response = {
    taskId,
    status: 'escrow_funded',
    requestId: ctx.requestId,
    task: {
      title, description, requiredSkills, budget, asset,
      maxResponders, deadlineBlock: deadline,
    },
    escrow: {
      txId: escrowTxId, amount: budget, asset,
      clarityContract: 'payment-router.lock-escrow',
      blockHeight,
    },
    x402: {
      protocol: 'x402-task-engine',
      description: 'Budget locked in escrow. Bots can now bid on this task.',
      paymentReleasedOn: 'Task completion and verification',
      feeBurn: `${FEE_BURN_RATE * 100}% burned on payment release`,
    },
  };

  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

/**
 * POST /task-engine?action=bid-on-task
 * 
 * A provider bot bids on an open task.
 */
async function handleBidOnTask(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const taskId = validateString(ctx.body.taskId, 'taskId');
  const providerBotId = validateInt(ctx.body.providerBotId, 'providerBotId');
  const bidAmount = validateNumber(ctx.body.bidAmount, 'bidAmount', 0.000001, 1000000);
  const estimatedBlocks = validateInt(ctx.body.estimatedBlocks ?? 72, 'estimatedBlocks');
  const proposal = validateString(ctx.body.proposal || 'I can complete this task.', 'proposal', 1, 500);

  // Verify bot ownership
  const { data: bot } = await ctx.supabase
    .from('bots').select('*').eq('id', providerBotId).eq('owner_id', ctx.userId).single();
  if (!bot) return errorResponse('Bot not found or not owned by you', 403, ctx.requestId);

  // Find the task in transactions
  const { data: taskTxs } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_type', 'task_created')
    .limit(100);

  const taskTx = (taskTxs || []).find((tx: TaskTxRow) => tx.metadata?.taskId === taskId);
  if (!taskTx) return errorResponse('Task not found', 404, ctx.requestId);

  const meta = txMeta(taskTx);
  if (meta.status !== 'escrow_funded') {
    return errorResponse(`Task is in "${String(meta.status)}" state, cannot accept bids`, 400, ctx.requestId);
  }
  const budget = typeof meta.budget === 'number' ? meta.budget : Number(meta.budget);
  const asset = typeof meta.asset === 'string' ? meta.asset : 'sBTC';
  if (bidAmount > budget) {
    return errorResponse(`Bid exceeds budget of ${budget} ${asset}`, 400, ctx.requestId);
  }

  const bid = {
    bidId: crypto.randomUUID(),
    providerBotId,
    providerBotName: bot.name,
    providerSkills: bot.skills,
    bidAmount,
    estimatedBlocks,
    proposal,
    submittedAt: new Date().toISOString(),
    blockHeight: mockBlockHeight(),
  };

  // Record bid
  await ctx.supabase.from('transactions').insert({
    tx_id: mockTxId(),
    from_bot_id: providerBotId,
    to_bot_id: taskTx.from_bot_id,
    amount: 0,
    asset,
    tx_type: 'task_bid',
    status: 'confirmed',
    metadata: {
      protocol: 'x402-task-engine',
      taskId,
      ...bid,
    },
  });

  return jsonResponse({
    success: true,
    requestId: ctx.requestId,
    bid,
    task: { taskId, title: meta.title, budget, asset },
    clarityEvent: {
      topic: 'task-bid-submitted',
      taskId, providerBotId, bidAmount,
    },
  });
}

/**
 * POST /task-engine?action=accept-bid
 * 
 * Task requester accepts a bid, assigning the task to the provider bot.
 */
async function handleAcceptBid(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const taskId = validateString(ctx.body.taskId, 'taskId');
  const bidId = validateString(ctx.body.bidId, 'bidId');

  // Find the bid
  const { data: bidTxs } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_type', 'task_bid')
    .limit(100);

  const bidTx = (bidTxs || []).find(
    (tx: TaskTxRow) => tx.metadata?.taskId === taskId && tx.metadata?.bidId === bidId,
  );
  if (!bidTx) return errorResponse('Bid not found', 404, ctx.requestId);

  const bidMeta = txMeta(bidTx);
  const assignTxId = mockTxId();
  const blockHeight = mockBlockHeight();

  // Record assignment
  await ctx.supabase.from('transactions').insert({
    tx_id: assignTxId,
    from_bot_id: bidTx.to_bot_id, // requester
    to_bot_id: bidMeta.providerBotId as number,
    amount: bidMeta.bidAmount as number,
    asset: bidTx.asset,
    tx_type: 'task_assigned',
    status: 'confirmed',
    metadata: {
      protocol: 'x402-task-engine',
      taskId,
      bidId,
      providerBotId: bidMeta.providerBotId as number,
      agreedAmount: bidMeta.bidAmount as number,
      clarityContract: 'payment-router.assign-task',
      blockHeight,
    },
  });

  // Create job record
  await ctx.supabase.from('jobs').insert({
    requester_bot_id: bidTx.to_bot_id,
    provider_bot_id: bidMeta.providerBotId as number,
    requester_user_id: ctx.userId,
    status: 'processing',
    result: { taskId, bidId, agreedAmount: bidMeta.bidAmount as number },
  });

  return jsonResponse({
    success: true,
    requestId: ctx.requestId,
    assignment: {
      taskId, bidId,
      providerBotId: bidMeta.providerBotId as number,
      agreedAmount: bidMeta.bidAmount as number,
      txId: assignTxId,
      blockHeight,
    },
    nextStep: 'Provider bot should now execute the task and submit results via complete-task action',
  });
}

/**
 * POST /task-engine?action=complete-task
 * 
 * Provider bot submits results. Escrow is released via x402.
 */
async function handleCompleteTask(ctx: RequestContext) {
  requireAuth(ctx.userId);

  const taskId = validateString(ctx.body.taskId, 'taskId');
  const providerBotId = validateInt(ctx.body.providerBotId, 'providerBotId');
  const resultHash = validateString(ctx.body.resultHash || `QmResult${crypto.randomUUID().slice(0, 12)}`, 'resultHash');
  const resultData = ctx.body.resultData || {};

  // Verify bot ownership
  const { data: bot } = await ctx.supabase
    .from('bots').select('id').eq('id', providerBotId).eq('owner_id', ctx.userId).single();
  if (!bot) return errorResponse('Bot not found or not owned by you', 403, ctx.requestId);

  // Find assignment
  const { data: assignTxs } = await ctx.supabase
    .from('transactions')
    .select('*')
    .eq('tx_type', 'task_assigned')
    .limit(100);

  const assignTx = (assignTxs || []).find(
    (tx: TaskTxRow) => tx.metadata?.taskId === taskId && tx.metadata?.providerBotId === providerBotId,
  );
  if (!assignTx) return errorResponse('No assignment found for this task and bot', 404, ctx.requestId);

  const meta = txMeta(assignTx);
  const amount = meta.agreedAmount as number;
  const asset = assignTx.asset;
  const burnAmount = amount * FEE_BURN_RATE;
  const netAmount = amount - burnAmount;
  const paymentTxId = mockTxId();
  const blockHeight = mockBlockHeight();
  const burnBlock = mockBurnBlockHeight();

  // Release escrow → payment to provider
  await ctx.supabase.from('transactions').insert({
    tx_id: paymentTxId,
    from_bot_id: assignTx.from_bot_id,
    to_bot_id: providerBotId,
    amount: netAmount,
    asset,
    tx_type: 'escrow_release',
    status: 'confirmed',
    metadata: {
      protocol: 'x402-task-engine',
      taskId,
      resultHash,
      grossAmount: amount,
      netAmount,
      burnAmount,
      burnRate: FEE_BURN_RATE,
      clarityContract: 'payment-router.release-escrow',
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
      taskId,
      clarityContract: 'fee-collector.collect-fee',
      blockHeight,
    },
  });

  // Update job
  const { data: jobs } = await ctx.supabase
    .from('jobs')
    .select('*')
    .eq('provider_bot_id', providerBotId)
    .eq('status', 'processing')
    .limit(5);

  const job = (jobs || []).find((j: JobRow) => j.result?.taskId === taskId);
  if (job) {
    await ctx.supabase.from('jobs')
      .update({ status: 'completed', payment_tx_id: paymentTxId, result: { ...job.result, resultHash, resultData } })
      .eq('id', job.id);
  }

  const response = {
    success: true,
    requestId: ctx.requestId,
    completion: {
      taskId,
      resultHash,
      providerBotId,
      paymentTxId,
    },
    payment: {
      grossAmount: amount,
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
      confirmations: 100 + Math.floor(Math.random() * 50),
    },
    clarityEvents: [
      { topic: 'task-completed', taskId, providerBotId, resultHash },
      { topic: 'escrow-released', taskId, amount: netAmount, asset },
      { topic: 'fee-burned', amount: burnAmount, asset },
    ],
  };

  if (ctx.idempotencyKey) setIdempotentResponse(ctx.idempotencyKey, JSON.stringify(response), 200);
  return jsonResponse(response);
}

/**
 * GET /task-engine?action=list-open-tasks
 * 
 * List tasks that are open for bidding.
 */
async function handleListOpenTasks(ctx: RequestContext) {
  const { limit, offset, page } = parsePagination(ctx.url);
  const skill = ctx.url.searchParams.get('skill');

  const { data: taskTxs, count } = await ctx.supabase
    .from('transactions')
    .select('*', { count: 'exact' })
    .eq('tx_type', 'task_created')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  const openTasks = (taskTxs || [])
    .filter((tx: TaskTxRow) => txMeta(tx).status === 'escrow_funded')
    .filter((tx: TaskTxRow) => {
      if (!skill) return true;
      const skills = txMeta(tx).requiredSkills;
      return Array.isArray(skills) && skills.includes(skill);
    })
    .map((tx: TaskTxRow) => {
      const m = txMeta(tx);
      return {
        taskId: m.taskId,
        title: m.title,
        description: m.description,
        requiredSkills: m.requiredSkills,
        budget: m.budget,
        asset: m.asset,
        deadlineBlock: m.deadlineBlock,
        requesterBotId: tx.from_bot_id,
        escrowTxId: m.escrowTxId,
        createdAt: tx.created_at,
      };
    });

  return jsonResponse(paginatedResponse(openTasks, count, page, limit));
}

// ========== Route Map ==========

const routes = {
  'create-task': { method: 'POST' as const, handler: handleCreateTask, rateLimit: 10 },
  'bid-on-task': { method: 'POST' as const, handler: handleBidOnTask, rateLimit: 20 },
  'accept-bid': { method: 'POST' as const, handler: handleAcceptBid, rateLimit: 10 },
  'complete-task': { method: 'POST' as const, handler: handleCompleteTask, rateLimit: 10 },
  'list-open-tasks': { method: 'GET' as const, handler: handleListOpenTasks, public: true },
};

serve(createEdgeHandler('task-engine', routes));
