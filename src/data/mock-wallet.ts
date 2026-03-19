// Comprehensive Stacks + Fireblocks wallet mock data
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
  | "stacking";

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
}

export interface MockNFT {
  id: string;
  name: string;
  image: string;
  contract: string;
  molbotType: string;
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

export const mockWallets: MockWallet[] = [
  {
    address: STACKS_ADDRESS,
    name: "Demo User",
    balances: { stx: 125.47, sbtc: 0.0023, usdc: 1500.25, credits: 8470 },
    transactions: [
      {
        id: "tx1",
        type: "deploy",
        amount: 0.5,
        asset: "STX",
        status: "confirmed",
        timestamp: "2026-03-19T14:32:15Z",
        counterparty: "Molbot Factory",
        fee: 0.001,
        txHash: "0xabc123...def456",
        molbotId: "molbot-xyz-123",
      },
      {
        id: "tx2",
        type: "molbot_payment",
        amount: 2.35,
        asset: "STX",
        status: "pending",
        timestamp: "2026-03-19T15:01:22Z",
        counterparty: "molbot-customer-support",
        fee: 0.0008,
        txHash: "0xdef456...ghi789",
        molbotId: "molbot-customer-support-456",
      },
    ],
    nfts: [
      {
        id: "nft1",
        name: "Molbot Alpha",
        image: "/mock/molbot-alpha.png",
        contract: `${STACKS_ADDRESS}::molbot-nft`,
        molbotType: "customer-support",
      },
    ],
    fireblocks: {
      vaults: [
        {
          id: "vault-001",
          name: "Molbot Treasury",
          assets: { STX: 2500, sBTC: 5.2, USDC: 125000 },
          policyId: "policy-main",
        },
      ],
      policies: [
        {
          id: "policy-main",
          name: "Molbot Production",
          limits: { daily: 10000, perTx: 2500 },
          allowedContracts: [`${STACKS_ADDRESS}::molbot-agent`],
        },
      ],
    },
  },
];

// Generate 50+ transactions for demo
export const generateMockTransactions = (
  wallet: MockWallet,
  count = 50,
): MockTransaction[] => {
  const types: MockTransactionType[] = [
    "send",
    "receive",
    "deploy",
    "molbot_payment",
    "stacking",
  ];
  const assets = ["STX", "sBTC", "USDC"];
  const statuses: MockTransactionStatus[] = ["pending", "confirmed", "failed"];

  return Array.from({ length: count }, (_, i) => {
    const txType = types[Math.floor(Math.random() * types.length)];
    const txStatus = statuses[Math.floor(Math.random() * statuses.length)];
    const txAsset = assets[Math.floor(Math.random() * assets.length)];
    return {
      id: `tx-${i + 1}`,
      type: txType,
      amount: Number((Math.random() * 10 + 0.01).toFixed(4)),
      asset: txAsset,
      status: txStatus,
      timestamp: new Date(Date.now() - i * 3600000).toISOString(),
      counterparty: `molbot-${wallet.address.slice(0, 6)}-${Math.random()
        .toString(36)
        .substring(7)}`,
      fee: Number((Math.random() * 0.01 + 0.0001).toFixed(6)),
      txHash: `0x${"abcdef0123456789".repeat(8).substring(0, 64)}`,
      molbotId: Math.random() > 0.3 ? `molbot-demo-${i}` : undefined,
    };
  });
};

