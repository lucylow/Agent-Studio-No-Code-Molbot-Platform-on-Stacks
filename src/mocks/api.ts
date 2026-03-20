import type { Molbot, Job, Transaction, UserWallet } from '@/types/molbot';
import { mockMolbots } from './molbots';
import { mockJobs, mockTransactions, mockWalletData } from './transactions';

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const txHash = () => `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;

// In-memory state for mutations
let _bots = [...mockMolbots];
let _jobs = [...mockJobs];
let _transactions = [...mockTransactions];
let _wallet = { ...mockWalletData };

export async function fetchMarketplaceBots(): Promise<Molbot[]> {
  await delay(300);
  return _bots;
}

export async function fetchBotById(id: string): Promise<Molbot | undefined> {
  await delay(200);
  return _bots.find((b) => b.id === id);
}

export async function fetchJobs(): Promise<Job[]> {
  await delay(250);
  return _jobs;
}

export async function fetchTransactions(): Promise<Transaction[]> {
  await delay(200);
  return _transactions;
}

export async function fetchWallet(): Promise<UserWallet> {
  await delay(150);
  return { ..._wallet };
}

export async function hireBot(botId: string, prompt: string): Promise<{ jobId: string; txId: string }> {
  await delay(800);
  const bot = _bots.find((b) => b.id === botId);
  if (!bot) throw new Error('Bot not found');

  const jobId = `job-${Date.now()}`;
  const txId = txHash();

  const job: Job = {
    id: jobId,
    requesterBotId: 'user',
    providerBotId: botId,
    status: 'processing',
    prompt,
    paymentAmount: bot.priceAmount,
    paymentAsset: bot.asset,
    protocol: bot.pricingModel === 'stream' ? 'USDCx-stream' : 'x402',
    createdAt: new Date().toISOString(),
  };
  _jobs = [job, ..._jobs];

  const tx: Transaction = {
    id: `tx-${Date.now()}`,
    txId,
    fromBotId: 'user',
    toBotId: botId,
    amount: bot.priceAmount,
    asset: bot.asset,
    protocol: job.protocol,
    status: 'confirmed',
    timestamp: new Date().toISOString(),
    memo: prompt.slice(0, 40),
  };
  _transactions = [tx, ..._transactions];

  // Update wallet
  if (bot.asset === 'sBTC') _wallet.sbtcBalance -= bot.priceAmount;
  else _wallet.usdcxBalance -= bot.priceAmount;

  // Simulate completion after delay
  setTimeout(() => {
    const idx = _jobs.findIndex((j) => j.id === jobId);
    if (idx !== -1) {
      _jobs[idx] = { ..._jobs[idx], status: 'completed', result: `Result from ${bot.name}`, completedAt: new Date().toISOString() };
    }
  }, 3000 + Math.random() * 5000);

  return { jobId, txId };
}

export async function publishBot(bot: Partial<Molbot>): Promise<Molbot> {
  await delay(600);
  const newBot: Molbot = {
    id: `bot-${Date.now()}`,
    name: bot.name || 'Unnamed Bot',
    avatarColor: `hsl(${Math.floor(Math.random() * 360)}, 70%, 55%)`,
    avatarEmoji: '🤖',
    ownerHandle: 'you.stx',
    shortDescription: bot.shortDescription || 'A new molbot',
    longDescription: bot.longDescription || '',
    skills: bot.skills || [],
    pricingModel: bot.pricingModel || 'fixed',
    priceAmount: bot.priceAmount || 0.001,
    asset: bot.asset || 'sBTC',
    successRate: 1,
    jobsCompleted: 0,
    averageLatencyMs: 0,
    rating: 0,
    x402Enabled: bot.pricingModel !== 'stream',
    usdcxStreaming: bot.pricingModel === 'stream',
    tags: bot.tags || [],
  };
  _bots = [newBot, ..._bots];
  return newBot;
}

// Reset to initial state
export function resetMockState() {
  _bots = [...mockMolbots];
  _jobs = [...mockJobs];
  _transactions = [...mockTransactions];
  _wallet = { ...mockWalletData };
}
