import type { LineMatch, ListItemRef } from "./match.ts";

// What the /list screen does with a matched receipt (plan §3.4). Pure.
export type ReceiptSummary = {
  tickIds: string[]; // tick these off automatically
  ask: { item: ListItemRef; lineText: string }[]; // "Did you buy …?"
  unmatched: string[]; // food lines not on the list (product text, no price)
  ignored: number; // non-food lines (soap, bags)
  stillNeed: ListItemRef[]; // list items no line matched
};

export function summarizeReceipt(matches: LineMatch[], items: ListItemRef[]): ReceiptSummary {
  const tick = new Set<string>();
  const askById = new Map<string, { item: ListItemRef; lineText: string }>();
  const unmatched: string[] = [];
  let ignored = 0;

  for (const m of matches) {
    if (m.action === "tick" && m.item) tick.add(m.item.id);
    else if (m.action === "ask" && m.item) {
      if (!askById.has(m.item.id)) askById.set(m.item.id, { item: m.item, lineText: m.line.text });
    } else if (m.action === "ignore") ignored++;
    else unmatched.push(m.line.text);
  }
  // An item ticked by one line does not also need a question from another.
  for (const id of tick) askById.delete(id);
  const touched = new Set([...tick, ...askById.keys()]);

  return {
    tickIds: [...tick],
    ask: [...askById.values()],
    unmatched,
    ignored,
    stillNeed: items.filter((it) => !touched.has(it.id)),
  };
}
