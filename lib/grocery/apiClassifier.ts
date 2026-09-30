import { classifyWithRules } from "./rulesClassifier.ts";
import type { Classification, ItemClassifier } from "./types.ts";

// Browser-side classifier: asks the server route (/api/classify), which holds
// the Jev key. If the route fails, answer from the keyword rules so the demo
// works with no network. The caller injects fetch (component invariant: only
// route-level files touch browser APIs).

export const CLASSIFY_ENDPOINT = "/api/classify";

export function createApiClassifier(
  fetchFn: typeof fetch,
  endpoint: string = CLASSIFY_ENDPOINT,
): ItemClassifier {
  const fallback = (names: string[]) =>
    Object.fromEntries(names.map((n) => [n, classifyWithRules(n)]));

  return {
    async classify(names) {
      try {
        const res = await fetchFn(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ names }),
        });
        if (!res.ok) return fallback(names);
        const json = (await res.json()) as { results?: Record<string, Classification> };
        const results = json.results ?? {};
        // Fill any gaps so every requested name gets an answer.
        return Object.fromEntries(names.map((n) => [n, results[n] ?? classifyWithRules(n)]));
      } catch {
        return fallback(names);
      }
    },
  };
}
