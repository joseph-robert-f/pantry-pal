"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PhoneFrame from "@/components/PhoneFrame";
import BottomTabBar from "@/components/BottomTabBar";
import CoachBubble from "@/components/CoachBubble";
import MealCard from "@/components/MealCard";
import DayChip from "@/components/DayChip";
import DemoControls from "@/components/DemoControls";
import { STRINGS } from "@/lib/coachStrings";
import {
  DEMO_WEEK,
  DEMO_WEEKS,
  getRecipe,
  type DemoWeekKey,
} from "@/lib/seedData";
import { formatMacroLine } from "@/lib/format";

// Weekly plan home (spec §7.2). The Sunday-planning moment: coach context line,
// day chips, and the today/tomorrow meal stack. The demo toggle swaps the coach
// context to demonstrate the felt-experience model adjusting over weeks.
export default function PlanPage() {
  const router = useRouter();
  const [demoWeek, setDemoWeek] = useState<DemoWeekKey | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(
    DEMO_WEEK.days.findIndex((d) => d.isToday),
  );

  const coachContext = demoWeek
    ? DEMO_WEEKS[demoWeek].coachContext
    : STRINGS.home_coach_context;

  const todayDay = DEMO_WEEK.days.find((d) => d.isToday) ?? DEMO_WEEK.days[1];
  const todayIndex = DEMO_WEEK.days.findIndex((d) => d.isToday);
  const tomorrowDay = DEMO_WEEK.days[todayIndex + 1] ?? DEMO_WEEK.days[2];

  const todayRecipe = getRecipe(todayDay.dinner);
  const tomorrowRecipe = getRecipe(tomorrowDay.dinner);

  return (
    <>
      <PhoneFrame>
        <main className="flex-1 flex flex-col px-4 pt-4 pb-4 overflow-y-auto">
          <p className="text-xs text-muted">{STRINGS.home_week_label}</p>
          <h1 className="mt-1 text-xl font-bold text-ink">{STRINGS.home_title}</h1>

          <div className="mt-4">
            <CoachBubble>{coachContext}</CoachBubble>
          </div>

          {/* Day chip row */}
          <div className="mt-4 flex gap-2 justify-between">
            {DEMO_WEEK.days.map((d, i) => (
              <DayChip
                key={`${d.day}-${i}`}
                letter={d.day}
                isActive={i === selectedChip}
                onPress={() => setSelectedChip(i)}
              />
            ))}
          </div>

          {/* Today */}
          <p className="mt-8 text-xs font-semibold text-terracotta">
            {STRINGS.home_today_label}
          </p>
          <div className="mt-2">
            {todayRecipe ? (
              <MealCard
                variant="today"
                title={todayRecipe.title}
                macroLine={formatMacroLine(todayRecipe.macros, todayRecipe.timeMin)}
                onPress={() => router.push(`/recipe/${todayRecipe.id}`)}
              />
            ) : null}
          </div>

          {/* Tomorrow */}
          <p className="mt-8 text-xs font-semibold text-muted">
            {STRINGS.home_tomorrow_label}
          </p>
          <div className="mt-2">
            {tomorrowRecipe ? (
              <MealCard
                variant="upcoming"
                title={tomorrowRecipe.title}
                macroLine={formatMacroLine(
                  tomorrowRecipe.macros,
                  tomorrowRecipe.timeMin,
                )}
                onPress={() => router.push(`/recipe/${tomorrowRecipe.id}`)}
              />
            ) : null}
          </div>
        </main>

        <BottomTabBar active="plan" />
      </PhoneFrame>

      <DemoControls activeWeek={demoWeek} onSelect={setDemoWeek} />
    </>
  );
}
