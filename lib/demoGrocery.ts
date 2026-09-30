import { STRINGS, type StringKey } from "./coachStrings.ts";
import {
  DEMO_CHECKED_IDS,
  DEMO_PLAN,
  DEMO_PLAN_PREVIOUS,
  RECIPES,
  TRAINING_EVENTS,
} from "./seedData.ts";
import {
  buildGroceryList,
  classifyWithRules,
  describePlanChange,
  diffGroceryLists,
  groupBySection,
  type Section,
} from "./grocery/index.ts";

// The demo week's grocery list, built by the engine (plan #J1) instead of
// hand-written seed data. Same shape the /list page rendered before.

export type GroceryItemData = {
  id: string;
  qty: string;
  name: string;
  checked: boolean;
  status: "new" | null;
};

const SECTION_LABEL: Record<Section, StringKey> = {
  PRODUCE: "grocery_section_produce",
  PROTEIN: "grocery_section_protein",
  DAIRY: "grocery_section_dairy",
  BAKERY: "grocery_section_bakery",
  PANTRY: "grocery_section_pantry",
  FROZEN: "grocery_section_frozen",
  SPICES: "grocery_section_spices",
  BEVERAGES: "grocery_section_beverages",
  OTHER: "grocery_section_other",
};

// Banner prefix per plan event. Every visible string stays in the catalogue.
const EVENT_BANNER: Record<string, StringKey> = {
  sat_long_run: "grocery_diff_banner_prefix",
};

const previous = buildGroceryList(DEMO_PLAN_PREVIOUS, RECIPES, TRAINING_EVENTS, classifyWithRules);
const current = buildGroceryList(DEMO_PLAN, RECIPES, TRAINING_EVENTS, classifyWithRules);
const diff = diffGroceryLists(previous, current);
const change = describePlanChange(DEMO_PLAN_PREVIOUS, DEMO_PLAN);
const newIds = new Set(diff.added.map((l) => l.id));
const bannerKey = change.addedEventIds.map((id) => EVENT_BANNER[id]).find(Boolean);

export const DEMO_GROCERY = {
  // Null when the plan change has no banner string (nothing to announce).
  diffBanner:
    bannerKey && diff.added.length > 0
      ? { trigger: STRINGS[bannerKey], items: diff.added.map((l) => l.name) }
      : null,
  sections: groupBySection(current.lines).map((group) => ({
    name: STRINGS[SECTION_LABEL[group.section]],
    items: group.lines.map(
      (line): GroceryItemData => ({
        id: line.id,
        qty: line.qty,
        name: line.name,
        checked: DEMO_CHECKED_IDS.includes(line.id),
        status: newIds.has(line.id) ? "new" : null,
      }),
    ),
  })),
  staples: current.staples,
};
