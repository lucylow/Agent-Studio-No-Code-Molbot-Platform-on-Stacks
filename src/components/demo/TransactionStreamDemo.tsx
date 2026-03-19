import { useEffect, useRef, useState } from "react";
import {
  generateMockTransactions,
  type MockTransaction,
  mockWallets,
} from "@/data/mock-wallet";

export const TransactionStreamDemo = () => {
  const [transactions, setTransactions] = useState<MockTransaction[]>([]);
  const [autoScroll, setAutoScroll] = useState(true);
  const listRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wallet = mockWallets[0];
    const txs = generateMockTransactions(wallet, 20);
    setTransactions(txs);

    const interval = setInterval(() => {
      const typePool: MockTransaction["type"][] = [
        "send",
        "receive",
        "molbot_payment",
      ];
      const assetPool = ["STX", "sBTC"] as const;

      const newTx: MockTransaction = {
        id: `live-${Date.now()}`,
        type: typePool[Math.floor(Math.random() * typePool.length)],
        amount: Number((Math.random() * 5 + 0.01).toFixed(4)),
        asset: assetPool[Math.floor(Math.random() * assetPool.length)],
        status: "pending",
        timestamp: new Date().toISOString(),
        counterparty: `molbot-${Math.random().toString(36).substring(7)}`,
        fee: 0.0005,
        txHash: `0x${crypto.randomUUID().replace(/-/g, "")}`,
      };

      setTransactions((prev) => {
        if (autoScroll) {
          return [newTx, ...prev].slice(0, 20);
        }

        // When auto-scroll is off, keep the current view stable by appending.
        return [...prev.slice(1), newTx];
      });
    }, 3000);

    return () => clearInterval(interval);
  }, [autoScroll]);

  useEffect(() => {
    if (!autoScroll) return;
    listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [transactions, autoScroll]);

  return (
    <div className="bg-gradient-to-b from-slate-900/80 to-slate-900/20 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-xl font-bold text-white">Live Transactions</h3>
        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="w-4 h-4 rounded"
          />
          Auto-scroll
        </label>
      </div>

      <div
        ref={listRef}
        className="space-y-3 max-h-96 overflow-y-auto pr-1"
      >
        {transactions.map((tx) => (
          <TransactionRow key={tx.id} tx={tx} />
        ))}
      </div>
    </div>
  );
};

const TransactionRow = ({ tx }: { tx: MockTransaction }) => (
  <div className="group flex items-center gap-4 p-4 rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-transparent hover:border-white/20">
    <div
      className={`w-3 h-3 rounded-full ${
        tx.status === "pending"
          ? "bg-yellow-400 animate-pulse"
          : tx.status === "failed"
            ? "bg-red-500"
            : "bg-green-400"
      }`}
    />
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 mb-1">
        <span
          className={`px-2 py-1 rounded-full text-xs font-bold ${
            tx.type === "molbot_payment"
              ? "bg-purple-500/20 text-purple-300"
              : tx.type === "deploy"
                ? "bg-blue-500/20 text-blue-300"
                : tx.type === "send"
                  ? "bg-red-500/20 text-red-300"
                  : "bg-green-500/20 text-green-300"
          }`}
        >
          {tx.type.replace("_", " ").toUpperCase()}
        </span>
        <span className="text-sm opacity-75 truncate">{tx.counterparty}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="font-mono text-lg font-bold text-white">
          {tx.amount} {tx.asset}
        </span>
        <span className="text-xs opacity-50 font-mono">
          {tx.txHash.slice(0, 10)}...
        </span>
      </div>
    </div>
  </div>
);

