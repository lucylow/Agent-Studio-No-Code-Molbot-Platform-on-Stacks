import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWallet, type WalletTransaction } from "@/contexts/WalletContext";
import { ExternalLink, Copy, ChevronDown } from "lucide-react";
import { toast } from "sonner";

const TX_META: Record<WalletTransaction["type"], { icon: string; label: string; accent: string }> = {
  x402: { icon: "⚡", label: "x402 Payment", accent: "text-primary" },
  sent: { icon: "↑", label: "Sent", accent: "text-orange-400" },
  received: { icon: "↓", label: "Received", accent: "text-emerald-400" },
  stream: { icon: "⟳", label: "USDCx Stream", accent: "text-violet-400" },
};

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const [expanded, setExpanded] = useState(false);
  const meta = TX_META[tx.type];
  const isIncoming = tx.type === "received";

  return (
    <div>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/10 transition-colors text-left"
      >
        <div className="w-8 h-8 rounded-lg bg-muted/15 flex items-center justify-center flex-shrink-0 text-sm">
          {meta.icon}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold ${meta.accent}`}>{meta.label}</span>
            {tx.status === "pending" && (
              <span className="w-1.5 h-1.5 rounded-full bg-yellow-400 animate-pulse" />
            )}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono truncate">
            {tx.counterparty}
          </p>
        </div>

        <div className="text-right flex-shrink-0">
          <p className={`text-xs font-mono font-semibold tabular-nums ${isIncoming ? "text-emerald-400" : "text-foreground"}`}>
            {isIncoming ? "+" : "-"}
            {tx.asset === "sBTC" ? tx.amount.toFixed(6) : tx.amount.toFixed(2)} {tx.asset}
          </p>
          <p className="text-[9px] text-muted-foreground">
            {formatRelativeTime(tx.timestamp)}
          </p>
        </div>

        <ChevronDown className={`w-3 h-3 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="ml-11 mr-3 mb-2 p-3 bg-muted/10 rounded-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">TxID</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(tx.txid);
                    toast.success("Copied!");
                  }}
                  className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1"
                >
                  <Copy className="w-3 h-3" /> Copy
                </button>
              </div>
              <p className="text-[9px] font-mono text-foreground/70 break-all">{tx.txid}</p>
              <div className="flex items-center gap-3 text-[10px] text-muted-foreground pt-1 border-t border-border/20">
                <span>Status: <span className="text-foreground">{tx.status.toUpperCase()}</span></span>
                <a
                  href={`https://explorer.hiro.so/txid/${tx.txid}?chain=testnet`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline flex items-center gap-1 ml-auto"
                >
                  <ExternalLink className="w-3 h-3" /> Explorer
                </a>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function RecentTransactions() {
  const { transactions } = useWallet();

  return (
    <div className="gradient-border-card rounded-xl overflow-hidden">
      <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">Recent Activity</h3>
        <span className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      <div className="p-2 max-h-[400px] overflow-y-auto">
        {transactions.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-3xl mb-2">📊</p>
            <p className="text-sm text-muted-foreground">No transactions yet</p>
            <p className="text-[10px] text-muted-foreground/60 mt-1">
              Your first molbot payment will appear here
            </p>
          </div>
        ) : (
          transactions.slice(0, 8).map((tx) => <TransactionRow key={tx.id} tx={tx} />)
        )}
      </div>
    </div>
  );
}
