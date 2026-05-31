"use client";

import { useState } from "react";
import PhoneFrame from "@/components/PhoneFrame";
import BottomTabBar from "@/components/BottomTabBar";
import GroceryItem from "@/components/GroceryItem";
import { STRINGS } from "@/lib/coachStrings";
import { DEMO_GROCERY } from "@/lib/seedData";

// Grocery list (spec §7.4). The diff-based list — the signature feature beyond
// meal planning. Shows the "Added Saturday long run" diff banner and per-section
// items with toggleable checkboxes.
export default function ListPage() {
  // Checkbox state lives here, keyed "sectionIndex-itemIndex". Not persisted.
  const [checked, setChecked] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    DEMO_GROCERY.sections.forEach((section, si) => {
      section.items.forEach((item, ii) => {
        initial[`${si}-${ii}`] = item.checked;
      });
    });
    return initial;
  });

  function toggle(key: string) {
    setChecked((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4 overflow-y-auto">
        <p className="text-xs text-muted">{STRINGS.grocery_subhead}</p>
        <h1 className="mt-1 text-xl font-bold text-ink">{STRINGS.grocery_title}</h1>

        {/* Diff banner */}
        <div className="mt-4 rounded-2xl bg-terracotta-soft text-terracotta-deep px-4 py-2">
          <p className="text-sm">{STRINGS.grocery_diff_banner_prefix}</p>
          <p className="text-sm font-semibold">
            + {DEMO_GROCERY.diffBanner.items.join(", ")}
          </p>
        </div>

        {/* Sections */}
        <div className="mt-4 flex flex-col gap-4">
          {DEMO_GROCERY.sections.map((section, si) => (
            <section key={section.name}>
              <h2 className="text-xs font-semibold text-muted uppercase tracking-wide">
                {section.name}
              </h2>
              <div className="mt-1">
                {section.items.map((item, ii) => {
                  const key = `${si}-${ii}`;
                  return (
                    <GroceryItem
                      key={key}
                      qty={item.qty}
                      name={item.name}
                      checked={checked[key]}
                      status={item.status}
                      onToggle={() => toggle(key)}
                    />
                  );
                })}
              </div>
            </section>
          ))}
        </div>

        {/* Instacart CTA (stubbed link — spec §7.4) */}
        <a
          href="https://www.instacart.com"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 h-9 w-full rounded-full bg-terracotta text-white font-semibold flex items-center justify-center"
        >
          {STRINGS.grocery_cta_instacart}
        </a>
      </main>

      <BottomTabBar active="list" />
    </PhoneFrame>
  );
}
