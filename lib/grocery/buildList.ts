import { CATALOGUE, lookupCatalogue, normalizeName } from "./catalogue.ts";
import { mergeQtys } from "./quantity.ts";
import {
  SECTION_ORDER,
  type ClassifyFn,
  type GroceryLine,
  type GroceryList,
  type PlanInput,
  type PlanRecipe,
  type RawIngredient,
  type Section,
  type TrainingEvent,
} from "./types.ts";

// Recipes list some seasonings together: "salt & pepper",
// "smoked paprika, garlic powder". Split only when every part is a known
// ingredient, so a dish name like "mac and cheese" stays whole.
export function splitCompound(name: string): string[] {
  const parts = name.split(/\s*,\s*|\s+&\s+|\s+and\s+/).filter(Boolean);
  if (parts.length > 1 && parts.every((p) => lookupCatalogue(p))) return parts;
  return [name];
}

function collectIngredients(
  plan: PlanInput,
  recipes: PlanRecipe[],
  events: TrainingEvent[],
): RawIngredient[] {
  const out: RawIngredient[] = [];
  for (const id of plan.recipeIds) {
    const recipe = recipes.find((r) => r.id === id);
    if (recipe) out.push(...recipe.ingredients);
  }
  for (const id of plan.eventIds) {
    const event = events.find((e) => e.id === id);
    if (event) out.push(...event.addItems);
  }
  return out;
}

// Plan → shopping list. Deterministic: same plan in, same list out. The
// classifier only supplies a section for each name (plan §4).
export function buildGroceryList(
  plan: PlanInput,
  recipes: PlanRecipe[],
  events: TrainingEvent[],
  classify: ClassifyFn,
): GroceryList {
  const merged = new Map<string, { line: Omit<GroceryLine, "qty">; qtys: string[] }>();

  for (const ingredient of collectIngredients(plan, recipes, events)) {
    for (const part of splitCompound(ingredient.name)) {
      const entry = lookupCatalogue(part);
      const id = entry?.id ?? normalizeName(part);
      const existing = merged.get(id);
      if (existing) {
        existing.qtys.push(ingredient.qty);
        continue;
      }
      const classification = classify(part);
      merged.set(id, {
        line: {
          id,
          name: entry?.name ?? normalizeName(part),
          section: classification.section,
          classification,
        },
        qtys: [ingredient.qty],
      });
    }
  }

  const lines: GroceryLine[] = [];
  const staples: GroceryLine[] = [];
  for (const { line, qtys } of merged.values()) {
    const qty = mergeQtys(qtys);
    const singular = qty === "1" ? CATALOGUE.find((e) => e.id === line.id)?.singular : undefined;
    const full = { ...line, qty, name: singular ?? line.name };
    (line.classification.isStaple ? staples : lines).push(full);
  }
  return { lines, staples };
}

export type SectionGroup = { section: Section; lines: GroceryLine[] };

// Group lines in store-walk order and drop empty sections.
export function groupBySection(lines: GroceryLine[]): SectionGroup[] {
  return SECTION_ORDER.map((section) => ({
    section,
    lines: lines.filter((l) => l.section === section),
  })).filter((g) => g.lines.length > 0);
}
