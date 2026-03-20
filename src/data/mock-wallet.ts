// Comprehensive Stacks wallet mock data for demo mode
export interface MockWallet {
  address: string;
  name: string;
  balances: {
    stx: number;
    sbtc: number;
    usdc: number;
    credits: number;
  };
  transactions: MockTransaction[];
  nfts: MockNFT[];
  fireblocks: {
    vaults: MockVault[];
    policies: MockPolicy[];
  };
}

export type MockTransactionType =
  | "send"
  | "receive"
  | "deploy"
  | "molbot_payment"
  | "stacking"
  | "x402"
  | "stream";

export type MockTransactionStatus = "pending" | "confirmed" | "failed";

export interface MockTransaction {
  id: string;
  type: MockTransactionType;
  amount: number;
  asset: string;
  status: MockTransactionStatus;
  timestamp: string;
  counterparty: string;
  fee: number;
  txHash: string;
  molbotId?: string;
  memo?: string;
}

export interface MockNFT {
  id: string;
  name: string;
  image: string;
  contract: string;
  molbotType: string;
  tokenId: number;
  mintedAt: string;
}

export interface MockVault {
  id: string;
  name: string;
  assets: Record<string, number>;
  policyId: string;
}

export interface MockPolicy {
  id: string;
  name: string;
  limits: {
    daily: number;
    perTx: number;
  };
  allowedContracts: string[];
}

const STACKS_ADDRESS = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7";
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();

export const mockWallets: MockWallet[] = [
  {
    address: STACKS_ADDRESS,
    name: "Demo Creator",
    balances: { stx: 1247.83, sbtc: 0.0253, usdc: 1842.67, credits: 8470 },
    transactions: [
      {
        id: "mw-tx1",
        type: "deploy",
        amount: 0.5,
        asset: "STX",
        status: "confirmed",
        timestamp: hoursAgo(4),
        counterparty: "Molbot Factory",
        fee: 0.00124,
        txHash: "0x7a3c91e2f4b8d6a5c3e1f0987654321abcdef0123456789abcdef0123456789",
        molbotId: "bot-001",
        memo: "Deploy ImageGen Pro v2",
      },
      {
        id: "mw-tx2",
        type: "x402",
        amount: 0.0002,
        asset: "sBTC",
        status: "confirmed",
        timestamp: hoursAgo(2),
        counterparty: "bot-001 → bot-006",
        fee: 0.00008,
        txHash: "0x4d2e8f1a6b3c9078e5d2a1b4c7f0e3d6a9b2c5e8f1a4d7b0c3e6f9a2b5c8d1",
        molbotId: "bot-006",
        memo: "Contract audit via ClarityCopilot",
      },
      {
        id: "mw-tx3",
        type: "stream",
        amount: 12.47,
        asset: "USDCx",
        status: "confirmed",
        timestamp: hoursAgo(8),
        counterparty: "GuardianBot monitoring",
        fee: 0,
        txHash: "0xb8c3d7e2f1a6094d5e8f2b3c6a9d0e1f4a7b2c5d8e1f0a3b6c9d2e5f8a1b4c7",
        molbotId: "bot-012",
        memo: "24h contract surveillance stream",
      },
      {
        id: "mw-tx4",
        type: "receive",
        amount: 0.0005,
        asset: "sBTC",
        status: "confirmed",
        timestamp: hoursAgo(6),
        counterparty: "Content Factory swarm",
        fee: 0,
        txHash: "0xe5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5",
        memo: "Revenue share payout",
      },
      {
        id: "mw-tx5",
        type: "molbot_payment",
        amount: 0.0005,
        asset: "sBTC",
        status: "pending",
        timestamp: hoursAgo(0.3),
        counterparty: "Summarizer-50",
        fee: 0.00008,
        txHash: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
        molbotId: "bot-004",
        memo: "Summarize partnership proposal",
      },
      {
        id: "mw-tx6",
        type: "stacking",
        amount: 500,
        asset: "STX",
        status: "confirmed",
        timestamp: hoursAgo(72),
        counterparty: "PoX Cycle #94",
        fee: 0.002,
        txHash: "0xf0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4",
        memo: "Locked for 12 cycles",
      },
    ],
    nfts: [
      {
        id: "nft-001",
        name: "ImageGen Pro — Operator License",
        image: "/placeholder.svg",
        contract: `${STACKS_ADDRESS}.molbot-nft`,
        molbotType: "content-generation",
        tokenId: 1,
        mintedAt: hoursAgo(168),
      },
      {
        id: "nft-002",
        name: "BUIDL Battle #2 Finalist",
        image: "/placeholder.svg",
        contract: `${STACKS_ADDRESS}.stamp-nft`,
        molbotType: "achievement",
        tokenId: 42,
        mintedAt: hoursAgo(24),
      },
      {
        id: "nft-003",
        name: "GuardianBot — Guardian License",
        image: "/placeholder.svg",
        contract: `${STACKS_ADDRESS}.molbot-nft`,
        molbotType: "security-monitor",
        tokenId: 7,
        mintedAt: hoursAgo(336),
      },
    ],
    fireblocks: {
      vaults: [
        {
          id: "vault-001",
          name: "Molbot Operations",
          assets: { STX: 2500, sBTC: 0.182, USDCx: 12840 },
          policyId: "policy-main",
        },
        {
          id: "vault-002",
          name: "Swarm Revenue Pool",
          assets: { sBTC: 0.0847, USDCx: 3420 },
          policyId: "policy-swarm",
        },
      ],
      policies: [
        {
          id: "policy-main",
          name: "Production Operations",
          limits: { daily: 10000, perTx: 2500 },
          allowedContracts: [
            `${STACKS_ADDRESS}.molbot-agent`,
            `${STACKS_ADDRESS}.payment-router`,
          ],
        },
        {
          id: "policy-swarm",
          name: "Swarm Revenue Distribution",
          limits: { daily: 5000, perTx: 1000 },
          allowedContracts: [`${STACKS_ADDRESS}.bot-swarm`],
        },
      ],
    },
  },
];

