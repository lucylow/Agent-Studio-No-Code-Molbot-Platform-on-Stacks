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

const MOCK_ADDRESS = "ST2Y7MKJ2PK5XBK1MXMVQ4H9T5CY3PKTA9K2P9F3B";

const INITIAL_ASSETS: WalletAsset[] = [
  { symbol: "sBTC", balance: 0.002543, price: 60000 },
  { symbol: "USDCx", balance: 245.73, price: 1 },
  { symbol: "STX", balance: 1250, price: 1 },
];

function generateSeedTransactions(): WalletTransaction[] {
  return [
    {
      id: "wtx-1",
      type: "received",
      amount: 0.0005,
      asset: "sBTC",
      counterparty: "ST3X…ContentBot",
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      status: "confirmed",
      txid: "0xabc123def456789012345678901234567890123456789012345678901234abcd",
    },
    {
      id: "wtx-2",
      type: "x402",
      amount: 0.0012,
      asset: "sBTC",
      counterparty: "ST4Y…ImageGenPro",
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      status: "confirmed",
      txid: "0xdef456789012345678901234567890123456789012345678901234567890abcd",
    },
    {
      id: "wtx-3",
      type: "stream",
      amount: 2.34,
      asset: "USDCx",
      counterparty: "ST5Z…StreamPlayer",
      timestamp: new Date(Date.now() - 1000 * 60 * 120),
      status: "confirmed",
      txid: "0xghi789012345678901234567890123456789012345678901234567890123abc",
    },
    {
      id: "wtx-4",
      type: "x402",
      amount: 0.0003,
      asset: "sBTC",
      counterparty: "ST6W…Summarizer50",
      timestamp: new Date(Date.now() - 1000 * 60 * 200),
      status: "confirmed",
      txid: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    },
    {
      id: "wtx-5",
      type: "sent",
      amount: 15.0,
      asset: "USDCx",
      counterparty: "ST7V…ShopBot",
      timestamp: new Date(Date.now() - 1000 * 60 * 300),
      status: "confirmed",
      txid: "0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321",
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
    // Slightly randomize to show refresh effect
    setState((prev) => ({
      ...prev,
      assets: prev.assets.map((a) => ({
        ...a,
        balance: a.balance + (Math.random() - 0.5) * a.balance * 0.02,
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
        };
        return { ...prev, assets: newAssets, transactions: [newTx, ...prev.transactions] };
      });

      toast.success(`Sent ${amount} ${asset} via x402!`, { id: mockTxid });
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
