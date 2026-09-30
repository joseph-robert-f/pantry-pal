import { NextResponse } from "next/server";
import {
  createJevClassifier,
  rulesClassifier,
  type Classification,
  type ItemClassifier,
} from "@/lib/grocery";
import type { SystemOneRequest, SystemOneResponse } from "@/lib/grocery/jevQuestions";
import { clientKey, createRateLimiter } from "@/lib/rateLimit";

// POST /api/classify  { names: string[] } → { results: { [name]: Classification } }
//
// The only place the Jev key is used (plan §4 rule 1). With no key set, or if
// Jev fails, answers come from the keyword rules, so the route always works.
//
// Abuse guard (#J3b): a per-client limit returns 429; a per-instance Jev
// budget falls back to the rules instead, so real users still get an answer.

const ENDPOINT = "https://api.typesafe.ai/v1/systemone";
const TIMEOUT_MS = 1500;
const MAX_NAMES = 20;
const MAX_NAME_LENGTH = 80;

// Per server instance. Aisle answers are stable, so a process-lifetime cache
// is enough for the prototype.
const cache = new Map<string, Classification>();

// Per client: burst of 10, then 30 requests a minute.
const perClient = createRateLimiter({ capacity: 10, refillPerSec: 0.5 });
// Per instance: names sent to Jev, about half the 40 requests/s account limit.
const jevBudget = createRateLimiter({ capacity: 100, refillPerSec: 20, maxKeys: 1 });

function jevClassifier(apiKey: string): ItemClassifier {
  return createJevClassifier({
    cache,
    send: async (body: SystemOneRequest) => {
      const res = await fetch(ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(TIMEOUT_MS),
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`Jev ${res.status}`);
      return (await res.json()) as SystemOneResponse;
    },
  });
}

function parseNames(body: unknown): string[] | null {
  const names = (body as { names?: unknown })?.names;
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_NAMES) return null;
  const clean = names.map((n) => (typeof n === "string" ? n.trim() : ""));
  if (clean.some((n) => n.length === 0 || n.length > MAX_NAME_LENGTH)) return null;
  return clean;
}

export async function POST(request: Request) {
  const limited = perClient.take(clientKey(request.headers), Date.now());
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }

  const names = parseNames(await request.json().catch(() => null));
  if (!names) {
    return NextResponse.json(
      { error: `Send { names: string[] } with 1–${MAX_NAMES} names of 1–${MAX_NAME_LENGTH} characters.` },
      { status: 400 },
    );
  }
  const apiKey = process.env.TYPESAFE_API_KEY;
  const withinBudget = jevBudget.take("jev", Date.now(), names.length).ok;
  const classifier = apiKey && withinBudget ? jevClassifier(apiKey) : rulesClassifier;
  const results = await classifier.classify(names);
  return NextResponse.json({ results });
}
