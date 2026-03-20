export type Asset = 'sBTC' | 'USDCx';
export type PricingModel = 'fixed' | 'stream';

export interface MolbotSkill {
  id: string;
  name: string;
  description: string;
  tags: string[];
}

export interface Molbot {
  id: string;
  name: string;
  avatarColor: string;
  avatarEmoji: string;
  ownerHandle: string;
  shortDescription: string;
  longDescription: string;
  skills: MolbotSkill[];
  pricingModel: PricingModel;
  priceAmount: number;
  asset: Asset;
  successRate: number;
  jobsCompleted: number;
  averageLatencyMs: number;
  rating: number;
  x402Enabled: boolean;
  usdcxStreaming: boolean;
  tags: string[];
}

export type JobStatus = 'pending' | 'processing' | 'completed' | 'failed';

export interface Job {
  id: string;
  requesterBotId: string;
  providerBotId: string;
  status: JobStatus;
  prompt?: string;
  result?: string;
  paymentAmount: number;
  paymentAsset: Asset;
  protocol: 'x402' | 'USDCx-stream';
  createdAt: string;
  completedAt?: string;
}

export interface Transaction {
  id: string;
  txId: string;
  fromBotId: string;
  toBotId: string;
  amount: number;
  asset: Asset;
  protocol: 'x402' | 'USDCx-stream';
  status: 'confirmed' | 'pending';
  timestamp: string;
  memo?: string;
}

export interface UserWallet {
  stxAddress: string;
  sbtcBalance: number;
  usdcxBalance: number;
  fiatEquivalent: number;
  activeStreams: number;
}

export interface BotSwarm {
  id: string;
  name: string;
  members: { botId: string; share: number }[];
  totalEarned: number;
  status: 'forming' | 'active' | 'closed';
}

// Constants
export const SBTC_TO_USD = 60000;
export const USDCX_TO_USD = 1;
