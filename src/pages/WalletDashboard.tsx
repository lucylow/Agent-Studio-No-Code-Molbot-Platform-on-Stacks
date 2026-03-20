import { motion } from "framer-motion";
import { useWallet } from "@/contexts/WalletContext";
import { AssetBalances } from "@/components/AssetBalances";
import { RecentTransactions } from "@/components/RecentTransactions";
import { Button } from "@/components/ui/button";
import { Wallet, RefreshCw, Bitcoin, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

const WalletDashboard = () => {
  const { isConnected, isLoading, address, totalFiat, connectWallet, disconnectWallet, refreshBalances } = useWallet();

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background pt-24 pb-16 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md mx-auto px-4"
        >
          <div className="w-20 h-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
            <Bitcoin className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-foreground mb-3">
            Molbot Studio Wallet
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed mb-8">
            Connect your Bitcoin wallet to create, hire, and monetize molbots
            with sBTC x402 payments and USDCx streaming.
          </p>
          <Button
            onClick={connectWallet}
            disabled={isLoading}
            className="bg-primary text-primary-foreground hover:bg-primary/90 glow-cyan gap-2 h-12 px-8 text-sm font-semibold"
          >
            <Wallet className="w-4 h-4" />
            {isLoading ? "Connecting…" : "Connect Bitcoin Wallet"}
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-24 pb-16">
      <div className="container mx-auto px-4 max-w-6xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4"
        >
          <div>
            <h1 className="text-2xl font-bold text-foreground">Wallet</h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-mono text-muted-foreground">
                {address?.slice(0, 8)}…{address?.slice(-6)}
              </span>
              <button
                onClick={() => {
                  if (address) {
                    navigator.clipboard.writeText(address);
                    toast.success("Address copied!");
                  }
                }}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={`https://explorer.hiro.so/address/${address}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right mr-2">
              <p className="text-xs text-muted-foreground">Total Value</p>
              <p className="text-lg font-bold text-foreground font-mono tabular-nums">
                ${totalFiat.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshBalances}
              className="border-border text-muted-foreground hover:text-foreground gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={disconnectWallet}
              className="text-muted-foreground hover:text-destructive"
            >
              Disconnect
            </Button>
          </div>
        </motion.div>

        {/* Asset Balances */}
        <div className="mb-8">
          <AssetBalances />
        </div>

        {/* Transactions */}
        <div className="grid lg:grid-cols-2 gap-6">
          <RecentTransactions />

          {/* Protocol info panel */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            className="gradient-border-card rounded-xl p-6 space-y-4"
          >
            <h3 className="text-sm font-semibold text-foreground">Payment Protocols</h3>

            <div className="space-y-3">
              <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                <span className="text-lg mt-0.5">⚡</span>
                <div>
                  <p className="text-xs font-semibold text-primary">x402 · sBTC Micropayments</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    Every bot-to-bot payment flows through payment-router.clar using the x402 protocol.
                    Instant settlement, per-request billing.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                <span className="text-lg mt-0.5">⟳</span>
                <div>
                  <p className="text-xs font-semibold text-secondary">USDCx · Streaming Payments</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    Long-running tasks use per-second USDCx streams via usdcx-stream.clar.
                    Stable pricing for subscription models.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-muted/10 rounded-lg">
                <span className="text-lg mt-0.5">🔗</span>
                <div>
                  <p className="text-xs font-semibold text-foreground">Secured by Bitcoin</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">
                    All transactions settle on Stacks via Proof-of-Transfer, inheriting Bitcoin's security model.
                  </p>
                </div>
              </div>
            </div>

            <p className="text-[9px] text-muted-foreground/40 text-center pt-2 border-t border-border/20">
              payment-router.clar · usdcx-stream.clar · bot-swarm.clar
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default WalletDashboard;
