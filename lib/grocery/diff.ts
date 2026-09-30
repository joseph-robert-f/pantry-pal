import type { GroceryLine, GroceryList, PlanInput } from "./types.ts";

export type GroceryDiff = {
  added: GroceryLine[]; // in the new list's order
  removed: GroceryLine[]; // in the old list's order
  changed: { line: GroceryLine; previousQty: string }[];
};

// Compare two lists by canonical id. Staples are ignored: they are not on the
// shopping list, so a change there is not news to the user.
export function diffGroceryLists(previous: GroceryList, next: GroceryList): GroceryDiff {
  const prevById = new Map(previous.lines.map((l) => [l.id, l]));
  const nextIds = new Set(next.lines.map((l) => l.id));

  const added: GroceryLine[] = [];
  const changed: GroceryDiff["changed"] = [];
  for (const line of next.lines) {
    const before = prevById.get(line.id);
    if (!before) added.push(line);
    else if (before.qty !== line.qty) changed.push({ line, previousQty: before.qty });
  }
  const removed = previous.lines.filter((l) => !nextIds.has(l.id));
  return { added, removed, changed };
}

export type PlanChange = {
  addedEventIds: string[];
  removedEventIds: string[];
  addedRecipeIds: string[];
  removedRecipeIds: string[];
};

// What changed in the plan. The UI turns this into the diff banner trigger
// ("Added Saturday long run:") through the string catalogue.
export function describePlanChange(previous: PlanInput, next: PlanInput): PlanChange {
  const minus = (a: string[], b: string[]) => a.filter((x) => !b.includes(x));
  return {
    addedEventIds: minus(next.eventIds, previous.eventIds),
    removedEventIds: minus(previous.eventIds, next.eventIds),
    addedRecipeIds: minus(next.recipeIds, previous.recipeIds),
    removedRecipeIds: minus(previous.recipeIds, next.recipeIds),
  };
}
