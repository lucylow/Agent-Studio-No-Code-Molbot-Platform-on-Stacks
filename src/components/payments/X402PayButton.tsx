import { useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Zap, CheckCircle2, Loader2, ExternalLink, Copy, AlertCircle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useX402Payment } from "@/hooks/useX402Payment";
import { toFiatValue, formatFiat } from "@/lib/x402/types";
import type { X402QuoteResponse } from "@/lib/x402/types";
import { toast } from "sonner";
import { useState } from "react";

interface X402PayButtonProps {
  payerAddress: string;
  payeeAddress: string;
  asset?: "sBTC" | "USDCx";
  mode?: "one_time" | "stream";
  amount: number;
  jobId: string;
  botId: string;
  botName?: string;
  memo?: string;
  onExecutePayment?: (quote: {
    quoteId: string;
    amount: number;
    asset: "sBTC" | "USDCx";
    payeeAddress: string;
  }) => Promise<{ txid: string }>;
  onSettled?: (txid: string) => void;
}

export function X402PayButton({
  payerAddress,
  payeeAddress,
  asset = "sBTC",
  mode = "one_time",
  amount,
  jobId,
  botId,
  botName,
  memo = "Molbot Studio x402 payment",
  onExecutePayment,
  onSettled,
}: X402PayButtonProps) {
  const { state, quote, receipt, error, pay, reset } = useX402Payment();
  const [copied, setCopied] = useState(false);

  const fiatValue = formatFiat(toFiatValue(amount, asset));
  const isProcessing = state === "quoting" || state === "quoted" || state === "submitting" || state === "confirming";

  const label = useMemo(() => {
    switch (state) {
      case "quoting": return "Preparing quote…";
      case "quoted": return "Authorizing…";
      case "submitting": return "Submitting payment…";
      case "confirming": return "Confirming on Stacks…";
      case "settled": return "Payment confirmed ✓";
      case "error": return "Retry payment";
      default: return `Pay ${amount} ${asset}`;
    }
  }, [state, amount, asset]);

  const defaultExecutePayment = async (q: {
    quoteId: string;
    amount: number;
    asset: "sBTC" | "USDCx";
    payeeAddress: string;
  }) => {
    // Mock: simulate wallet signing + broadcast
    await new Promise((r) => setTimeout(r, 1500));
    const txid = `0x${Array.from({ length: 64 }, () =>
      Math.floor(Math.random() * 16).toString(16)
    ).join("")}`;
    return { txid };
  };

  const handlePay = async () => {
    try {
      const result = await pay(
        {
          payerAddress,
          payeeAddress,
          asset,
          mode,
          amount,
          memo,
          jobId,
          botId,
          idempotencyKey: crypto.randomUUID(),
        },
        async (q) => {
          const executor = onExecutePayment ?? defaultExecutePayment;
          return executor({
            quoteId: q.quoteId,
            amount: q.amount,
            asset: q.asset,
            payeeAddress: q.payeeAddress,
          });
        }
      );
      if (result) {
        toast.success(`Paid ${amount} ${asset} via x402`, {
          description: `Tx: ${result.txid.slice(0, 16)}…`,
        });
        onSettled?.(result.txid);
      }
    } catch {
      toast.error("Payment failed", { description: error ?? "Please try again" });
    }
  };

  const copyTxid = () => {
    if (receipt?.txid) {
      navigator.clipboard.writeText(receipt.txid);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-semibold text-foreground">x402 Payment</span>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
          {mode === "stream" ? "USDCx stream" : "one-time"}
        </span>
      </div>

      <div className="p-4 space-y-4">
        {/* Amount */}
        <div className="text-center py-2">
          <p className="text-2xl font-mono font-bold text-foreground tabular-nums tracking-tight">
            {amount} <span className="text-base text-muted-foreground">{asset}</span>
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">≈ {fiatValue}</p>
          {botName && (
            <p className="text-[10px] text-muted-foreground/60 mt-1 font-mono">
              → {botName}
            </p>
          )}
        </div>

        {/* Quote details */}
        <AnimatePresence>
          {quote && state !== "idle" && state !== "settled" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="bg-muted/20 rounded-lg p-3 space-y-1.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Quote ID</span>
                <span className="text-[10px] font-mono text-foreground/70 truncate max-w-[140px]">
                  {quote.quoteId.slice(0, 8)}…
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Expires</span>
                <span className="text-[10px] font-mono text-foreground/70">
                  {new Date(quote.expiresAt).toLocaleTimeString()}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Progress indicator */}
        {isProcessing && (
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
            <span className="text-xs text-muted-foreground">{label}</span>
          </div>
        )}

        {/* Action button */}
        {state === "idle" || state === "error" ? (
          <Button
            onClick={handlePay}
            className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 font-semibold h-11 active:scale-[0.97] transition-transform"
          >
            <Zap className="w-4 h-4" />
            {label}
          </Button>
        ) : state === "settled" ? (
          <Button
            onClick={reset}
            variant="outline"
            className="w-full gap-2 border-border text-muted-foreground h-10"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            New Payment
          </Button>
        ) : null}

        {/* Receipt / Error */}
        <AnimatePresence>
          {error && state === "error" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2 text-destructive text-xs bg-destructive/10 rounded-lg px-3 py-2"
            >
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              <span>{error}</span>
            </motion.div>
          )}

          {receipt && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-muted/20 rounded-lg p-3 space-y-2"
            >
              <div className="flex items-center gap-1.5 text-green-400 mb-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Settled on Stacks</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground">Transaction ID</span>
                <button
                  onClick={copyTxid}
                  className="text-[10px] text-primary hover:text-primary/80 flex items-center gap-1 transition-colors"
                >
                  {copied ? (
                    <CheckCircle2 className="w-3 h-3" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              <p className="text-[10px] font-mono text-foreground/70 break-all leading-relaxed">
                {receipt.txid}
              </p>
              <a
                href={`https://explorer.hiro.so/txid/${receipt.txid}?chain=testnet`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-primary hover:underline"
              >
                <ExternalLink className="w-3 h-3" />
                View on Stacks Explorer
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Protocol footer */}
        <p className="text-[9px] text-muted-foreground/40 text-center leading-relaxed">
          x402 · payment-router.clar · Secured by Bitcoin via PoX
        </p>
      </div>
    </div>
  );
}
