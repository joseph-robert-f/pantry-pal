import type { Section } from "./types.ts";

// Canonical ingredient catalogue. Acts as the classification cache (plan §4
// rule 5): a catalogue hit never reaches a classifier. Aliases are matched
// after normalizeName().

export type CatalogueEntry = {
  id: string;
  name: string; // display name on the list
  singular?: string; // shown instead of `name` when the quantity is exactly 1
  section: Section;
  staple?: boolean;
  aliases: string[];
};

// Fixed staples list. The live Jev test (plan §2) showed the "pantry staple"
// Noul question does not separate well, so staples are decided in code.
export const CATALOGUE: CatalogueEntry[] = [
  // Produce
  { id: "sweet_potato", name: "sweet potatoes", singular: "sweet potato", section: "PRODUCE", aliases: ["sweet potato", "sweet potatoes"] },
  { id: "lemon", name: "lemons", singular: "lemon", section: "PRODUCE", aliases: ["lemon", "lemons"] },
  { id: "parsley", name: "parsley", section: "PRODUCE", aliases: ["parsley", "fresh parsley"] },
  { id: "spinach", name: "spinach", section: "PRODUCE", aliases: ["spinach", "baby spinach"] },
  { id: "garlic", name: "garlic", section: "PRODUCE", aliases: ["garlic", "garlic cloves"] },
  { id: "cucumber", name: "cucumbers", singular: "cucumber", section: "PRODUCE", aliases: ["cucumber", "cucumbers"] },
  { id: "avocado", name: "avocados", singular: "avocado", section: "PRODUCE", aliases: ["avocado", "avocados"] },
  { id: "stir_fry_veg", name: "stir-fry vegetables", section: "PRODUCE", aliases: ["stir-fry vegetables", "stir fry vegetables"] },
  { id: "ginger", name: "ginger", section: "PRODUCE", aliases: ["ginger", "fresh ginger"] },
  { id: "basil", name: "basil", section: "PRODUCE", aliases: ["basil", "fresh basil"] },
  { id: "banana", name: "bananas", singular: "banana", section: "PRODUCE", aliases: ["banana", "bananas"] },
  // Protein
  { id: "chicken_thigh", name: "chicken thighs", singular: "chicken thigh", section: "PROTEIN", aliases: ["chicken thigh", "chicken thighs"] },
  { id: "chicken_breast", name: "chicken breast", section: "PROTEIN", aliases: ["chicken breast", "chicken breasts"] },
  { id: "salmon", name: "salmon filets", singular: "salmon filet", section: "PROTEIN", aliases: ["salmon", "salmon filet", "salmon filets", "salmon fillet", "salmon fillets"] },
  { id: "ground_beef", name: "ground beef", section: "PROTEIN", aliases: ["ground beef"] },
  // Dairy & eggs
  { id: "egg", name: "eggs", singular: "egg", section: "DAIRY", aliases: ["egg", "eggs"] },
  { id: "butter", name: "butter", section: "DAIRY", aliases: ["butter"] },
  { id: "parmesan", name: "parmesan", section: "DAIRY", aliases: ["parmesan", "parmigiano"] },
  // Bakery
  { id: "sourdough", name: "sourdough", section: "BAKERY", aliases: ["sourdough", "sourdough bread"] },
  { id: "bagel", name: "bagels", singular: "bagel", section: "BAKERY", aliases: ["bagel", "bagels"] },
  // Pantry
  { id: "rice", name: "rice", section: "PANTRY", aliases: ["rice", "white rice"] },
  { id: "pasta", name: "pasta", section: "PANTRY", aliases: ["pasta"] },
  { id: "marinara", name: "marinara", section: "PANTRY", aliases: ["marinara", "marinara sauce"] },
  { id: "olive_oil", name: "olive oil", section: "PANTRY", staple: true, aliases: ["olive oil"] },
  { id: "soy_sauce", name: "soy sauce", section: "PANTRY", staple: true, aliases: ["soy sauce"] },
  { id: "sesame_oil", name: "sesame oil", section: "PANTRY", staple: true, aliases: ["sesame oil"] },
  { id: "rice_vinegar", name: "rice vinegar", section: "PANTRY", staple: true, aliases: ["rice vinegar"] },
  // Spices
  { id: "salt", name: "salt", section: "SPICES", staple: true, aliases: ["salt", "kosher salt"] },
  { id: "pepper", name: "black pepper", section: "SPICES", staple: true, aliases: ["pepper", "black pepper"] },
  { id: "smoked_paprika", name: "smoked paprika", section: "SPICES", staple: true, aliases: ["smoked paprika", "paprika"] },
  { id: "garlic_powder", name: "garlic powder", section: "SPICES", staple: true, aliases: ["garlic powder"] },
  { id: "chili_flakes", name: "chili flakes", section: "SPICES", staple: true, aliases: ["chili flakes", "red pepper flakes"] },
];

// Lowercase, drop parentheticals ("rice (dry)" → "rice"), collapse spaces.
export function normalizeName(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const BY_ALIAS = new Map<string, CatalogueEntry>();
for (const entry of CATALOGUE) {
  for (const alias of entry.aliases) BY_ALIAS.set(normalizeName(alias), entry);
}

export function lookupCatalogue(name: string): CatalogueEntry | undefined {
  return BY_ALIAS.get(normalizeName(name));
}