// Generate realistic-looking transaction history
export const generateMockTransactions = (
  wallet: MockWallet,
  count = 50,
): MockTransaction[] => {
  const scenarios: Array<{
    type: MockTransactionType;
    asset: string;
    amountRange: [number, number];
    counterparties: string[];
    memos: string[];
  }> = [
    { type: 'x402', asset: 'sBTC', amountRange: [0.00005, 0.002], counterparties: ['ImageGen Pro', 'Summarizer-50', 'DataFetch', 'ClarityCopilot', 'StampMint', 'ShopBot'], memos: ['Image generation', 'Document summary', 'API data fetch', 'Contract review', 'NFT stamp mint', 'Product lookup'] },
    { type: 'stream', asset: 'USDCx', amountRange: [0.5, 25], counterparties: ['StreamPlayer', 'GuardianBot', 'BitVault', 'StacksIndexer', 'SatsForward'], memos: ['Media stream', 'Contract monitoring', 'Treasury analytics', 'Event indexing', 'Cross-border transfer'] },
    { type: 'receive', asset: 'sBTC', amountRange: [0.0001, 0.005], counterparties: ['Content Factory swarm', 'Security Watchtower', 'Marketplace earnings'], memos: ['Revenue share', 'Monitoring payout', 'Bot hire earnings'] },
    { type: 'send', asset: 'STX', amountRange: [1, 50], counterparties: ['Swarm bond deposit', 'Bot deployment', 'DAO treasury'], memos: ['Bond deposit', 'Contract deploy', 'Governance contribution'] },
    { type: 'stacking', asset: 'STX', amountRange: [100, 1000], counterparties: ['PoX Cycle #92', 'PoX Cycle #93', 'PoX Cycle #94'], memos: ['12-cycle lock', '6-cycle lock'] },
  ];

  return Array.from({ length: count }, (_, i) => {
    const scenario = scenarios[i % scenarios.length];
    const cpIdx = i % scenario.counterparties.length;
    const amount = scenario.amountRange[0] + Math.random() * (scenario.amountRange[1] - scenario.amountRange[0]);
    const statuses: MockTransactionStatus[] = i < 3 ? ['pending'] : ['confirmed', 'confirmed', 'confirmed', 'confirmed', 'failed'];

    return {
      id: `gen-tx-${i + 1}`,
      type: scenario.type,
      amount: Number(amount.toFixed(scenario.asset === 'STX' ? 2 : 6)),
      asset: scenario.asset,
      status: statuses[Math.floor(Math.random() * statuses.length)],
      timestamp: new Date(Date.now() - (i * 2.4 + Math.random() * 1.2) * 3600000).toISOString(),
      counterparty: scenario.counterparties[cpIdx],
      fee: scenario.asset === 'USDCx' ? 0 : Number((Math.random() * 0.002 + 0.0001).toFixed(6)),
      txHash: `0x${(i * 7 + 42).toString(16).padStart(4, '0')}${'abcdef0123456789'.repeat(4).slice(0, 60)}`,
      molbotId: scenario.type === 'x402' || scenario.type === 'stream' ? `bot-${String((i % 16) + 1).padStart(3, '0')}` : undefined,
      memo: scenario.memos[cpIdx % scenario.memos.length],
    };
  });
};
