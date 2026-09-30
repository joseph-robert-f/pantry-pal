import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_GROCERY } from "./demoGrocery.ts";

// The demo week end to end: seed plan → engine → what /list renders.

test("diff banner comes from the engine and matches spec §7.4 text", () => {
  assert.ok(DEMO_GROCERY.diffBanner);
  const { trigger, items } = DEMO_GROCERY.diffBanner;
  assert.equal(`${trigger} + ${items.join(", ")}`, "Added Saturday long run: + bagels, bananas");
});

test("only the long-run items are marked new", () => {
  const newItems = DEMO_GROCERY.sections
    .flatMap((s) => s.items)
    .filter((i) => i.status === "new")
    .map((i) => i.name);
  assert.deepEqual(newItems.sort(), ["bagels", "bananas"]);
});

test("staples stay off the shopping list", () => {
  const names = DEMO_GROCERY.sections.flatMap((s) => s.items).map((i) => i.name);
  for (const staple of ["salt", "black pepper", "olive oil", "soy sauce"]) {
    assert.ok(!names.includes(staple), `${staple} should not be on the list`);
  }
  assert.ok(DEMO_GROCERY.staples.length > 0);
});

test("every item sits in a named section", () => {
  for (const section of DEMO_GROCERY.sections) {
    assert.ok(section.name.length > 0);
    assert.ok(section.items.length > 0);
  }
  const all = DEMO_GROCERY.sections.flatMap((s) => s.items);
  assert.equal(new Set(all.map((i) => i.id)).size, all.length, "no duplicate lines");
});

test("spec v0.2 §7.4: 5 section headers in store-walk order", () => {
  assert.deepEqual(
    DEMO_GROCERY.sections.map((s) => s.name),
    ["PRODUCE", "PROTEIN", "DAIRY", "BAKERY", "PANTRY"],
  );
});
