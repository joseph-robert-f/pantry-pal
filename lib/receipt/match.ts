import { asChoice, asNoul, asScore, JEV_MODEL, type JevTransport, type SystemOneRequest } from "../jev/api.ts";
import { lookupCatalogue, normalizeName } from "../grocery/catalogue.ts";
import type { ReceiptLine } from "./parse.ts";

// Match receipt lines to shopping-list items with Jev (plan §3.3–3.4). One
// request per line: a Choice over the list's item names + NONE, and a Noul
// "is this food". Code decides what to do with each answer.

export const NONE = "NONE";
// Starting thresholds (plan §3.4). The receipt eval sets the final values.
export const AUTO_TICK = 0.9;
export const ASK = 0.7;
export const IS_FOOD = 0.5;
// Longest pasted receipt the route accepts (shared with the text area).
export const RECEIPT_MAX_TEXT = 8000;

export type ListItemRef = { id: string; name: string };

export type LineAction = "tick" | "ask" | "unmatched" | "ignore";

export type LineMatch = {
  line: ReceiptLine;
  item: ListItemRef | null; // Jev's pick, if any (also set for "ask")
  confidence: number;
  isFood: number;
  action: LineAction;
  source: "jev" | "rules";
  verify?: number; // v3 verify score (0–2), when the verify request ran
};

const CONTEXT =
  "Grocery receipt lines use store abbreviations and can include brands, store brands, sizes, counts, weights, and prices.";

// v1: first wording (2026-10-08 eval: 3 wrong auto-ticks, all "made from"
// products: parmesan crisps → parmesan, garlic powder → garlic, egg whites →
// eggs; and dog food counted as food). Jev reads questions literally, so v2
// states the product boundary and "for people" explicitly. Examples are
// deliberately not from the eval sets.
const QUESTIONS = {
  v1: {
    match: "Which shopping-list item did `receipt_line` buy?",
    none: "Not on the shopping list: a different product, or not a grocery item",
    food: { instructions: "Is `receipt_line` a food or drink product?" },
  },
  v2: {
    match:
      "Which shopping-list item is `receipt_line` the same product as? Any brand, size, count, or variety of that item counts. A different product that is made from the item or flavored with it does not count (lemon juice is not lemons; onion powder is not onions; chicken broth is not chicken).",
    none:
      "None of the list items: a different product (including one made from or flavored with a list item), or not a grocery item",
    food: {
      instructions: "Is `receipt_line` food or drink for people?",
      criteria: {
        true: "Food or drink that people eat or drink",
        false: "Not for people to eat or drink: household goods, personal care, pet food, or other non-food items",
      },
    },
  },
} as const;

// v3 = v2 questions + a second request that verifies the picked item (the
// entity-alignment pattern from the TypeSafe docs). v2 alone still ticked
// "made from" products: a Choice over list items leans toward picking one.
export type ReceiptQuestionVersion = "v1" | "v2" | "v3";
export const RECEIPT_QUESTIONS: ReceiptQuestionVersion = "v3";

const VERIFY_LEVELS = [
  "Different product: not the shopping-list item",
  "Related but a different product: made from the item, flavored with it, a snack or sauce based on it, or a different cut or part",
  "Same product: the shopping-list item itself, in any brand, size, count, or variety",
];
// Score is 0–2; at or above this the pick is kept.
export const SAME_PRODUCT = 1.5;

export function verifyRequest(lineText: string, itemName: string): SystemOneRequest {
  return {
    model: JEV_MODEL,
    state: { receipt_line: lineText, shopping_list_item: itemName, note: CONTEXT },
    questions: {
      same: {
        type: "score",
        instructions: "How does the product bought on `receipt_line` relate to `shopping_list_item`?",
        criteria: VERIFY_LEVELS,
      },
    },
  };
}

