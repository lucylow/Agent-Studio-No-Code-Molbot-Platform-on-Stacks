import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Bitcoin, ExternalLink, Copy, CheckCircle2, Loader2, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SBTC_TO_USD } from "@/types/molbot";

interface SbtcPaymentFlowProps {
  botName: string;
  botOwner: string;
  priceSats: number;
  asset: "sBTC" | "USDCx";
  jobId?: string;
  onPaymentComplete?: (txid: string) => void;
}

type PaymentState = "idle" | "signing" | "broadcasting" | "confirming" | "confirmed" | "failed";

const txHash = () =>
  `0x${Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join("")}`;

export function SbtcPaymentFlow({
  botName,
  botOwner,
  priceSats,
  asset,
  jobId,
  onPaymentComplete,
}: SbtcPaymentFlowProps) {
  const [state, setState] = useState<PaymentState>("idle");
  const [txid, setTxid] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const fiatValue = asset === "sBTC"
    ? (priceSats * SBTC_TO_USD).toFixed(2)
    : (priceSats * 1).toFixed(2);

  const handlePay = async () => {
    setState("signing");

    // Simulate wallet signing
    await new Promise((r) => setTimeout(r, 800));
    setState("broadcasting");

    // Simulate broadcast
    await new Promise((r) => setTimeout(r, 1200));
    const mockTxid = txHash();
    setTxid(mockTxid);
    setState("confirming");

    // Simulate confirmation
    await new Promise((r) => setTimeout(r, 2000 + Math.random() * 2000));
    setState("confirmed");

    toast.success(`Paid ${priceSats} ${asset} via x402!`, {
      description: `Tx: ${mockTxid.slice(0, 16)}…`,
    });

    onPaymentComplete?.(mockTxid);
  };

  const copyTxid = () => {
    if (txid) {
      navigator.clipboard.writeText(txid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const stateConfig: Record<PaymentState, { label: string; color: string }> = {
    idle: { label: "Ready", color: "text-muted-foreground" },
    signing: { label: "Signing transaction…", color: "text-yellow-400" },
    broadcasting: { label: "Broadcasting to Stacks…", color: "text-orange-400" },
    confirming: { label: "Awaiting confirmation…", color: "text-primary" },
    confirmed: { label: "Payment confirmed", color: "text-green-400" },
    failed: { label: "Payment failed", color: "text-destructive" },
  };

  return (
    <div className="gradient-border-card rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Bitcoin className="w-4 h-4 text-orange-400" />
          <span className="text-xs font-semibold text-foreground">x402 sBTC Payment</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/15">
          {asset}
        </span>
      </div>

      <div className="p-5 space-y-4">
        {/* Amount display */}
        <div className="text-center">
          <p className="text-3xl font-mono font-bold text-foreground tabular-nums">
            {priceSats} <span className="text-lg text-muted-foreground">{asset}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">≈ ${fiatValue} USD</p>
        </div>

        {/* Flow diagram */}
        <div className="flex items-center justify-between px-2 py-3">
          <div className="text-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <span className="text-sm">👤</span>
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 font-mono">You</p>
          </div>

          {/* Animated payment rail */}
          <div className="flex-1 mx-3 relative h-8 flex items-center">
            <div className="w-full h-px bg-gradient-to-r from-primary/30 via-primary/60 to-primary/30" />
            <AnimatePresence>
              {(state === "broadcasting" || state === "confirming") && (
                <motion.div
                  initial={{ left: "0%", opacity: 0, scale: 0.5 }}
                  animate={{ left: "100%", opacity: [0, 1, 1, 0], scale: [0.5, 1, 1, 0.5] }}
                  transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                  className="absolute top-1/2 -translate-y-1/2"
                >
                  <div className="w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
                </motion.div>
              )}
              {state === "confirmed" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                >
                  <CheckCircle2 className="w-4 h-4 text-green-400" />
                </motion.div>
              )}
            </AnimatePresence>
            <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 whitespace-nowrap">
              <p className="text-[8px] font-mono text-muted-foreground/60">
                payment-router.clar → x402
              </p>
            </div>
          </div>

          <div className="text-center flex-shrink-0">
            <div className="w-10 h-10 rounded-full bg-secondary/10 border border-secondary/20 flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-[9px] text-muted-foreground mt-1 font-mono truncate max-w-[60px]">
              {botOwner}
            </p>
          </div>
        </div>

        {/* Status */}
        <div className="flex items-center justify-center gap-2 py-1">
          {(state === "signing" || state === "broadcasting" || state === "confirming") && (
            <Loader2 className="w-3 h-3 animate-spin text-primary" />
          )}
          {state === "confirmed" && <CheckCircle2 className="w-3 h-3 text-green-400" />}
          <p className={`text-xs font-medium ${stateConfig[state].color}`}>
            {stateConfig[state].label}
          </p>
        </div>

        {/* Transaction details */}
        <AnimatePresence>
          {txid && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-muted/10 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Transaction ID</span>
                <button
                  onClick={copyTxid}
                  className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] font-mono text-foreground/80 break-all leading-relaxed">
                {txid}
              </p>
              {jobId && (
                <div className="flex items-center justify-between pt-1 border-t border-border/20">
                  <span className="text-[10px] text-muted-foreground">Job ID</span>
                  <span className="text-[10px] font-mono text-foreground/60">{jobId}</span>
                </div>
              )}
              <a
                href={`https://explorer.hiro.so/txid/${txid}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary hover:underline pt-1"
              >
                <ExternalLink className="w-3 h-3" />
                View on Stacks Explorer
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Pay button */}
        {state === "idle" && (
          <Button
            onClick={handlePay}
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 gap-2"
          >
            <Bitcoin className="w-4 h-4" />
            Pay {priceSats} {asset} via x402
          </Button>
        )}

        {state === "confirmed" && (
          <Button
            onClick={() => {
              setState("idle");
              setTxid(null);
            }}
            variant="outline"
            className="w-full border-border text-muted-foreground h-10"
          >
            Make Another Payment
          </Button>
        )}

        {/* Protocol info */}
        <p className="text-[9px] text-muted-foreground/40 text-center leading-relaxed">
          Routed via payment-router.clar on Stacks · Secured by Bitcoin via Proof-of-Transfer
        </p>
      </div>
    </div>
  );
}
