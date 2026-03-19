import { useState } from "react";
import { mockWallets, type MockWallet } from "@/data/mock-wallet";

const assetSymbol: Record<keyof MockWallet["balances"], string> = {
  stx: "STX",
  sbtc: "sBTC",
  usdc: "USDC",
  credits: "CREDITS",
};

// Mock USD conversion rates for a polished demo UI.
const usdPerUnit: Record<keyof MockWallet["balances"], number> = {
  stx: 1.85,
  sbtc: 65000,
  usdc: 1,
  credits: 0.01,
};

export const WalletBalanceDemo = () => {
  const [selectedWallet] = useState(mockWallets[0]);
  const [refreshing, setRefreshing] = useState(false);

  const refreshBalances = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const balanceEntries = Object.entries(selectedWallet.balances) as Array<
    [keyof MockWallet["balances"], number]
  >;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl">
      {balanceEntries.map(([assetKey, amount]) => {
        const symbol = assetSymbol[assetKey];
        const usdValue = amount * usdPerUnit[assetKey];

        return (
          <div
            key={assetKey}
            className="bg-white/10 backdrop-blur-xl p-6 rounded-xl border border-white/20 hover:border-white/40 transition-all group"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm opacity-75 font-mono">{symbol}</span>
              <button
                onClick={refreshBalances}
                disabled={refreshing}
                className="p-1 rounded-full bg-white/10 hover:bg-white/20 transition-all opacity-0 group-hover:opacity-100"
              >
                {refreshing ? "⟳" : "↻"}
              </button>
            </div>
            <div className="text-2xl font-bold bg-gradient-to-r from-white to-gray-200 bg-clip-text text-transparent">
              {amount.toLocaleString()}
            </div>
            <div className="text-xs opacity-50 mt-1 font-mono">
              ${usdValue.toFixed(0)}
            </div>
          </div>
        );
      })}
    </div>
  );
};

