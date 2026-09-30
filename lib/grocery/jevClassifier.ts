import { lookupCatalogue, normalizeName } from "./catalogue.ts";
import { asChoice, type Answer, type SystemOneRequest, type SystemOneResponse } from "../jev/api.ts";
import { SECTION_CRITERIA_V2, singleItemRequest } from "./jevQuestions.ts";
import { classifyWithRules } from "./rulesClassifier.ts";
import { SECTION_ORDER, type Classification, type ItemClassifier, type Section } from "./types.ts";

// Jev-backed classifier (plan #J3). Decisions from the #J2 eval
// (eval/jev/README.md): v2 criteria, one item per request, confidence
// threshold 0.70. Below it, keep Jev's choice and flag it for review — the
// keyword rules scored 33% on unseen items, so they are only the fallback for
// when Jev is unavailable.

export const CONFIDENCE_THRESHOLD = 0.7;

// Sends one request to Jev. Injected so the key and fetch stay in the server
// route, and tests run without a network.
export type JevTransport = (body: SystemOneRequest) => Promise<SystemOneResponse>;

export type JevClassifierOptions = {
  send: JevTransport;
  concurrency?: number; // stay under the 40 requests/s account limit
  cache?: Map<string, Classification>; // keyed by normalized name
};

function isSection(value: string): value is Section {
  return (SECTION_ORDER as string[]).includes(value);
}

export function fromJevAnswer(raw: Answer | undefined): Classification | null {
  const answer = asChoice(raw);
  if (!answer || !isSection(answer.choice)) return null;
  return {
    section: answer.choice,
    isStaple: false, // staples are a fixed list in code (catalogue.ts)
    confidence: answer.confidence,
    source: "jev",
    needsReview: answer.confidence < CONFIDENCE_THRESHOLD,
  };
}

export function createJevClassifier({
  send,
  concurrency = 8,
  cache = new Map(),
}: JevClassifierOptions): ItemClassifier {
  async function classifyOne(name: string): Promise<Classification> {
    if (lookupCatalogue(name)) return classifyWithRules(name); // catalogue hit
    const key = normalizeName(name);
    const cached = cache.get(key);
    if (cached) return cached;
    try {
      const response = await send(singleItemRequest(name, SECTION_CRITERIA_V2));
      const result = fromJevAnswer(response.answers.section);
      if (!result) return classifyWithRules(name);
      cache.set(key, result);
      return result;
    } catch {
      // Error, timeout, or rate limit: answer from rules, do not cache.
      return classifyWithRules(name);
    }
  }

  return {
    async classify(names) {
      const unique = [...new Set(names)];
      const results: Record<string, Classification> = {};
      let next = 0;
      await Promise.all(
        Array.from({ length: Math.min(concurrency, unique.length) }, async () => {
          while (next < unique.length) {
            const name = unique[next++];
            results[name] = await classifyOne(name);
          }
        }),
      );
      return results;
    },
  };
}
