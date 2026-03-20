import type { Job, Transaction, UserWallet, BotSwarm } from '@/types/molbot';

const seedHash = (seed: string) =>
  `0x${Array.from(seed + 'x402molbot')
    .reduce((h, c) => ((h << 5) - h + c.charCodeAt(0)) | 0, 0)
    .toString(16)
    .replace('-', 'f')
    .padStart(8, '0')}${'abcdef0123456789'.repeat(4).slice(0, 56)}`;

const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const mockJobs: Job[] = [
  { id: 'job-001', requesterBotId: 'bot-002', providerBotId: 'bot-001', status: 'completed', prompt: 'Generate a cyberpunk cityscape at sunset with flying cars', result: 'Image delivered — 1024×1024, cyberpunk-sunset-v3.png', paymentAmount: 0.0002, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(2), completedAt: hoursAgo(1.88) },
  { id: 'job-002', requesterBotId: 'bot-009', providerBotId: 'bot-004', status: 'completed', prompt: 'Summarize Stacks Foundation Q1 2026 transparency report', result: 'Summary: 5 key findings, 3 action items, 1 risk flag', paymentAmount: 0.0005, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(5), completedAt: hoursAgo(4.82) },
  { id: 'job-003', requesterBotId: 'bot-008', providerBotId: 'bot-002', status: 'completed', prompt: 'Fetch sBTC/USD 24h OHLCV from CoinGecko + Hiro', result: '{"open":59847.20,"high":61200.00,"low":59102.44,"close":60142.50,"volume":847.3}', paymentAmount: 0.0001, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(8), completedAt: hoursAgo(7.99) },
  { id: 'job-004', requesterBotId: 'bot-005', providerBotId: 'bot-003', status: 'processing', prompt: 'Stream episode 42 of "Proof of Work" podcast — 47 minutes', paymentAmount: 0.001, paymentAsset: 'USDCx', protocol: 'USDCx-stream', createdAt: hoursAgo(0.5) },
  { id: 'job-005', requesterBotId: 'bot-001', providerBotId: 'bot-006', status: 'completed', prompt: 'Audit payment-router.clar for reentrancy and overflow risks', result: 'Audit passed — 2 minor gas suggestions, 0 critical issues', paymentAmount: 0.001, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(12), completedAt: hoursAgo(11.4) },
  { id: 'job-006', requesterBotId: 'bot-011', providerBotId: 'bot-004', status: 'failed', prompt: 'Summarize corrupted PDF: annual_report_2025.pdf', paymentAmount: 0, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(14) },
  { id: 'job-007', requesterBotId: 'bot-007', providerBotId: 'bot-001', status: 'completed', prompt: 'Generate POAP artwork for BUIDL Battle #2 finalists', result: 'Image delivered — 512×512, buidl-battle-poap-v2.png', paymentAmount: 0.0002, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(24), completedAt: hoursAgo(23.82) },
  { id: 'job-008', requesterBotId: 'bot-012', providerBotId: 'bot-002', status: 'completed', prompt: 'Monitor SP1PQHQKV0RJXZFY… contract for 24h', result: 'Monitoring complete — 847 events, 0 anomalies detected', paymentAmount: 0.01, paymentAsset: 'USDCx', protocol: 'USDCx-stream', createdAt: hoursAgo(48), completedAt: hoursAgo(24) },
  { id: 'job-009', requesterBotId: 'bot-013', providerBotId: 'bot-002', status: 'completed', prompt: 'Fetch Twitter sentiment for $STX over last 6 hours', result: 'Sentiment: 72% positive, 18% neutral, 10% negative. Volume: 2,847 mentions', paymentAmount: 0.00015, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(3), completedAt: hoursAgo(2.95) },
  { id: 'job-010', requesterBotId: 'bot-014', providerBotId: 'bot-011', status: 'completed', prompt: 'Translate NDA template from English to Spanish and Portuguese', result: 'NDA translated — 2 languages, 4,200 words total', paymentAmount: 0.0004, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(18), completedAt: hoursAgo(17.7) },
  { id: 'job-011', requesterBotId: 'user', providerBotId: 'bot-015', status: 'processing', prompt: 'Index all SIP-009 transfer events for last 1000 blocks', paymentAmount: 0.003, paymentAsset: 'USDCx', protocol: 'USDCx-stream', createdAt: hoursAgo(1) },
  { id: 'job-012', requesterBotId: 'bot-016', providerBotId: 'bot-004', status: 'completed', prompt: 'Summarize voice transcript from product demo recording', result: 'Summary: 8 feature highlights, 3 user pain points, 2 competitor mentions', paymentAmount: 0.0005, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(6), completedAt: hoursAgo(5.9) },
  { id: 'job-013', requesterBotId: 'user', providerBotId: 'bot-001', status: 'pending', prompt: 'Generate hero image for Agent Studio landing page — dark theme, abstract bots', paymentAmount: 0.0002, paymentAsset: 'sBTC', protocol: 'x402', createdAt: hoursAgo(0.1) },
];

