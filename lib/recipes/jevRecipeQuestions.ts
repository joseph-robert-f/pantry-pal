import { JEV_MODEL, type Question, type SystemOneRequest } from "../jev/api.ts";
import { cookTime, macroLevels } from "./facts.ts";
import type { DayType, JudgedTag, RecipeFacts } from "./types.ts";

// Jev questions for one recipe (#J4). One request per recipe: the recipe is
// the state; every question about it runs in parallel. Levels describe
// concrete meals and stand on their own (docs: primitives/score).

// Rubric version, stored with every judgment. v1-draft: Claude's first draft
// of sports-nutrition rules of thumb, accepted by the founder on 2026-09-30
// as a placeholder. To be replaced by a nutritionist-authored rubric (#J4b).
// DAY_CONTEXT (what each training day is) belongs to the trainer's workout
// logic (#J5). Change the version whenever DAY_CONTEXT, DAY_LEVELS, or
// TAG_QUESTIONS change, then re-run `npm run judge:recipes`.
export const RUBRIC_VERSION = "v1-draft";

const DAY_CONTEXT: Record<DayType, string> = {
  hard_day: "dinner after a very demanding training day, such as a heavy lifting session or hard intervals",
  lift_day: "dinner on a normal strength-training day",
  pre_long_run: "dinner the night before a long run",
  rest_day: "dinner on a rest day with no training",
  recovery_day: "dinner the day after a long run or race",
};

const DAY_LEVELS: Record<DayType, string[]> = {
  hard_day: [
    "Poor fit: little protein, or too little food to recover from a hard session",
    "Acceptable: some protein and carbohydrate, but light for a hard day",
    "Good: solid protein with a real carbohydrate portion",
    "Ideal: high protein and a generous carbohydrate portion to refuel a hard session",
  ],
  lift_day: [
    "Poor fit: low in protein",
    "Acceptable: moderate protein, but otherwise unbalanced",
    "Good: high protein with some carbohydrate",
    "Ideal: high protein, a moderate carbohydrate portion, and vegetables",
  ],
  pre_long_run: [
    "Works against the run: low in carbohydrate, or heavy, greasy, or very high in fiber",
    "Acceptable but not ideal: some carbohydrate, but also rich or high-fiber parts",
    "Good: carbohydrate-rich with moderate protein, and fairly easy to digest",
    "Ideal: carbohydrate is the main part of the meal, low in fat and fiber, simple and familiar",
  ],
  rest_day: [
    "Poor fit: a large, carbohydrate-heavy meal built to fuel hard training",
    "Acceptable: balanced, but heavier than a rest day needs",
    "Good: protein-forward with vegetables and a modest carbohydrate portion",
    "Ideal: lean protein and plenty of vegetables, light on carbohydrate, simple to make",
  ],
  recovery_day: [
    "Poor fit: a light, low-protein, or hard-to-eat meal after a long effort",
    "Acceptable: some protein and carbohydrate, but little else",
    "Good: protein, carbohydrate, and some fat to restore energy",
    "Ideal: an easy, comforting meal with protein, carbohydrate, and healthy fat that restores energy",
  ],
};

const TAG_QUESTIONS: Record<JudgedTag, Question> = {
  one_pan: {
    type: "noul",
    instructions: "Is `recipe` cooked in a single pan, pot, or sheet pan?",
    criteria: {
      true: "All cooking happens in one pan, pot, or sheet pan (a separate pot of rice or pasta counts as a second vessel)",
      false: "Needs two or more pans, pots, or appliances",
    },
  },
  good_leftovers: {
    type: "noul",
    instructions: "Would leftovers of `recipe` keep in the fridge and reheat well for lunch the next day?",
    criteria: {
      true: "Keeps 1–2 days and tastes good reheated or cold",
      false: "Best eaten fresh; gets soggy, dry, or unsafe when kept",
    },
  },
};

// The recipe as Jev sees it: names and method, with numbers as named levels.
export function recipeState(r: RecipeFacts) {
  return {
    recipe: {
      title: r.title,
      ingredients: r.ingredients.map((i) => i.name),
      method: r.instructions,
      cook_time: cookTime(r),
      per_serving: macroLevels(r),
    },
  };
}

export function fitQuestionId(day: DayType): string {
  return `fit_${day}`;
}

export function recipeJudgmentRequest(r: RecipeFacts): SystemOneRequest {
  const questions: Record<string, Question> = { ...TAG_QUESTIONS };
  for (const day of Object.keys(DAY_CONTEXT) as DayType[]) {
    questions[fitQuestionId(day)] = {
      type: "score",
      instructions: `How well does \`recipe\` suit ${DAY_CONTEXT[day]}?`,
      criteria: DAY_LEVELS[day],
    };
  }
  return { model: JEV_MODEL, state: recipeState(r), questions };
}

export const FIT_LEVELS = 4; // score range 0 … FIT_LEVELS-1
