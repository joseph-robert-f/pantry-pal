import { lookupCatalogue, normalizeName } from "./catalogue.ts";
import type { Classification, ItemClassifier, Section } from "./types.ts";

// Keyword fallback for names not in the catalogue (plan §4 rule 3). No
// network. Jev replaces this for unknown names in #J3; this stays as the
// fallback when Jev errors, times out, or is rate-limited.

// First match wins, so specific rules sit above general ones.
const RULES: [RegExp, Section][] = [
  [/\bfrozen\b/, "FROZEN"],
  [/\bpeanut butter\b|\balmond butter\b/, "PANTRY"],
  [/\b(milk|yogh?urt|yog|cheese|butter|cream|eggs?|feta|mozzarella|cheddar|parmesan)\b/, "DAIRY"],
  [/\b(chicken|chx|beef|pork|turkey|steak|salmon|tuna|cod|shrimp|fish|tofu|tempeh|sausage|bacon|lamb)\b/, "PROTEIN"],
  [/\b(bread|bagels?|tortillas?|buns?|rolls?|sourdough|pita|naan|english muffins?)\b/, "BAKERY"],
  [/\b(salt|pepper|paprika|cumin|oregano|cinnamon|chili powder|garlic powder|onion powder|flakes|thyme|rosemary|turmeric)\b/, "SPICES"],
  [/\b(coffee|tea|juice|soda|sparkling|seltzer|kombucha|water|electrolytes?)\b/, "BEVERAGES"],
  [/\b(rice|pasta|noodles|oats?|flour|sugar|honey|oil|vinegar|sauce|marinara|salsa|broth|stock|beans|lentils|chickpeas|quinoa|granola|cereal|peanuts?|almonds|nuts|canned)\b/, "PANTRY"],
  [/\b(apples?|bananas?|berries|blueberries|strawberries|grapes|oranges?|lemons?|limes?|avocados?|tomatoes?|potatoes?|onions?|garlic|ginger|spinach|kale|lettuce|greens|carrots?|celery|broccoli|peppers|cucumbers?|zucchini|mushrooms?|herbs?|cilantro|parsley|basil|mint|scallions?)\b/, "PRODUCE"],
];

const RULE_CONFIDENCE = 0.6;

export function classifyWithRules(name: string): Classification {
  const hit = lookupCatalogue(name);
  if (hit) {
    return {
      section: hit.section,
      isStaple: hit.staple === true,
      confidence: 1,
      source: "catalogue",
      needsReview: false,
    };
  }
  const normalized = normalizeName(name);
  for (const [pattern, section] of RULES) {
    if (pattern.test(normalized)) {
      return { section, isStaple: false, confidence: RULE_CONFIDENCE, source: "rules", needsReview: false };
    }
  }
  return { section: "OTHER", isStaple: false, confidence: 0, source: "rules", needsReview: true };
}

export const rulesClassifier: ItemClassifier = {
  async classify(names) {
    return Object.fromEntries(names.map((n) => [n, classifyWithRules(n)]));
  },
};
