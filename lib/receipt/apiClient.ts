import { matchReceipt, type ListItemRef } from "./match.ts";
import { parseReceipt } from "./parse.ts";
import { summarizeReceipt, type ReceiptSummary } from "./summary.ts";

// Browser-side receipt matcher: asks /api/receipt (which holds the Jev key).
// If the route fails or the device is offline, matches locally with the rules
// (they can ask, never tick). The caller injects fetch (component invariant).

export const RECEIPT_ENDPOINT = "/api/receipt";

export function createApiReceiptMatcher(fetchFn: typeof fetch, endpoint: string = RECEIPT_ENDPOINT) {
  async function local(text: string, items: ListItemRef[]): Promise<ReceiptSummary> {
    return summarizeReceipt(await matchReceipt(parseReceipt(text), items, null), items);
  }
  return async function match(text: string, items: ListItemRef[]): Promise<ReceiptSummary> {
    try {
      const res = await fetchFn(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, items }),
      });
      if (!res.ok) return local(text, items);
      return (await res.json()) as ReceiptSummary;
    } catch {
      return local(text, items);
    }
  };
}
