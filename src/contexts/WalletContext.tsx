import { createContext, useContext, useState, ReactNode, useCallback } from "react";
import { toast } from "sonner";

export type WalletAssetSymbol = "sBTC" | "USDCx" | "STX";

export interface WalletAsset {
  symbol: WalletAssetSymbol;
  balance: number;
  price: number;
}

export interface WalletTransaction {
  id: string;
  type: "sent" | "received" | "x402" | "stream";
  amount: number;
  asset: WalletAssetSymbol;
  counterparty: string;
  timestamp: Date;
  status: "pending" | "confirmed" | "failed";
  txid: string;
  memo?: string;
}

interface WalletState {
  isConnected: boolean;
  address: string | null;
  assets: WalletAsset[];
  transactions: WalletTransaction[];
  isLoading: boolean;
}

interface WalletContextValue extends WalletState {
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  sendPayment: (to: string, amount: number, asset: WalletAssetSymbol) => Promise<string>;
  refreshBalances: () => Promise<void>;
  totalFiat: number;
}

const WalletContext = createContext<WalletContextValue | null>(null);

const MOCK_ADDRESS = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKQVX8X0G";

const INITIAL_ASSETS: WalletAsset[] = [
  { symbol: "sBTC", balance: 0.025343, price: 60000 },
  { symbol: "USDCx", balance: 1842.67, price: 1 },
  { symbol: "STX", balance: 1247.83, price: 1.08 },
];

function generateSeedTransactions(): WalletTransaction[] {
  const m = (mins: number) => new Date(Date.now() - mins * 60_000);
  return [
    {
      id: "wtx-1",
      type: "x402",
      amount: 0.0002,
      asset: "sBTC",
      counterparty: "ImageGen Pro",
      timestamp: m(8),
      status: "confirmed",
      txid: "0x7a3c91e2f4b8d6a5c3e1f0987654321abcdef0123456789abcdef0123456789",
      memo: "Cyberpunk cityscape generation",
    },
    {
      id: "wtx-2",
      type: "received",
      amount: 0.0005,
      asset: "sBTC",
      counterparty: "Content Factory swarm",
      timestamp: m(22),
      status: "confirmed",
      txid: "0xe5f8a1b4c7d0e3f6a9b2c5d8e1f4a7b0c3d6e9f2a5b8c1d4e7f0a3b6c9d2e5",
      memo: "Revenue share payout",
    },
    {
      id: "wtx-3",
      type: "stream",
      amount: 12.47,
      asset: "USDCx",
      counterparty: "GuardianBot",
      timestamp: m(45),
      status: "confirmed",
      txid: "0xb8c3d7e2f1a6094d5e8f2b3c6a9d0e1f4a7b2c5d8e1f0a3b6c9d2e5f8a1b4c7",
      memo: "24h contract surveillance",
    },
    {
      id: "wtx-4",
      type: "x402",
      amount: 0.001,
      asset: "sBTC",
      counterparty: "ClarityCopilot",
      timestamp: m(120),
      status: "confirmed",
      txid: "0x4d2e8f1a6b3c9078e5d2a1b4c7f0e3d6a9b2c5e8f1a4d7b0c3e6f9a2b5c8d1",
      memo: "payment-router.clar audit",
    },
    {
      id: "wtx-5",
      type: "x402",
      amount: 0.0005,
      asset: "sBTC",
      counterparty: "Summarizer-50",
      timestamp: m(180),
      status: "confirmed",
      txid: "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
      memo: "Q1 report summary",
    },
    {
      id: "wtx-6",
      type: "stream",
      amount: 3.82,
      asset: "USDCx",
      counterparty: "StacksIndexer",
      timestamp: m(240),
      status: "pending",
      txid: "0xf0e1d2c3b4a5968778695a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4",
      memo: "SIP-009 event indexing — active",
    },
    {
      id: "wtx-7",
      type: "sent",
      amount: 50.0,
      asset: "USDCx",
      counterparty: "DAO Treasury",
      timestamp: m(360),
      status: "confirmed",
      txid: "0xa1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456",
      memo: "Governance contribution",
    },
    {
      id: "wtx-8",
      type: "x402",
      amount: 0.00015,
      asset: "sBTC",
      counterparty: "SentimentPulse",
      timestamp: m(480),
      status: "confirmed",
      txid: "0xd4e5f6a7b8c9012345678901234567890abcdef1234567890abcdef12345678",
      memo: "$STX social sentiment scan",
    },
  ];
}

const txHash = () =>
  `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    isConnected: false,
    address: null,
    assets: [],
    transactions: [],
    isLoading: false,
  });

  const connectWallet = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true }));
    await new Promise((r) => setTimeout(r, 1200));

    setState({
      isConnected: true,
      address: MOCK_ADDRESS,
      assets: [...INITIAL_ASSETS],
      transactions: generateSeedTransactions(),
      isLoading: false,
    });

    toast.success("Wallet connected", {
      description: `${MOCK_ADDRESS.slice(0, 8)}…${MOCK_ADDRESS.slice(-6)}`,
    });
  }, []);

  const disconnectWallet = useCallback(() => {
    setState({
      isConnected: false,
      address: null,
      assets: [],
      transactions: [],
      isLoading: false,
    });
    toast("Wallet disconnected");
  }, []);

  const refreshBalances = useCallback(async () => {
    await new Promise((r) => setTimeout(r, 800));
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => ({
        ...a,
        balance: a.balance + (Math.random() - 0.48) * a.balance * 0.015,
      })),
    }));
    toast.success("Balances refreshed");
  }, []);

  const sendPayment = useCallback(
    async (to: string, amount: number, asset: WalletAssetSymbol): Promise<string> => {
      const mockTxid = txHash();

      toast.loading("Processing x402 payment…", { id: mockTxid });
      await new Promise((r) => setTimeout(r, 1500));

      setState((prev) => {
        const newAssets = prev.assets.map((a) =>
          a.symbol === asset ? { ...a, balance: Math.max(0, a.balance - amount) } : a
        );
        const newTx: WalletTransaction = {
          id: `wtx-${Date.now()}`,
          type: "x402",
          amount,
          asset,
          counterparty: to,
          timestamp: new Date(),
          status: "confirmed",
          txid: mockTxid,
          memo: `x402 payment to ${to}`,
        };
        return { ...prev, assets: newAssets, transactions: [newTx, ...prev.transactions] };
      });

      toast.success(`Sent ${amount} ${asset} via x402`, { id: mockTxid });
      return mockTxid;
    },
    []
  );

  const totalFiat = state.assets.reduce((sum, a) => sum + a.balance * a.price, 0);

  return (
    <WalletContext.Provider
      value={{ ...state, connectWallet, disconnectWallet, sendPayment, refreshBalances, totalFiat }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export const useWallet = () => {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within WalletProvider");
  return ctx;
};
