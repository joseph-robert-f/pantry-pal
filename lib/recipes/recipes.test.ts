import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DAY_TYPES,
  MIN_SWAP_GAIN,
  RECIPE_JUDGMENTS,
  TAG_YES,
  bestDayType,
  codeTags,
  macroLevels,
  rankSwaps,
  recipeJudgmentRequest,
  recipeTags,
  type DayType,
  type JudgmentFile,
  type RecipeFacts,
} from "./index.ts";
import { RECIPES } from "../seedData.ts";

const facts = (over: Partial<RecipeFacts> = {}): RecipeFacts => ({
  id: "r",
  title: "Test",
  timeMin: 30,
  macros: { kcal: 600, protein: 30, carbs: 60, fat: 20 },
  ingredients: [{ qty: "1", name: "thing" }],
  instructions: ["Cook it."],
  ...over,
});

// Build a judgment file from { recipeId: { day: score0to3 } }.
function judgments(scores: Record<string, Partial<Record<DayType, number>>>, tags: Record<string, [number, number]> = {}): JudgmentFile {
  const recipes: JudgmentFile["recipes"] = {};
  for (const [id, byDay] of Object.entries(scores)) {
    const fit = Object.fromEntries(DAY_TYPES.map((d) => [d, { score: byDay[d] ?? 0, confidence: 1 }])) as JudgmentFile["recipes"][string]["fit"];
    const [onePan, leftovers] = tags[id] ?? [0, 0];
    recipes[id] = { fit, tags: { one_pan: onePan, good_leftovers: leftovers } };
  }
  return { model: "test", generated: "2026-09-30", recipes };
}

// --- numbers stay in code -------------------------------------------------

test("codeTags applies the numeric cutoffs", () => {
  assert.deepEqual(codeTags(facts({ timeMin: 20 })), ["quick"]); // 40% carbs: not carb-forward
  assert.deepEqual(codeTags(facts({ timeMin: 21, macros: { kcal: 600, protein: 40, carbs: 30, fat: 30 } })), ["high_protein"]);
  assert.deepEqual(codeTags(facts({ timeMin: 45, macros: { kcal: 640, protein: 30, carbs: 78, fat: 18 } })), ["carb_forward"]);
});

test("macroLevels turns grams into named levels", () => {
  assert.deepEqual(macroLevels(facts({ macros: { kcal: 430, protein: 42, carbs: 18, fat: 22 } })), {
    protein: "high",
    carbohydrate: "low",
    fat: "high",
  });
});

test("the Jev request sends named levels, not raw numbers", () => {
  const body = recipeJudgmentRequest(facts({ macros: { kcal: 617, protein: 33, carbs: 61, fat: 19 } }));
  const state = JSON.stringify(body.state);
  assert.ok(!/\b(617|33|61|19)\b/.test(state), state);
  const scores = Object.values(body.questions).filter((q) => q.type === "score");
  assert.equal(scores.length, DAY_TYPES.length);
  for (const q of scores) assert.equal((q.criteria as string[]).length, 4);
});

// --- ranking --------------------------------------------------------------

test("rankSwaps returns better candidates, best first", () => {
  const j = judgments({ cur: { rest_day: 1 }, a: { rest_day: 3 }, b: { rest_day: 2 }, c: { rest_day: 1.2 } });
  const out = rankSwaps(j, "rest_day", "cur", ["cur", "a", "b", "c"]);
  assert.deepEqual(out.map((s) => s.recipeId), ["a", "b"]); // c gains < MIN_SWAP_GAIN
  assert.ok(out.every((s) => s.gain >= MIN_SWAP_GAIN));
});

test("rankSwaps returns nothing when the current dinner is already best", () => {
  const j = judgments({ cur: { pre_long_run: 3 }, a: { pre_long_run: 2.9 } });
  assert.deepEqual(rankSwaps(j, "pre_long_run", "cur", ["a"]), []);
});

test("rankSwaps skips recipes without judgments", () => {
  const j = judgments({ cur: { lift_day: 0 } });
  assert.deepEqual(rankSwaps(j, "lift_day", "cur", ["unjudged"]), []);
  assert.deepEqual(rankSwaps(j, "lift_day", "unjudged", ["cur"]), []);
});

test("bestDayType picks the highest fit", () => {
  const j = judgments({ r: { hard_day: 1, pre_long_run: 2.8, rest_day: 0.2 } });
  assert.equal(bestDayType(j, "r"), "pre_long_run");
  assert.equal(bestDayType(j, "missing"), null);
});

test("judged tags show only at or above TAG_YES", () => {
  const j = judgments({ r: {} }, { r: [TAG_YES, TAG_YES - 0.01] });
  assert.deepEqual(recipeTags(j, facts({ id: "r", timeMin: 45, macros: { kcal: 600, protein: 20, carbs: 40, fat: 30 } })), ["one_pan"]);
});

// --- stored judgments -----------------------------------------------------

test("every seed recipe has stored judgments (re-run judge:recipes after editing RECIPES)", () => {
  for (const r of RECIPES) {
    assert.ok(RECIPE_JUDGMENTS.recipes[r.id], `missing judgments for ${r.id}`);
  }
});
