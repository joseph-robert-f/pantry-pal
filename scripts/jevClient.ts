// Cached Jev client for offline scripts (eval-jev, judge-recipes). Raw
// responses are saved to a JSON file keyed by request hash, so a re-run
// replays them with no API calls. Needs TYPESAFE_API_KEY only for uncached
// requests. Not for the app: the server route has its own transport.

import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { SystemOneRequest, SystemOneResponse } from "../lib/jev/api.ts";

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export type JevClientStats = {
  calls: number;
  cached: number;
  inputTokens: number;
  latenciesMs: number[];
};

export function createCachedJevClient(cachePath: string, { live = false } = {}) {
  mkdirSync(dirname(cachePath), { recursive: true });
  const cache: Record<string, SystemOneResponse> =
    !live && existsSync(cachePath) ? JSON.parse(readFileSync(cachePath, "utf8")) : {};
  const stats: JevClientStats = { calls: 0, cached: 0, inputTokens: 0, latenciesMs: [] };

  async function ask(body: SystemOneRequest): Promise<SystemOneResponse> {
    const key = createHash("sha256").update(JSON.stringify(body)).digest("hex").slice(0, 16);
    if (cache[key]) {
      stats.cached++;
      stats.inputTokens += cache[key].usage?.input_tokens ?? 0;
      return cache[key];
    }
    const apiKey = process.env.TYPESAFE_API_KEY;
    if (!apiKey) throw new Error("TYPESAFE_API_KEY is not set and the request is not cached");

    for (let attempt = 0; ; attempt++) {
      const started = performance.now();
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        const json = (await res.json()) as SystemOneResponse;
        stats.calls++;
        stats.latenciesMs.push(performance.now() - started);
        stats.inputTokens += json.usage?.input_tokens ?? 0;
        cache[key] = json;
        return json;
      }
      const retryable = res.status === 429 || res.status >= 500;
      if (!retryable || attempt >= 4) {
        throw new Error(`Jev ${res.status}: ${(await res.text()).slice(0, 300)}`);
      }
      const retryAfter = Number(res.headers.get("retry-after"));
      await sleep(retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 1000);
    }
  }

  function save() {
    writeFileSync(cachePath, JSON.stringify(cache, null, 1) + "\n");
  }

  return { ask, save, stats };
}

export async function pool<T, R>(
  inputs: T[],
  fn: (t: T) => Promise<R>,
  concurrency = 8,
): Promise<R[]> {
  const out: R[] = new Array(inputs.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, inputs.length) }, async () => {
      while (next < inputs.length) {
        const i = next++;
        out[i] = await fn(inputs[i]);
      }
    }),
  );
  return out;
}