export const mockTransactions: Transaction[] = [
  { id: 'tx-001', txId: seedHash('tx001'), fromBotId: 'bot-002', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(1.88), memo: 'Cyberpunk cityscape generation' },
  { id: 'tx-002', txId: seedHash('tx002'), fromBotId: 'bot-009', toBotId: 'bot-004', amount: 0.0005, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(4.82), memo: 'Q1 transparency report summary' },
  { id: 'tx-003', txId: seedHash('tx003'), fromBotId: 'bot-008', toBotId: 'bot-002', amount: 0.0001, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(7.99), memo: 'sBTC OHLCV data fetch' },
  { id: 'tx-004', txId: seedHash('tx004'), fromBotId: 'bot-005', toBotId: 'bot-003', amount: 0.034, asset: 'USDCx', protocol: 'USDCx-stream', status: 'pending', timestamp: hoursAgo(0.5), memo: 'Podcast stream — in progress' },
  { id: 'tx-005', txId: seedHash('tx005'), fromBotId: 'bot-001', toBotId: 'bot-006', amount: 0.001, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(11.4), memo: 'payment-router.clar audit' },
  { id: 'tx-006', txId: seedHash('tx006'), fromBotId: 'bot-007', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(23.82), memo: 'BUIDL Battle POAP artwork' },
  { id: 'tx-007', txId: seedHash('tx007'), fromBotId: 'bot-012', toBotId: 'bot-002', amount: 0.01, asset: 'USDCx', protocol: 'USDCx-stream', status: 'confirmed', timestamp: hoursAgo(24), memo: '24h contract monitoring' },
  { id: 'tx-008', txId: seedHash('tx008'), fromBotId: 'bot-013', toBotId: 'bot-002', amount: 0.00015, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(2.95), memo: '$STX sentiment analysis' },
  { id: 'tx-009', txId: seedHash('tx009'), fromBotId: 'bot-014', toBotId: 'bot-011', amount: 0.0004, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(17.7), memo: 'NDA translation ES/PT' },
  { id: 'tx-010', txId: seedHash('tx010'), fromBotId: 'bot-009', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(10), memo: 'Product catalog images' },
  { id: 'tx-011', txId: seedHash('tx011'), fromBotId: 'user', toBotId: 'bot-015', amount: 0.003, asset: 'USDCx', protocol: 'USDCx-stream', status: 'pending', timestamp: hoursAgo(1), memo: 'SIP-009 event indexing' },
  { id: 'tx-012', txId: seedHash('tx012'), fromBotId: 'bot-016', toBotId: 'bot-004', amount: 0.0005, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(5.9), memo: 'Demo transcript summary' },
  { id: 'tx-013', txId: seedHash('tx013'), fromBotId: 'bot-010', toBotId: 'bot-002', amount: 0.00005, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(3.2), memo: 'Weather query: São Paulo' },
  { id: 'tx-014', txId: seedHash('tx014'), fromBotId: 'bot-005', toBotId: 'bot-011', amount: 0.0001, asset: 'sBTC', protocol: 'x402', status: 'confirmed', timestamp: hoursAgo(28), memo: 'Remittance disclaimer translation' },
  { id: 'tx-015', txId: seedHash('tx015'), fromBotId: 'user', toBotId: 'bot-001', amount: 0.0002, asset: 'sBTC', protocol: 'x402', status: 'pending', timestamp: hoursAgo(0.1), memo: 'Hero image generation' },
];

export const mockWalletData: UserWallet = {
  stxAddress: 'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQVX8X0G',
  sbtcBalance: 0.0253,
  usdcxBalance: 128.42,
  fiatEquivalent: 1646.42,
  activeStreams: 2,
};

// Swarms for the dashboard
export const mockSwarms: BotSwarm[] = [
  {
    id: 'swarm-001',
    name: 'Content Factory',
    members: [
      { botId: 'bot-001', share: 0.40 },
      { botId: 'bot-004', share: 0.30 },
      { botId: 'bot-011', share: 0.20 },
      { botId: 'bot-016', share: 0.10 },
    ],
    totalEarned: 0.0847,
    status: 'active',
  },
  {
    id: 'swarm-002',
    name: 'Security Watchtower',
    members: [
      { botId: 'bot-012', share: 0.50 },
      { botId: 'bot-006', share: 0.30 },
      { botId: 'bot-015', share: 0.20 },
    ],
    totalEarned: 0.0312,
    status: 'active',
  },
  {
    id: 'swarm-003',
    name: 'Commerce Suite',
    members: [
      { botId: 'bot-009', share: 0.45 },
      { botId: 'bot-010', share: 0.25 },
      { botId: 'bot-013', share: 0.30 },
    ],
    totalEarned: 0.0156,
    status: 'forming',
  },
];

// Time-series for charts (last 14 days with organic-looking data)
const earningsCurve = [4.2, 6.8, 5.1, 9.3, 12.7, 8.4, 14.2, 11.6, 18.3, 15.9, 22.1, 19.4, 27.8, 24.6];
const usdcxCurve = [8.1, 11.4, 9.7, 14.2, 18.6, 13.8, 21.3, 17.9, 26.4, 22.7, 31.8, 28.1, 38.2, 33.5];

export const mockEarningsTimeSeries = earningsCurve.map((sbtcUsd, i) => {
  const date = new Date();
  date.setDate(date.getDate() - (earningsCurve.length - 1 - i));
  return {
    date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sbtcUsd: Math.round(sbtcUsd * 100) / 100,
    usdcx: Math.round(usdcxCurve[i] * 100) / 100,
  };
});

// Ecosystem-level metrics for impact dashboard
export const mockEcosystemMetrics = {
  totalBots: 1247,
  totalJobs: 48392,
  totalVolumeSbtc: 2.347,
  totalVolumeUsdcx: 18420.65,
  uniqueUsers: 892,
  activeSwarms: 47,
  countriesReached: 34,
  activeStreams: 128,
  weeklyGrowth: 0.127,
  monthlyGrowth: 0.473,
  topCreators: [
    { handle: 'alex.btc', bots: 4, revenue: 0.284, jobs: 6230 },
    { handle: 'priya.btc', bots: 2, revenue: 0.192, jobs: 14800 },
    { handle: 'zara.btc', bots: 3, revenue: 0.147, jobs: 9400 },
    { handle: 'devon.btc', bots: 1, revenue: 0.098, jobs: 2108 },
    { handle: 'mei.btc', bots: 2, revenue: 0.086, jobs: 7300 },
  ],
};
