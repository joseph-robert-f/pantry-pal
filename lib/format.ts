import { STRINGS } from "./coachStrings";
import type { Macros } from "./seedData";

// Formats a recipe macro line via the catalogue template (spec §6).
// e.g. "45P · 52C · 18F · 540 cal · 30min"
export function formatMacroLine(macros: Macros, timeMin: number): string {
  return STRINGS.recipe_macros_format
    .replace("{p}", String(macros.protein))
    .replace("{c}", String(macros.carbs))
    .replace("{f}", String(macros.fat))
    .replace("{kcal}", String(macros.kcal))
    .replace("{min}", String(timeMin));
}
