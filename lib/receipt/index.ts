// Receipt pipeline step 1 (docs/receipt-pipeline-plan.md): text → lines →
// Jev match → actions.
export { parseReceipt } from "./parse.ts";
export type { ReceiptLine } from "./parse.ts";
export { ASK, AUTO_TICK, IS_FOOD, NONE, RECEIPT_MAX_TEXT, RECEIPT_QUESTIONS, SAME_PRODUCT, decide, matchReceipt, receiptLineRequest, verifyRequest } from "./match.ts";
export type { LineAction, LineMatch, ListItemRef, MatchOptions, ReceiptQuestionVersion, ReceiptTransport } from "./match.ts";
export { summarizeReceipt } from "./summary.ts";
export type { ReceiptSummary } from "./summary.ts";
export { createApiReceiptMatcher, RECEIPT_ENDPOINT } from "./apiClient.ts";
