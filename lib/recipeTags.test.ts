import { test } from "node:test";
import assert from "node:assert/strict";
import { recipePills } from "./recipeTags.ts";
import { getRecipe } from "./seedData.ts";
import { RECIPE_JUDGMENTS } from "./recipes/index.ts";

test("the founder's day tag wins over Jev's best day", () => {
  // Jev's best day for this recipe is recovery_day; the founder tagged hard_day.
  const r = getRecipe("sheet_pan_chicken_sweet_potato")!;
  assert.equal(recipePills(r).trainingDay, "Hard day");
});

test("without a hand tag, Jev's best day fills in", () => {
  const r = { ...getRecipe("sheet_pan_chicken_sweet_potato")!, tags: ["oven"] };
  assert.equal(recipePills(r, RECIPE_JUDGMENTS).trainingDay, "Recovery day");
});

test("attribute pills combine code and Jev tags", () => {
  const r = getRecipe("sheet_pan_chicken_sweet_potato")!;
  assert.deepEqual(recipePills(r).attributes, ["High protein", "One pan", "Good leftovers"]);
});
