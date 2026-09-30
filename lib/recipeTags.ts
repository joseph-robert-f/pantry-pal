import { STRINGS, type StringKey } from "./coachStrings.ts";
import type { Recipe } from "./seedData.ts";
import {
  DAY_TYPES,
  RECIPE_JUDGMENTS,
  bestDayType,
  recipeTags,
  type DayType,
  type JudgmentFile,
  type RecipeTag,
} from "./recipes/index.ts";

// Display labels for a recipe's tag pills (spec §7.3, #J4).

const TAG_LABEL: Record<RecipeTag, StringKey> = {
  quick: "recipe_tag_quick",
  high_protein: "recipe_tag_high_protein",
  carb_forward: "recipe_tag_carb_forward",
  one_pan: "recipe_tag_one_pan",
  good_leftovers: "recipe_tag_good_leftovers",
};

const DAY_LABEL: Record<DayType, StringKey> = {
  hard_day: "day_type_hard_day",
  lift_day: "day_type_lift_day",
  pre_long_run: "day_type_pre_long_run",
  rest_day: "day_type_rest_day",
  recovery_day: "day_type_recovery_day",
};

export type RecipePills = {
  trainingDay: string | null; // sage pill
  attributes: string[]; // neutral pills
};

// The founder's hand-written day tag wins: it is the plan's intent. Jev's
// best day fills in only for recipes without one (e.g. new recipes, #14).
export function recipePills(recipe: Recipe, judgments: JudgmentFile = RECIPE_JUDGMENTS): RecipePills {
  const handDay = DAY_TYPES.find((d) => recipe.tags.includes(d));
  const day = handDay ?? bestDayType(judgments, recipe.id);
  return {
    trainingDay: day ? STRINGS[DAY_LABEL[day]] : null,
    attributes: recipeTags(judgments, recipe).map((t) => STRINGS[TAG_LABEL[t]]),
  };
}
