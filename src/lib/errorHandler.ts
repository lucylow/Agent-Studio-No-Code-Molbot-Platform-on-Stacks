// User-friendly error messages for common contract/API error codes
const errorMap: Record<string, string> = {
  // Contract errors
  "u100": "Invalid price model. Please choose 'Fixed' or 'Stream'.",
  "u101": "You've reached the maximum of 100 bots per account.",
  "u102": "Bot name cannot be empty.",
  "u400": "Payment amount must be greater than zero.",
  "u401": "You don't have permission to do that. Please check your wallet connection.",
  "u402": "Mint fee not paid. Please ensure you have enough sBTC.",
  "u403": "You don't own this item. Please connect the correct wallet.",
  "u404": "Not found. The item you're looking for doesn't exist.",
  "u409": "This action was already completed. No duplicate needed.",
  "u410": "This item is already inactive.",
  "u411": "This item is already active.",
  "u500": "Transfer failed. Please check your balance and try again.",
  "u1000": "Calculation overflow. The numbers are too large.",

  // API errors
  "ERR_INSUFFICIENT_FUNDS": "You don't have enough funds. Get free test funds from the faucet.",
  "ERR_UNAUTHORIZED": "Please sign in to continue.",
  "ERR_NETWORK": "Network issue. Check your connection and try again.",
  "ERR_RATE_LIMIT": "Too many requests. Please wait a moment and try again.",
  "ERR_VALIDATION": "Please check your inputs and try again.",

  // Generic
  "UNKNOWN": "Something went wrong. Please try again later.",
};

export function getUserFriendlyError(error: string | Error): string {
  const msg = typeof error === "string" ? error : error.message;

  // Check exact match
  if (errorMap[msg]) return errorMap[msg];

  // Check if error contains a known code
  for (const [code, friendly] of Object.entries(errorMap)) {
    if (msg.includes(code)) return friendly;
  }

  // Common patterns
  if (msg.toLowerCase().includes("unauthorized") || msg.toLowerCase().includes("401")) {
    return errorMap["ERR_UNAUTHORIZED"];
  }
  if (msg.toLowerCase().includes("rate limit") || msg.toLowerCase().includes("429")) {
    return errorMap["ERR_RATE_LIMIT"];
  }
  if (msg.toLowerCase().includes("network") || msg.toLowerCase().includes("fetch")) {
    return errorMap["ERR_NETWORK"];
  }

  // Return original if it's already somewhat readable, otherwise generic
  if (msg.length < 100 && !msg.includes("Error:")) return msg;
  return errorMap["UNKNOWN"];
}
