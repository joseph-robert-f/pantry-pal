import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildGroceryList,
  classifyWithRules,
  describePlanChange,
  diffGroceryLists,
  groupBySection,
  mergeQtys,
  parseQty,
  rulesClassifier,
  splitCompound,
  type PlanRecipe,
  type TrainingEvent,
} from "./index.ts";

// --- quantity -------------------------------------------------------------

test("parseQty reads amounts, fractions, units, and size words", () => {
  assert.deepEqual(parseQty("1.5 lb"), { kind: "measured", amount: 1.5, unit: "lb" });
  assert.deepEqual(parseQty("1/4 cup"), { kind: "measured", amount: 0.25, unit: "cup" });
  assert.deepEqual(parseQty("2 cups"), { kind: "measured", amount: 2, unit: "cup" });
  assert.deepEqual(parseQty("2 large"), { kind: "measured", amount: 2, unit: "" });
  assert.deepEqual(parseQty("1 tsp each"), { kind: "measured", amount: 1, unit: "tsp" });
  assert.deepEqual(parseQty("handful"), { kind: "text", text: "handful" });
  assert.deepEqual(parseQty("4-pack"), { kind: "text", text: "4-pack" });
});

test("mergeQtys sums same units and keeps different units apart", () => {
  assert.equal(mergeQtys(["1 lb", "1 lb"]), "2 lb");
  assert.equal(mergeQtys(["2 cloves", "2 cloves"]), "4 cloves");
  assert.equal(mergeQtys(["2", "1"]), "3");
  assert.equal(mergeQtys(["1/4 cup", "1/4 cup"]), "1/2 cup");
  assert.equal(mergeQtys(["1 tbsp", "handful"]), "1 tbsp + handful");
  assert.equal(mergeQtys(["to taste", "to taste"]), "to taste");
});

// --- classification -------------------------------------------------------

test("catalogue hits are certain and never need review", () => {
  const c = classifyWithRules("Salmon Fillets");
  assert.equal(c.section, "PROTEIN");
  assert.equal(c.source, "catalogue");
  assert.equal(c.confidence, 1);
});

test("rules classify unknown names, including messy input", () => {
  assert.equal(classifyWithRules("Greek yog").section, "DAIRY");
  assert.equal(classifyWithRules("chx thighs bnls").section, "PROTEIN");
  assert.equal(classifyWithRules("oat milk").section, "DAIRY");
  assert.equal(classifyWithRules("frozen peas").section, "FROZEN");
  assert.equal(classifyWithRules("peanut butter").section, "PANTRY");
  assert.equal(classifyWithRules("oat milk").source, "rules");
});

test("unmatched names go to OTHER and are flagged for review", () => {
  const c = classifyWithRules("dish soap");
  assert.equal(c.section, "OTHER");
  assert.equal(c.needsReview, true);
});

test("rulesClassifier satisfies the async ItemClassifier interface", async () => {
  const out = await rulesClassifier.classify(["bananas", "dish soap"]);
  assert.equal(out["bananas"].section, "PRODUCE");
  assert.equal(out["dish soap"].section, "OTHER");
});

test("splitCompound splits only when every part is known", () => {
  assert.deepEqual(splitCompound("salt & pepper"), ["salt", "pepper"]);
  assert.deepEqual(splitCompound("smoked paprika, garlic powder"), ["smoked paprika", "garlic powder"]);
  assert.deepEqual(splitCompound("mac and cheese"), ["mac and cheese"]);
});

// --- build + diff ---------------------------------------------------------

const RECIPES: PlanRecipe[] = [
  {
    id: "a",
    ingredients: [
      { qty: "1 lb", name: "chicken breast" },
      { qty: "1", name: "lemon" },
      { qty: "to taste", name: "salt & pepper" },
    ],
  },
  {
    id: "b",
    ingredients: [
      { qty: "1 lb", name: "chicken breast" },
      { qty: "1", name: "lemon" },
      { qty: "2 slices", name: "sourdough" },
    ],
  },
];
const EVENTS: TrainingEvent[] = [
  { id: "long_run", addItems: [{ qty: "4-pack", name: "bagels" }, { qty: "3", name: "bananas" }] },
];

test("buildGroceryList merges duplicates and holds back staples", () => {
  const list = buildGroceryList({ recipeIds: ["a", "b"], eventIds: [] }, RECIPES, EVENTS, classifyWithRules);
  const byId = Object.fromEntries(list.lines.map((l) => [l.id, l]));
  assert.equal(byId.chicken_breast.qty, "2 lb");
  assert.equal(byId.lemon.qty, "2");
  assert.equal(byId.lemon.name, "lemons");
  assert.equal(byId.salt, undefined);
  assert.deepEqual(list.staples.map((s) => s.id), ["salt", "pepper"]);
});

test("a count of exactly 1 uses the singular name", () => {
  const list = buildGroceryList({ recipeIds: ["a"], eventIds: [] }, RECIPES, EVENTS, classifyWithRules);
  assert.equal(list.lines.find((l) => l.id === "lemon")?.name, "lemon");
});

test("the same plan always builds the same list", () => {
  const plan = { recipeIds: ["a", "b"], eventIds: ["long_run"] };
  assert.deepEqual(
    buildGroceryList(plan, RECIPES, EVENTS, classifyWithRules),
    buildGroceryList(plan, RECIPES, EVENTS, classifyWithRules),
  );
});

test("groupBySection uses store-walk order and drops empty sections", () => {
  const list = buildGroceryList({ recipeIds: ["b"], eventIds: ["long_run"] }, RECIPES, EVENTS, classifyWithRules);
  assert.deepEqual(groupBySection(list.lines).map((g) => g.section), ["PRODUCE", "PROTEIN", "BAKERY"]);
});

test("adding an event shows only its items as added", () => {
  const before = buildGroceryList({ recipeIds: ["a"], eventIds: [] }, RECIPES, EVENTS, classifyWithRules);
  const after = buildGroceryList({ recipeIds: ["a"], eventIds: ["long_run"] }, RECIPES, EVENTS, classifyWithRules);
  const diff = diffGroceryLists(before, after);
  assert.deepEqual(diff.added.map((l) => l.name), ["bagels", "bananas"]);
  assert.deepEqual(diff.removed, []);
  assert.deepEqual(diff.changed, []);
});

test("removing a recipe reports removed items and changed quantities", () => {
  const before = buildGroceryList({ recipeIds: ["a", "b"], eventIds: [] }, RECIPES, EVENTS, classifyWithRules);
  const after = buildGroceryList({ recipeIds: ["a"], eventIds: [] }, RECIPES, EVENTS, classifyWithRules);
  const diff = diffGroceryLists(before, after);
  assert.deepEqual(diff.removed.map((l) => l.id), ["sourdough"]);
  assert.deepEqual(
    diff.changed.map((c) => [c.line.id, c.previousQty, c.line.qty]),
    [
      ["chicken_breast", "2 lb", "1 lb"],
      ["lemon", "2", "1"],
    ],
  );
});

test("describePlanChange names added and removed events and recipes", () => {
  const change = describePlanChange(
    { recipeIds: ["a", "b"], eventIds: [] },
    { recipeIds: ["a"], eventIds: ["long_run"] },
  );
  assert.deepEqual(change, {
    addedEventIds: ["long_run"],
    removedEventIds: [],
    addedRecipeIds: [],
    removedRecipeIds: ["b"],
  });
});
