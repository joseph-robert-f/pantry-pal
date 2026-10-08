import type { JevTransport, SystemOneResponse } from "../jev/api.ts";
import { createRateLimiter, type RateLimitResult } from "../rateLimit.ts";

// Server-only Jev access shared by every API route (/api/classify,
// /api/receipt). One budget and one per-client limiter for the whole
// instance, so two routes cannot together exceed the account limit.
// Never import this from a component or client code: it reads the API key.

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 1500;

// Per client: burst of 10 request units, then 30 a minute.
const perClient = createRateLimiter({ capacity: 10, refillPerSec: 0.5 });
// Per instance: Jev calls, about half the 40 requests/s account limit.
const jevBudget = createRateLimiter({ capacity: 100, refillPerSec: 20, maxKeys: 1 });
// Receipts also draw from a smaller sub-budget, so receipt traffic can never
// take more than about half of the Jev budget away from /api/classify.
const receiptBudget = createRateLimiter({ capacity: 60, refillPerSec: 10, maxKeys: 1 });

export type JevPool = "classify" | "receipt";

export function takeClientRequest(key: string, cost = 1): RateLimitResult {
  return perClient.take(key, Date.now(), cost);
}

// A transport for the classifier and the receipt matcher, or null when no key
// is set (callers then answer from rules). Over budget, a call throws, so the
// caller falls back to rules for that one item.
export function jevSendFromEnv(pool: JevPool = "classify"): JevTransport | null {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;
  return async (body) => {
    const now = Date.now();
    if (pool === "receipt" && !receiptBudget.take("jev", now).ok) throw new Error("Receipt budget exhausted");
    if (!jevBudget.take("jev", now).ok) throw new Error("Jev budget exhausted");
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(TIMEOUT_MS),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Jev ${res.status}`);
    return (await res.json()) as SystemOneResponse;
  };
}
