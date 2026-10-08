import { NextResponse } from "next/server";
import {
  createJevClassifier,
  rulesClassifier,
  type Classification,
} from "@/lib/grocery";
import { clientKey } from "@/lib/rateLimit";
import { jevSendFromEnv, takeClientRequest } from "@/lib/server/jev";

// POST /api/classify  { names: string[] } → { results: { [name]: Classification } }
//
// The only place the Jev key is used (plan §4 rule 1). With no key set, or if
// Jev fails, answers come from the keyword rules, so the route always works.
//
// Abuse guard (#J3b): a per-client limit returns 429. The Jev budget
// (lib/server/jev.ts, shared with /api/receipt) is charged per actual Jev
// call; over budget, that one name falls back to the rules.

const MAX_NAMES = 20;
const MAX_NAME_LENGTH = 80;

// Per server instance. Aisle answers are stable, so a process-lifetime cache
// is enough for the prototype.
const cache = new Map<string, Classification>();

function parseNames(body: unknown): string[] | null {
  const names = (body as { names?: unknown })?.names;
  if (!Array.isArray(names) || names.length === 0 || names.length > MAX_NAMES) return null;
  const clean = names.map((n) => (typeof n === "string" ? n.trim() : ""));
  if (clean.some((n) => n.length === 0 || n.length > MAX_NAME_LENGTH)) return null;
  return clean;
}

export async function POST(request: Request) {
  const limited = takeClientRequest(clientKey(request.headers));
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
  const send = jevSendFromEnv();
  const classifier = send ? createJevClassifier({ cache, send }) : rulesClassifier;
  const results = await classifier.classify(names);
  return NextResponse.json({ results });
}
