import { codeTags } from "./facts.ts";
import { FIT_LEVELS } from "./jevRecipeQuestions.ts";
import {
  DAY_TYPES,
  type DayType,
  type JudgmentFile,
  type RecipeFacts,
  type RecipeTag,
} from "./types.ts";

// Code picks; Jev judges (#J4). Rankings, margins, and tag cutoffs are
// product rules in code, so they change without re-asking Jev.

// A swap must beat the current dinner by at least this much (0–1 scale,
// about half a rubric level) — no churn for a marginal gain.
export const MIN_SWAP_GAIN = 0.15;
// Jev tag probability needed to show a judged tag.
export const TAG_YES = 0.7;

export function fitFor(judgments: JudgmentFile, recipeId: string, day: DayType): number | null {
  const fit = judgments.recipes[recipeId]?.fit[day];
  return fit ? fit.score / (FIT_LEVELS - 1) : null;
}

// The day type a recipe suits best, or null without judgments.
export function bestDayType(judgments: JudgmentFile, recipeId: string): DayType | null {
  let best: DayType | null = null;
  let bestFit = -1;
  for (const day of DAY_TYPES) {
    const fit = fitFor(judgments, recipeId, day);
    if (fit !== null && fit > bestFit) {
      best = day;
      bestFit = fit;
    }
  }
  return best;
}

export function recipeTags(judgments: JudgmentFile, recipe: RecipeFacts): RecipeTag[] {
  const judged = judgments.recipes[recipe.id]?.tags;
  const tags: RecipeTag[] = codeTags(recipe);
  if (judged) {
    if (judged.one_pan >= TAG_YES) tags.push("one_pan");
    if (judged.good_leftovers >= TAG_YES) tags.push("good_leftovers");
  }
  return tags;
}

export type SwapSuggestion = { recipeId: string; fit: number; gain: number };

// Better dinners for `day` than `currentId`, best first. Only candidates
// that clear MIN_SWAP_GAIN are returned; an empty list means keep it.
export function rankSwaps(
  judgments: JudgmentFile,
  day: DayType,
  currentId: string,
  candidateIds: string[],
): SwapSuggestion[] {
  const current = fitFor(judgments, currentId, day);
  if (current === null) return [];
  return candidateIds
    .filter((id) => id !== currentId)
    .map((id) => ({ id, fit: fitFor(judgments, id, day) }))
    .filter((c): c is { id: string; fit: number } => c.fit !== null)
    .map((c) => ({ recipeId: c.id, fit: c.fit, gain: c.fit - current }))
    .filter((s) => s.gain >= MIN_SWAP_GAIN)
    .sort((a, b) => b.fit - a.fit || a.recipeId.localeCompare(b.recipeId));
}
