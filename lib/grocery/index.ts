// Grocery engine (plan #J1): plan → merged, classified shopping list → diff.
export * from "./types.ts";
export { CATALOGUE, lookupCatalogue, normalizeName } from "./catalogue.ts";
export { parseQty, formatQty, mergeQtys } from "./quantity.ts";
export { classifyWithRules, rulesClassifier } from "./rulesClassifier.ts";
export { buildGroceryList, groupBySection, splitCompound } from "./buildList.ts";
export type { SectionGroup } from "./buildList.ts";
export { diffGroceryLists, describePlanChange } from "./diff.ts";
export type { GroceryDiff, PlanChange } from "./diff.ts";
