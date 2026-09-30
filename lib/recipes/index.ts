// Recipe judgments (#J4): Jev judges fit and tags once per recipe (offline,
// scripts/judge-recipes.ts); code ranks swaps and derives tags at runtime.
export * from "./types.ts";
export { codeTags, macroLevels, cookTime } from "./facts.ts";
export { recipeJudgmentRequest, recipeState, fitQuestionId, FIT_LEVELS, RUBRIC_VERSION } from "./jevRecipeQuestions.ts";
export { bestDayType, fitFor, rankSwaps, recipeTags, MIN_SWAP_GAIN, TAG_YES } from "./swaps.ts";
export type { SwapSuggestion } from "./swaps.ts";
export { RECIPE_JUDGMENTS } from "./judgments.generated.ts";
