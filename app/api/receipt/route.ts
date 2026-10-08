import { NextResponse } from "next/server";
import { clientKey } from "@/lib/rateLimit";
import {
  RECEIPT_MAX_TEXT,
  matchReceipt,
  parseReceipt,
  summarizeReceipt,
  type ListItemRef,
} from "@/lib/receipt";
import { jevSendFromEnv, takeClientRequest } from "@/lib/server/jev";

// POST /api/receipt  { text: string, items: {id, name}[] } → ReceiptSummary
//
// Receipt pipeline step 1 (docs/receipt-pipeline-plan.md): code parses the
// receipt text, Jev matches each product line to a list item (v3: match +
// verify), code decides tick / ask / unmatched / ignore. Only product text
// reaches Jev. No key, or Jev down → rules answer (they can ask, never tick).

const MAX_TEXT = RECEIPT_MAX_TEXT;
const MAX_ITEMS = 100;
const MAX_LINES = 40;
const MAX_NAME_LENGTH = 80;
// Per-client cost: 1 unit per 5 product lines (min 1). The per-client bucket
// holds 10, so one visitor can send about one full receipt per burst.
const LINES_PER_UNIT = 5;
// Stay well inside a 10 s serverless limit; later lines are answered by rules.
const DEADLINE_MS = 7000;

function parseBody(body: unknown): { text: string; items: ListItemRef[] } | null {
  const { text, items } = (body ?? {}) as { text?: unknown; items?: unknown };
  if (typeof text !== "string" || text.trim().length === 0 || text.length > MAX_TEXT) return null;
  if (!Array.isArray(items) || items.length === 0 || items.length > MAX_ITEMS) return null;
  const clean: ListItemRef[] = [];
  for (const it of items) {
    const { id, name } = (it ?? {}) as { id?: unknown; name?: unknown };
    if (typeof id !== "string" || typeof name !== "string") return null;
    const n = name.trim();
    if (!id || !n || n.length > MAX_NAME_LENGTH) return null;
    clean.push({ id, name: n });
  }
  return { text, items: clean };
}

export async function POST(request: Request) {
  const started = Date.now();
  const body = parseBody(await request.json().catch(() => null));
  if (!body) {
    return NextResponse.json(
      { error: `Send { text, items: {id, name}[] }: text up to ${MAX_TEXT} characters, 1–${MAX_ITEMS} items.` },
      { status: 400 },
    );
  }
  const lines = parseReceipt(body.text).slice(0, MAX_LINES);
  const cost = Math.max(1, Math.ceil(lines.length / LINES_PER_UNIT));
  const limited = takeClientRequest(clientKey(request.headers), cost);
  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSec) } },
    );
  }
  const matches = await matchReceipt(lines, body.items, jevSendFromEnv("receipt"), {
    deadline: started + DEADLINE_MS,
  });
  return NextResponse.json(summarizeReceipt(matches, body.items));
}
