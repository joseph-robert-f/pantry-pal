// Token-bucket rate limiter (#J3b). Pure: the caller passes the clock, so it
// runs in tests and in any server runtime.
//
// State lives in this process only. On Vercel each server instance keeps its
// own buckets, so the effective limit is per instance. That is enough to stop
// one visitor from draining the Jev account in a prototype. For real traffic,
// move the buckets to a shared store (e.g. Vercel KV / Upstash) or use the
// platform's firewall rate limiting.

export type RateLimitOptions = {
  capacity: number; // burst size
  refillPerSec: number; // steady rate
  maxKeys?: number; // memory bound; oldest-idle keys are dropped past this
};

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

type Bucket = { tokens: number; updatedMs: number };

export function createRateLimiter({ capacity, refillPerSec, maxKeys = 10_000 }: RateLimitOptions) {
  const buckets = new Map<string, Bucket>();

  function take(key: string, nowMs: number, cost = 1): RateLimitResult {
    const prev = buckets.get(key);
    const elapsedSec = prev ? Math.max(0, nowMs - prev.updatedMs) / 1000 : 0;
    const tokens = prev ? Math.min(capacity, prev.tokens + elapsedSec * refillPerSec) : capacity;

    // Re-insert so Map order tracks recency; evict the least recent past maxKeys.
    buckets.delete(key);
    if (tokens >= cost) {
      buckets.set(key, { tokens: tokens - cost, updatedMs: nowMs });
      if (buckets.size > maxKeys) buckets.delete(buckets.keys().next().value as string);
      return { ok: true };
    }
    buckets.set(key, { tokens, updatedMs: nowMs });
    return { ok: false, retryAfterSec: Math.ceil((cost - tokens) / refillPerSec) };
  }

  return { take, size: () => buckets.size };
}

// Client key for a request. Vercel sets x-forwarded-for; the first address is
// the client. Unknown callers share one bucket, which fails safe.
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip")?.trim() || "unknown";
}
