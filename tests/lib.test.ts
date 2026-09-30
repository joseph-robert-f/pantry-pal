import { describe, expect, it } from "vitest";
import { formatMacroLine } from "@/lib/format";
import { DEMO_GROCERY, DEMO_WEEK, RECIPES, getRecipe } from "@/lib/seedData";

// Guards the seed data and helpers that every screen reads from.

describe("formatMacroLine", () => {
  it("fills the spec §6 template", () => {
    expect(
      formatMacroLine({ protein: 45, carbs: 52, fat: 18, kcal: 540 }, 30),
    ).toBe("45P · 52C · 18F · 540 cal · 30min");
  });
});

describe("getRecipe", () => {
  it("finds a recipe by id", () => {
    expect(getRecipe("sheet_pan_chicken_sweet_potato")?.title).toBe(
      "Sheet-pan chicken & sweet potatoes",
    );
  });

  it("returns undefined for an unknown id", () => {
    expect(getRecipe("does-not-exist")).toBeUndefined();
  });
});

describe("seed data integrity", () => {
  it("has unique recipe ids", () => {
    const ids = RECIPES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("links every plan day to a real recipe", () => {
    for (const day of DEMO_WEEK.days) {
      expect(getRecipe(day.dinner), `dinner "${day.dinner}"`).toBeDefined();
    }
  });

  it("marks exactly one plan day as today", () => {
    expect(DEMO_WEEK.days.filter((d) => d.isToday)).toHaveLength(1);
  });

  it("gives every recipe ingredients, steps, and non-negative macros", () => {
    for (const r of RECIPES) {
      expect(r.ingredients.length, r.id).toBeGreaterThan(0);
      expect(r.instructions.length, r.id).toBeGreaterThan(0);
      for (const v of Object.values(r.macros)) expect(v, r.id).toBeGreaterThanOrEqual(0);
    }
  });

  it("flags every diff-banner item as new on the grocery list", () => {
    const newItems = DEMO_GROCERY.sections
      .flatMap((s) => s.items)
      .filter((i) => i.status === "new")
      .map((i) => i.name);
    for (const item of DEMO_GROCERY.diffBanner.items) {
      expect(newItems.some((n) => n.includes(item.replace(/s$/, "")))).toBe(true);
    }
  });
});
