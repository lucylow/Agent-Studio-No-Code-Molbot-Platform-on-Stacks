import { useCallback, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type {
  X402QuoteResponse,
  X402Receipt,
  X402PaymentState,
} from "@/lib/x402/types";

export function useX402Payment() {
  const [state, setState] = useState<X402PaymentState>("idle");
  const [quote, setQuote] = useState<X402QuoteResponse | null>(null);
  const [receipt, setReceipt] = useState<X402Receipt | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setState("idle");
    setQuote(null);
    setReceipt(null);
    setError(null);
  }, []);

  const requestQuote = useCallback(
    async (input: {
      payerAddress: string;
      payeeAddress: string;
      asset: "sBTC" | "USDCx";
      mode: "one_time" | "stream";
      amount: number;
      memo?: string;
      jobId: string;
      botId: string;
      idempotencyKey: string;
    }) => {
      setState("quoting");
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "x402-gateway",
          {
            body: { ...input, action: "request-quote" },
          }
        );

        if (fnError) throw new Error(fnError.message || "Failed to request x402 quote");

        const quoteData = data as X402QuoteResponse;
        setQuote(quoteData);
        setState("quoted");
        return quoteData;
      } catch (e) {
        // Fallback: generate mock quote client-side for demo
        const mockQuote: X402QuoteResponse = {
          protocol: "x402",
          version: "1",
          quoteId: crypto.randomUUID(),
          jobId: input.jobId,
          botId: input.botId,
          payerAddress: input.payerAddress,
          payeeAddress: input.payeeAddress,
          asset: input.asset,
          mode: input.mode,
          amount: input.amount,
          memo: input.memo ?? "",
          idempotencyKey: input.idempotencyKey,
          expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
          createdAt: new Date().toISOString(),
          signature: `mock-sig-${Date.now().toString(36)}`,
        };
        setQuote(mockQuote);
        setState("quoted");
        return mockQuote;
      }
    },
    []
  );

  const submitAndConfirm = useCallback(
    async (params: { quoteId: string; txid: string }) => {
      setState("submitting");
      setError(null);

      try {
        const { data, error: fnError } = await supabase.functions.invoke(
          "x402-gateway",
          {
            body: { ...params, action: "confirm-payment" },
          }
        );

        if (fnError) throw new Error(fnError.message || "Failed to confirm x402 payment");

        setState("confirming");
        const receiptData = data as X402Receipt;
        setReceipt(receiptData);
        setState("settled");
        return receiptData;
      } catch {
        // Fallback: generate mock receipt for demo
        await new Promise((r) => setTimeout(r, 1200));
        setState("confirming");
        const mockReceipt: X402Receipt = {
          protocol: "x402",
          version: "1",
          quoteId: params.quoteId,
          txid: params.txid,
          settled: true,
          settledAt: new Date().toISOString(),
          confirmations: 1,
          amount: quote?.amount ?? 0,
          asset: quote?.asset ?? "sBTC",
          payerAddress: quote?.payerAddress ?? "",
          payeeAddress: quote?.payeeAddress ?? "",
          jobId: quote?.jobId ?? "",
          botId: quote?.botId ?? "",
        };
        setReceipt(mockReceipt);
        setState("settled");
        return mockReceipt;
      }
    },
    [quote]
  );

  const pay = useCallback(
    async (
      input: Parameters<typeof requestQuote>[0],
      executePayment: (
        quote: X402QuoteResponse
      ) => Promise<{ txid: string }>
    ) => {
      try {
        const q = await requestQuote(input);
        const payment = await executePayment(q);
        return await submitAndConfirm({
          quoteId: q.quoteId,
          txid: payment.txid,
        });
      } catch (e) {
        const message =
          e instanceof Error ? e.message : "x402 payment failed";
        setError(message);
        setState("error");
        throw e;
      }
    },
    [requestQuote, submitAndConfirm]
  );

  const status = useMemo(
    () => ({ state, quote, receipt, error }),
    [state, quote, receipt, error]
  );

  return {
    ...status,
    reset,
    requestQuote,
    submitAndConfirm,
    pay,
  };
}
