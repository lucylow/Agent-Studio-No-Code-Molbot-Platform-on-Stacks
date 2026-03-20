import { z } from "zod";

export const x402AssetSchema = z.enum(["sBTC", "USDCx"]);
export const x402ModeSchema = z.enum(["one_time", "stream"]);

export const x402QuoteRequestSchema = z.object({
  payerAddress: z.string().min(10),
  payeeAddress: z.string().min(10),
  asset: x402AssetSchema,
  mode: x402ModeSchema,
  amount: z.number().positive(),
  memo: z.string().max(120).optional().default(""),
  jobId: z.string().min(1),
  botId: z.string().min(1),
  idempotencyKey: z.string().min(8),
});

export type X402QuoteRequest = z.infer<typeof x402QuoteRequestSchema>;

export interface X402QuoteResponse {
  protocol: "x402";
  version: "1";
  quoteId: string;
  jobId: string;
  botId: string;
  payerAddress: string;
  payeeAddress: string;
  asset: "sBTC" | "USDCx";
  mode: "one_time" | "stream";
  amount: number;
  memo: string;
  idempotencyKey: string;
  expiresAt: string;
  createdAt: string;
  signature: string;
}

export interface X402ConfirmRequest {
  quoteId: string;
  txid: string;
}

export interface X402Receipt {
  protocol: "x402";
  version: "1";
  quoteId: string;
  txid: string;
  settled: boolean;
  settledAt: string;
  confirmations: number;
  amount: number;
  asset: "sBTC" | "USDCx";
  payerAddress: string;
  payeeAddress: string;
  jobId: string;
  botId: string;
}

export type X402PaymentState =
  | "idle"
  | "quoting"
  | "quoted"
  | "submitting"
  | "confirming"
  | "settled"
  | "error";

export function formatFiat(amountUsd: number, locale = "en-US") {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(amountUsd);
}

export const SBTC_USD_PRICE = 60000;
export const USDCX_USD_PRICE = 1;

export function toFiatValue(amount: number, asset: "sBTC" | "USDCx"): number {
  return asset === "sBTC" ? amount * SBTC_USD_PRICE : amount * USDCX_USD_PRICE;
}