export function receiptLineRequest(
  lineText: string,
  itemNames: string[],
  version: ReceiptQuestionVersion = RECEIPT_QUESTIONS,
): SystemOneRequest {
  const q = QUESTIONS[version === "v3" ? "v2" : version];
  const criteria: Record<string, string | null> = Object.fromEntries(itemNames.map((n) => [n, null]));
  criteria[NONE] = q.none;
  return {
    model: JEV_MODEL,
    state: { receipt_line: lineText, note: CONTEXT },
    questions: {
      match: { type: "choice", instructions: q.match, criteria },
      is_food: { type: "noul", ...q.food },
    },
  };
}

export function decide(itemPicked: boolean, confidence: number, isFood: number): LineAction {
  if (itemPicked && confidence >= AUTO_TICK) return "tick";
  if (itemPicked && confidence >= ASK) return "ask";
  // No usable pick: show food as "not on your list", ignore everything else.
  return isFood >= IS_FOOD ? "unmatched" : "ignore";
}

// Without Jev: a catalogue alias that equals a list item → ask (never tick).
function matchWithRules(line: ReceiptLine, items: ListItemRef[]): LineMatch {
  const words = normalizeName(line.text).split(" ");
  // Try the longest word runs first: "chicken breast" before "chicken".
  for (let len = Math.min(3, words.length); len >= 1; len--) {
    for (let i = 0; i + len <= words.length; i++) {
      const hit = lookupCatalogue(words.slice(i, i + len).join(" "));
      const item = hit && items.find((it) => it.id === hit.id);
      if (item) return { line, item, confidence: 0, isFood: 1, action: "ask", source: "rules" };
    }
  }
  return { line, item: null, confidence: 0, isFood: 1, action: "unmatched", source: "rules" };
}

export type ReceiptTransport = JevTransport;

export type MatchOptions = {
  concurrency?: number;
  version?: ReceiptQuestionVersion;
  // Lines not started by this time (ms since epoch) are answered by rules,
  // so a slow Jev day cannot push the route past its time limit.
  deadline?: number;
};

export async function matchReceipt(
  lines: ReceiptLine[],
  items: ListItemRef[],
  send: ReceiptTransport | null,
  { concurrency = 8, version = RECEIPT_QUESTIONS, deadline }: MatchOptions = {},
): Promise<LineMatch[]> {
  // Option keys must be unique; the first item with a name wins.
  const byName = new Map<string, ListItemRef>();
  for (const it of items) if (!byName.has(it.name)) byName.set(it.name, it);
  const names = [...byName.keys()];

  async function one(line: ReceiptLine): Promise<LineMatch> {
    if (!send || names.length === 0) return matchWithRules(line, items);
    if (deadline !== undefined && Date.now() > deadline) return matchWithRules(line, items);
    try {
      const res = await send(receiptLineRequest(line.text, names, version));
      const choice = asChoice(res.answers.match);
      const food = asNoul(res.answers.is_food);
      if (!choice || !food) return matchWithRules(line, items);
      let item = choice.choice === NONE ? null : byName.get(choice.choice) ?? null;
      let verify: number | undefined;
      // Second request (v3): is it the same product, or only made from it?
      // Only when the pick could act (tick or ask); below ASK it cannot.
      if (item && version === "v3" && choice.confidence >= ASK) {
        const verdict = asScore((await send(verifyRequest(line.text, item.name))).answers.same);
        verify = verdict?.score;
        if (!verdict || verdict.score < SAME_PRODUCT) item = null;
      }
      return {
        line,
        item,
        confidence: choice.confidence,
        isFood: food.noul,
        action: decide(item !== null, choice.confidence, food.noul),
        source: "jev",
        ...(verify === undefined ? {} : { verify }),
      };
    } catch {
      return matchWithRules(line, items);
    }
  }

  const out: LineMatch[] = new Array(lines.length);
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(concurrency, lines.length) }, async () => {
      while (next < lines.length) {
        const i = next++;
        out[i] = await one(lines[i]);
      }
    }),
  );
  return out;
}
