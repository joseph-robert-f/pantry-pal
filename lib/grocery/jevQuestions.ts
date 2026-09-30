import { JEV_MODEL, type ChoiceQuestion, type SystemOneRequest } from "../jev/api.ts";
import type { Section } from "./types.ts";

export { JEV_MODEL };
export type {
  ChoiceAnswer,
  ChoiceQuestion,
  SystemOneRequest,
  SystemOneResponse,
} from "../jev/api.ts";

// Jev question definitions for grocery sections (plan #J2/#J3). Pure data so
// the eval script and the server route share one definition. No fetch here —
// the caller sends the request (API key stays server-side, plan §4 rule 1).

export type SectionCriteria = Record<Section, string>;

// v1: the wording from the 2026-09-30 live test.
export const SECTION_CRITERIA_V1: SectionCriteria = {
  PRODUCE: "Fresh fruit, vegetables, herbs",
  PROTEIN: "Raw meat, poultry, fish, seafood, tofu",
  DAIRY: "Milk, yogurt, cheese, butter, eggs, and plant-based milk and yogurt",
  BAKERY: "Bread, bagels, tortillas, baked goods",
  PANTRY: "Shelf-stable dry and canned goods, grains, pasta, oils, sauces",
  FROZEN: "Items sold frozen",
  SPICES: "Salt, pepper, dried herbs, spice blends",
  BEVERAGES: "Drinks other than milk",
  OTHER: "None of the above",
};

// v2: fixes the v1 eval misses by category, not by item. Jev reads criteria
// literally ("Raw meat" excluded deli turkey), so each option now names what
// it includes, and OTHER says what it is instead of "None of the above".
export const SECTION_CRITERIA_V2: SectionCriteria = {
  PRODUCE: "Fresh fruit, vegetables, and fresh herbs",
  PROTEIN: "Meat, poultry, fish, seafood, deli meats, tofu, and tempeh",
  DAIRY: "Milk, yogurt, cheese, butter, cream, eggs, and plant-based milk and yogurt",
  BAKERY: "Bread, bagels, tortillas, buns, and baked goods",
  PANTRY:
    "Shelf-stable food: grains, pasta, canned and dry goods, oils, sauces, condiments, snacks, nuts, nut butters, and protein powder or supplements",
  FROZEN: "Food sold frozen",
  SPICES: "Salt, pepper, dried herbs, spices, and seasoning blends",
  BEVERAGES: "Drinks other than milk, and coffee and tea",
  OTHER: "Non-food household items: cleaning supplies, paper goods, foil and food wraps, personal care, and pet supplies",
};

export const SECTION_CRITERIA: Record<string, SectionCriteria> = {
  v1: SECTION_CRITERIA_V1,
  v2: SECTION_CRITERIA_V2,
};

const INSTRUCTIONS = (path: string) =>
  `Which grocery store section sells ${path}?`;

// One item per request: the smallest possible state.
export function singleItemRequest(item: string, criteria: SectionCriteria): SystemOneRequest {
  return {
    model: JEV_MODEL,
    state: { item },
    questions: {
      section: { type: "choice", instructions: INSTRUCTIONS("`item`"), criteria },
    },
  };
}

// Many items per request: state billed once, one question per item.
// Answers come back as section_0 … section_{n-1}.
export function batchRequest(items: string[], criteria: SectionCriteria): SystemOneRequest {
  const questions: Record<string, ChoiceQuestion> = {};
  items.forEach((_, i) => {
    questions[`section_${i}`] = {
      type: "choice",
      instructions: INSTRUCTIONS(`\`items[${i}]\``),
      criteria,
    };
  });
  return { model: JEV_MODEL, state: { items }, questions };
}
