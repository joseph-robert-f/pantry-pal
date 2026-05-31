"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import PhoneFrame from "@/components/PhoneFrame";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import { STRINGS } from "@/lib/coachStrings";
import { getRecipe } from "@/lib/seedData";
import { formatMacroLine } from "@/lib/format";

const EQUIPMENT_TAGS = new Set(["oven", "stovetop"]);

function humanizeTag(tag: string): string {
  return tag.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

// Recipe detail (spec §7.3). Hero, macros, tags, ingredients (first 5 + expand),
// instructions, and the two primary CTAs. "Swap meal" routes to the paywall —
// the natural "I want to talk to the coach" moment.
export default function RecipePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const recipe = getRecipe(params.id);
  const [expanded, setExpanded] = useState(false);
  const [toastVisible, setToastVisible] = useState(false);

  if (!recipe) {
    return (
      <PhoneFrame>
        <main className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-2">
          <p className="text-lg font-semibold text-ink">
            {STRINGS.error_plan_generation_headline}
          </p>
          <p className="text-sm text-muted">{STRINGS.error_plan_generation_sub}</p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-4 text-sm text-terracotta underline"
          >
            Go back
          </button>
        </main>
      </PhoneFrame>
    );
  }

  const trainingTag = recipe.tags.find((t) => !EQUIPMENT_TAGS.has(t) && !/min$/.test(t));
  const equipmentTag = recipe.tags.find((t) => EQUIPMENT_TAGS.has(t));
  const visibleIngredients = expanded ? recipe.ingredients : recipe.ingredients.slice(0, 5);
  const hiddenCount = recipe.ingredients.length - 5;

  function handleCook() {
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2000);
  }

  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col overflow-y-auto">
        {/* Hero — bg-tan fallback with a subtle radial shape (spec §7.3). */}
        <div className="relative h-40 w-full bg-tan overflow-hidden shrink-0">
          <div className="absolute -top-10 -right-6 w-48 h-48 rounded-full bg-tan-soft opacity-40 blur-2xl" />
          <div className="absolute bottom-2 left-4 w-40 h-40 rounded-full bg-tan-deep opacity-20 blur-2xl" />
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Back"
            className="absolute top-3 left-3 text-white"
          >
            <ChevronLeft size={28} strokeWidth={2.25} />
          </button>
        </div>

        <div className="px-4 pt-4 pb-4 flex flex-col">
          <h1 className="text-lg font-bold text-ink">{recipe.title}</h1>
          <p className="mt-1 text-xs text-muted">
            {formatMacroLine(recipe.macros, recipe.timeMin)}
          </p>

          {/* Tag pills */}
          <div className="mt-2 flex gap-2 flex-wrap">
            {trainingTag ? (
              <span className="rounded-full px-3 py-1 text-xs bg-sage-soft text-sage-deep">
                {humanizeTag(trainingTag)}
              </span>
            ) : null}
            {equipmentTag ? (
              <span className="rounded-full px-3 py-1 text-xs bg-terracotta-soft text-terracotta-deep">
                {humanizeTag(equipmentTag)}
              </span>
            ) : null}
          </div>

          {/* Ingredients */}
          <h2 className="mt-8 text-sm font-semibold text-ink">
            {STRINGS.recipe_section_ingredients}
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {visibleIngredients.map((ing, i) => (
              <li key={i} className="text-base text-ink">
                <span className="text-muted">{ing.qty}</span> {ing.name}
              </li>
            ))}
          </ul>
          {!expanded && hiddenCount > 0 ? (
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="mt-1 self-start text-sm text-terracotta underline"
            >
              + {hiddenCount} more
            </button>
          ) : null}

          {/* Instructions */}
          <h2 className="mt-8 text-sm font-semibold text-ink">
            {STRINGS.recipe_section_instructions}
          </h2>
          <ol className="mt-2 flex flex-col gap-2 list-decimal list-inside">
            {recipe.instructions.map((step, i) => (
              <li key={i} className="text-sm text-ink">
                {step}
              </li>
            ))}
          </ol>

          {/* Bottom CTA row */}
          <div className="mt-8 flex gap-2">
            <div className="flex-1">
              <Button
                variant="secondary"
                label={STRINGS.recipe_button_swap}
                fullWidth
                onPress={() => router.push("/paywall")}
              />
            </div>
            <div className="flex-1">
              <Button
                variant="primary"
                label={STRINGS.recipe_button_cook}
                fullWidth
                onPress={handleCook}
              />
            </div>
          </div>
        </div>
      </main>

      <Toast message={STRINGS.recipe_cook_toast} visible={toastVisible} />
    </PhoneFrame>
  );
}
