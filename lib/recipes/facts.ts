import type { CodeTag, RecipeFacts } from "./types.ts";

// Numbers stay in code (TypeSafe jev-1.13 notes: no arithmetic; send named
// buckets, not raw values). These thresholds are product rules — tune here.

const QUICK_MAX_MIN = 20;
const HIGH_PROTEIN_MIN_G = 40;
const CARB_FORWARD_MIN_SHARE = 0.45; // share of calories from carbs

export type Level = "low" | "moderate" | "high";

function share(grams: number, kcalPerGram: number, kcal: number): number {
  return kcal > 0 ? (grams * kcalPerGram) / kcal : 0;
}

export function macroLevels(r: RecipeFacts): { protein: Level; carbohydrate: Level; fat: Level } {
  const { protein, carbs, fat, kcal } = r.macros;
  const carbShare = share(carbs, 4, kcal);
  const fatShare = share(fat, 9, kcal);
  return {
    protein: protein >= 40 ? "high" : protein >= 25 ? "moderate" : "low",
    carbohydrate: carbShare >= 0.45 ? "high" : carbShare >= 0.3 ? "moderate" : "low",
    fat: fatShare >= 0.4 ? "high" : fatShare >= 0.25 ? "moderate" : "low",
  };
}

export function cookTime(r: RecipeFacts): string {
  if (r.timeMin <= 15) return "about 15 minutes";
  if (r.timeMin <= 30) return "about 30 minutes";
  if (r.timeMin <= 60) return "about an hour";
  return "more than an hour";
}

export function codeTags(r: RecipeFacts): CodeTag[] {
  const tags: CodeTag[] = [];
  if (r.timeMin <= QUICK_MAX_MIN) tags.push("quick");
  if (r.macros.protein >= HIGH_PROTEIN_MIN_G) tags.push("high_protein");
  if (share(r.macros.carbs, 4, r.macros.kcal) >= CARB_FORWARD_MIN_SHARE) tags.push("carb_forward");
  return tags;
}
