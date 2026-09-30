import { test } from "node:test";
import assert from "node:assert/strict";
import { DEMO_GROCERY, addItemToSections, moveStapleToList } from "./demoGrocery.ts";

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

test("an added item lands in its section, marked new", () => {
  const out = addItemToSections(DEMO_GROCERY.sections, "tahini", {
    section: "PANTRY", isStaple: false, confidence: 0.97, source: "jev", needsReview: false,
  });
  const pantry = out.find((s) => s.section === "PANTRY");
  assert.equal(pantry?.items.at(-1)?.name, "tahini");
  assert.equal(pantry?.items.at(-1)?.status, "new");
});

test("an added item in a new section keeps store-walk order", () => {
  const out = addItemToSections(DEMO_GROCERY.sections, "egg bites", {
    section: "FROZEN", isStaple: false, confidence: 0.52, source: "jev", needsReview: true,
  });
  assert.deepEqual(out.map((s) => s.name), ["PRODUCE", "PROTEIN", "DAIRY", "BAKERY", "PANTRY", "FROZEN"]);
  assert.equal(out.at(-1)?.items[0].needsReview, true);
});

test("an item already on the list is not added twice", () => {
  const out = addItemToSections(DEMO_GROCERY.sections, "Bananas", {
    section: "PRODUCE", isStaple: false, confidence: 1, source: "catalogue", needsReview: false,
  });
  assert.equal(out, DEMO_GROCERY.sections);
});

test("staples are names only, grouped by their aisle", () => {
  const oil = DEMO_GROCERY.staples.find((s) => s.id === "olive_oil");
  assert.deepEqual(oil, { id: "olive_oil", name: "olive oil", section: "PANTRY" });
});

test("a picked staple moves onto the list in its aisle, marked new", () => {
  const out = moveStapleToList(DEMO_GROCERY.sections, DEMO_GROCERY.staples, "olive_oil");
  const pantry = out.sections.find((s) => s.section === "PANTRY");
  assert.deepEqual(pantry?.items.at(-1), { id: "olive_oil", qty: "", name: "olive oil", checked: false, status: "new" });
  assert.ok(!out.staples.some((s) => s.id === "olive_oil"));
  assert.equal(out.staples.length, DEMO_GROCERY.staples.length - 1);
});

test("a staple from an aisle not on the list opens that section in order", () => {
  const out = moveStapleToList(DEMO_GROCERY.sections, DEMO_GROCERY.staples, "salt");
  assert.deepEqual(out.sections.map((s) => s.name), ["PRODUCE", "PROTEIN", "DAIRY", "BAKERY", "PANTRY", "SPICES"]);
});

test("an unknown staple id changes nothing", () => {
  const out = moveStapleToList(DEMO_GROCERY.sections, DEMO_GROCERY.staples, "nope");
  assert.equal(out.sections, DEMO_GROCERY.sections);
  assert.equal(out.staples, DEMO_GROCERY.staples);
});
