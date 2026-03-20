import type { Job, Transaction, UserWallet } from '@/types/molbot';

const txHash = () => `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('')}`;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const mockJobs: Job[] = [
  { id: 'job-001', requesterBotId: 'bot-002', providerBotId: 'bot-001', status: 'completed', prompt: 'Generate a cyberpunk cityscape', result: 'Image delivered (1024x1024)', paymentAmount: 0.0002, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(2), completedAt: hoursAgo(1.9) },
  { id: 'job-002', requesterBotId: 'bot-009', providerBotId: 'bot-004', status: 'completed', prompt: 'Summarize Q1 earnings report', result: 'Summary: 3 key points extracted', paymentAmount: 0.0005, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(5), completedAt: hoursAgo(4.8) },
  { id: 'job-003', requesterBotId: 'bot-008', providerBotId: 'bot-002', status: 'completed', prompt: 'Fetch CoinGecko BTC price', result: '{"price": 60142.50}', paymentAmount: 0.0001, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(8), completedAt: hoursAgo(7.99) },
  { id: 'job-004', requesterBotId: 'bot-005', providerBotId: 'bot-003', status: 'processing', prompt: 'Stream podcast episode #42', paymentAmount: 0.001, paymentAsset: 'USDCx', protocol: 'USDCx-stream', createdAt: hoursAgo(0.5) },
  { id: 'job-005', requesterBotId: 'bot-001', providerBotId: 'bot-006', status: 'completed', prompt: 'Review payment-router.clar', result: 'Audit passed — 2 minor suggestions', paymentAmount: 0.001, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(12), completedAt: hoursAgo(11.5) },
  { id: 'job-006', requesterBotId: 'bot-011', providerBotId: 'bot-004', status: 'failed', prompt: 'Summarize corrupted PDF', paymentAmount: 0, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(14) },
  { id: 'job-007', requesterBotId: 'bot-007', providerBotId: 'bot-001', status: 'completed', prompt: 'Generate POAP artwork for Stacks Con', result: 'Image delivered (512x512)', paymentAmount: 0.0002, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(24), completedAt: hoursAgo(23.8) },
  { id: 'job-008', requesterBotId: 'bot-012', providerBotId: 'bot-002', status: 'completed', prompt: 'Monitor contract SP1234...', result: 'Monitoring active — 0 anomalies', paymentAmount: 0.01, paymentAsset: 'USDCx', protocol: 'USDCx-stream', createdAt: hoursAgo(48), completedAt: hoursAgo(24) },
];

export const mockTransactions: Transaction[] = [
  { id: 'tx-001', txId: txHash(), fromBotId: 'bot-002', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(1.9), memo: 'Image generation' },
  { id: 'tx-002', txId: txHash(), fromBotId: 'bot-009', toBotId: 'bot-004', amount: 0.0005, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(4.8), memo: 'Document summary' },
  { id: 'tx-003', txId: txHash(), fromBotId: 'bot-008', toBotId: 'bot-002', amount: 0.0001, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(7.99), memo: 'API fetch' },
  { id: 'tx-004', txId: txHash(), fromBotId: 'bot-005', toBotId: 'bot-003', amount: 0.034, asset: 'USDCx', protocol: 'USDCx-stream', status: 'pending', timestamp: hoursAgo(0.5), memo: 'Streaming — in progress' },
  { id: 'tx-005', txId: txHash(), fromBotId: 'bot-001', toBotId: 'bot-006', amount: 0.001, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(11.5), memo: 'Contract audit' },
  { id: 'tx-006', txId: txHash(), fromBotId: 'bot-007', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(23.8), memo: 'POAP artwork' },
  { id: 'tx-007', txId: txHash(), fromBotId: 'bot-012', toBotId: 'bot-002', amount: 0.01, asset: 'USDCx', protocol: 'USDCx-stream', status: 'confirmed', timestamp: hoursAgo(24), memo: 'Contract monitoring' },
  { id: 'tx-008', txId: txHash(), fromBotId: 'bot-010', toBotId: 'bot-002', amount: 0.00005, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(3), memo: 'Weather query' },
  { id: 'tx-009', txId: txHash(), fromBotId: 'bot-011', toBotId: 'bot-004', amount: 0.0005, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(6), memo: 'Translation job' },
  { id: 'tx-010', txId: txHash(), fromBotId: 'bot-009', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(10), memo: 'Product image' },
];

export const mockWalletData: UserWallet = {
  stxAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQVX8X0G',
  sbtcBalance: 0.0253,
  usdcxBalance: 128.42,
  fiatEquivalent: 1646.42,
  activeStreams: 2,
};

// Time-series for charts (last 7 days)
export const mockEarningsTimeSeries = Array.from({ length: 7 }, (_, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (6 - i));
  return {
    date: date.toLocaleDateString('en-US', { weekday: 'short' }),
    sbtcUsd: Math.round((8 + Math.random() * 35) * 100) / 100,
    usdcx: Math.round((12 + Math.random() * 45) * 100) / 100,
  };
});
