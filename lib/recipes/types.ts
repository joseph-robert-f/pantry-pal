// Recipe judgment types (#J4). Pure data — ports to React Native.

// Training-day types. Ids match the day tags the founder already uses in
// seed recipes, so the hand tags double as a sanity check for Jev.
export type DayType = "hard_day" | "lift_day" | "pre_long_run" | "rest_day" | "recovery_day";

export const DAY_TYPES: DayType[] = ["hard_day", "lift_day", "pre_long_run", "rest_day", "recovery_day"];

// Tags from the recipe's numbers — computed in code, never asked of Jev.
export type CodeTag = "quick" | "high_protein" | "carb_forward";
// Tags that need an understanding of the recipe — judged by Jev.
export type JudgedTag = "one_pan" | "good_leftovers";
export type RecipeTag = CodeTag | JudgedTag;

export type RecipeFacts = {
  id: string;
  title: string;
  timeMin: number;
  macros: { kcal: number; protein: number; carbs: number; fat: number };
  ingredients: { qty: string; name: string }[];
  instructions: string[];
};

// Stored Jev output for one recipe (lib/recipes/judgments.generated.ts).
export type RecipeJudgment = {
  fit: Record<DayType, { score: number; confidence: number }>; // score 0–3
  tags: Record<JudgedTag, number>; // probability of yes
};

export type JudgmentFile = {
  model: string;
  rubric: string; // RUBRIC_VERSION the judgments were made with
  generated: string;
  recipes: Record<string, RecipeJudgment>;
};
