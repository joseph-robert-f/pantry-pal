import { STRINGS, type StringKey } from "./coachStrings.ts";
import {
  DEMO_CHECKED_IDS,
  DEMO_PLAN,
  DEMO_PLAN_PREVIOUS,
  RECIPES,
  TRAINING_EVENTS,
} from "./seedData.ts";
import {
  SECTION_ORDER,
  buildGroceryList,
  classifyWithRules,
  describePlanChange,
  diffGroceryLists,
  groupBySection,
  lookupCatalogue,
  normalizeName,
  type Classification,
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
  needsReview?: boolean; // low-confidence aisle (#J3): shows "check aisle"
};

// A pantry staple held off the list (oil, salt, spices). Name only: recipe
// amounts like "7 tbsp" mean nothing when you buy a whole bottle.
export type StapleData = { id: string; name: string; section: Section };

export type GrocerySectionData = {
  section: Section;
  name: string; // display label from the string catalogue
  items: GroceryItemData[];
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
  sections: groupBySection(current.lines).map((group): GrocerySectionData => ({
    section: group.section,
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
  staples: current.staples.map(
    (line): StapleData => ({ id: line.id, name: line.name, section: line.section }),
  ),
};

// Add an item the user typed (#J3). Pure: returns new sections in store-walk
// order. An item already on the list (same canonical id) is not added twice.
export function addItemToSections(
  sections: GrocerySectionData[],
  text: string,
  classification: Classification,
): GrocerySectionData[] {
  const name = text.trim();
  const id = lookupCatalogue(name)?.id ?? `added:${normalizeName(name)}`;
  if (isOnList(sections, id)) return sections;

  return insertItem(sections, classification.section, {
    id,
    qty: "",
    name,
    checked: false,
    status: "new",
    needsReview: classification.needsReview,
  });
}

// The /list screen's editable state: the shopping list plus the staples still
// held back. One object, so every change updates both sides together.
export type ListState = { sections: GrocerySectionData[]; staples: StapleData[] };

// Move a staple the user is out of onto the list (#J1b), in its aisle,
// marked new. Pure. If the item is already on the list (typed earlier), it
// only leaves the staples group.
export function moveStapleToList(state: ListState, id: string): ListState {
  const staple = state.staples.find((s) => s.id === id);
  if (!staple) return state;
  const staples = state.staples.filter((s) => s.id !== id);
  if (isOnList(state.sections, id)) return { sections: state.sections, staples };
  return {
    sections: insertItem(state.sections, staple.section, {
      id: staple.id,
      qty: "",
      name: staple.name,
      checked: false,
      status: "new",
    }),
    staples,
  };
}

// Add a typed item (#J3) and drop it from the staples group if it was one.
export function addTypedItem(state: ListState, text: string, classification: Classification): ListState {
  const sections = addItemToSections(state.sections, text, classification);
  const id = lookupCatalogue(text.trim())?.id;
  return { sections, staples: id ? state.staples.filter((s) => s.id !== id) : state.staples };
}

function isOnList(sections: GrocerySectionData[], id: string): boolean {
  return sections.some((s) => s.items.some((i) => i.id === id));
}

function insertItem(
  sections: GrocerySectionData[],
  target: Section,
  item: GroceryItemData,
): GrocerySectionData[] {
  const exists = sections.some((s) => s.section === target);
  const next = exists
    ? sections.map((s) => (s.section === target ? { ...s, items: [...s.items, item] } : s))
    : [...sections, { section: target, name: STRINGS[SECTION_LABEL[target]], items: [item] }];
  return next.sort((a, b) => SECTION_ORDER.indexOf(a.section) - SECTION_ORDER.indexOf(b.section));
}
