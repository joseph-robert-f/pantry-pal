// Shared types for the grocery engine (plan §4). Pure data — no browser APIs,
// no fetch — so the engine ports to React Native and runs under `node --test`.

export type Section =
  | "PRODUCE"
  | "PROTEIN"
  | "DAIRY"
  | "BAKERY"
  | "PANTRY"
  | "FROZEN"
  | "SPICES"
  | "BEVERAGES"
  | "OTHER";

// Store-walk order. Empty sections are dropped when the list is grouped.
export const SECTION_ORDER: Section[] = [
  "PRODUCE",
  "PROTEIN",
  "DAIRY",
  "BAKERY",
  "PANTRY",
  "FROZEN",
  "SPICES",
  "BEVERAGES",
  "OTHER",
];

export type Classification = {
  section: Section;
  isStaple: boolean;
  confidence: number; // 0–1. 1.0 for catalogue hits.
  source: "catalogue" | "rules" | "jev";
  needsReview: boolean;
};

// Async so a network-backed classifier (Jev, plan §4 rule 3) fits the same
// slot. The rules classifier resolves immediately.
export interface ItemClassifier {
  classify(names: string[]): Promise<Record<string, Classification>>;
}

// Sync lookup used while building a list. Callers resolve unknown names
// through an ItemClassifier first, then pass a lookup over the results.
export type ClassifyFn = (name: string) => Classification;

export type RawIngredient = { qty: string; name: string };

export type PlanRecipe = { id: string; ingredients: RawIngredient[] };

// A non-recipe plan event that adds items, e.g. a Saturday long run adds
// pre-run fuel.
export type TrainingEvent = { id: string; addItems: RawIngredient[] };

export type PlanInput = {
  recipeIds: string[];
  eventIds: string[];
};

export type GroceryLine = {
  id: string; // canonical ingredient id — stable across rebuilds
  name: string; // display name
  qty: string; // merged, formatted quantity
  section: Section;
  classification: Classification;
};

export type GroceryList = {
  lines: GroceryLine[]; // shopping lines, in first-seen order
  staples: GroceryLine[]; // items the user likely has; kept out of `lines`
};
