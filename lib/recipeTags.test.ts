import { test } from "node:test";
import assert from "node:assert/strict";
import { recipePills, swapHint } from "./recipeTags.ts";
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

test("swap hint: a hard-day dinner light on carbs points to the better hard-day dinner", () => {
  const hint = swapHint(getRecipe("ground_beef_stir_fry")!);
  assert.deepEqual(hint, {
    recipeId: "carb_forward_pasta",
    title: "Carb-forward chicken pasta",
    text: "Better fit for a hard day:",
  });
});

test("swap hint: no hint when the recipe is already the best fit for its day", () => {
  for (const id of ["monday_chicken", "salmon_bowls", "carb_forward_pasta", "weekend_recovery_eggs"]) {
    assert.equal(swapHint(getRecipe(id)!), null, id);
  }
});

test("swap hint: no hint without a day tag", () => {
  const r = { ...getRecipe("ground_beef_stir_fry")!, tags: ["stovetop"] };
  assert.equal(swapHint(r), null);
});
