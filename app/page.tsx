"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PhoneFrame from "@/components/PhoneFrame";
import CoachBubble from "@/components/CoachBubble";
import Button from "@/components/Button";
import { STRINGS } from "@/lib/coachStrings";

const PILL_OPTIONS = [
  { key: "lift_3", label: STRINGS.onboarding_option_lift_3 },
  { key: "lift_4", label: STRINGS.onboarding_option_lift_4 },
  { key: "lift_5", label: STRINGS.onboarding_option_lift_5 },
  { key: "cardio", label: STRINGS.onboarding_option_cardio },
  { key: "long_run", label: STRINGS.onboarding_option_long_run },
];

// Onboarding (spec §7.1). Shows the coach voice in its most charged moment.
// "Lift 4x" is preselected to demonstrate the flow. On Continue, persists the
// onboarding flag and routes to /plan. Returning visitors skip straight to /plan.
export default function OnboardingPage() {
  const router = useRouter();
  const [checkedFlag, setCheckedFlag] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(["lift_4"]));

  useEffect(() => {
    if (typeof window !== "undefined" && localStorage.getItem("pp_onboarded") === "true") {
      router.replace("/plan");
    } else {
      setCheckedFlag(true);
    }
  }, [router]);

  function togglePill(key: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  function handleContinue() {
    if (typeof window !== "undefined") {
      localStorage.setItem("pp_onboarded", "true");
    }
    router.push("/plan");
  }

  // Avoid a flash of onboarding for returning visitors before the redirect runs.
  if (!checkedFlag) {
    return <PhoneFrame>{null}</PhoneFrame>;
  }

  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col px-4 pt-4 pb-4">
        <p className="text-xs text-muted">{STRINGS.onboarding_eyebrow}</p>

        {/* Progress bar: 240px wide, first 120px terracotta. */}
        <div
          className="mt-2 h-[3px] w-[240px] rounded-full bg-subtle overflow-hidden"
          role="progressbar"
          aria-valuenow={2}
          aria-valuemin={1}
          aria-valuemax={5}
          aria-label={STRINGS.onboarding_eyebrow}
        >
          <div className="h-full w-[120px] bg-terracotta rounded-full" />
        </div>

        <h1 className="mt-8 text-lg font-semibold text-ink">{STRINGS.onboarding_q1}</h1>
        <p className="mt-2 text-sm text-muted">{STRINGS.onboarding_q1_sub}</p>

        <div className="mt-4 flex flex-wrap gap-2">
          {PILL_OPTIONS.map(({ key, label }) => {
            const active = selected.has(key);
            return (
              <button
                key={key}
                type="button"
                onClick={() => togglePill(key)}
                aria-pressed={active}
                className={`rounded-full px-4 py-2 text-sm ${
                  active
                    ? "bg-terracotta text-white"
                    : "bg-cream border border-hairline text-ink"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <div className="mt-8">
          <CoachBubble signature={STRINGS.onboarding_coach_signature}>
            {STRINGS.onboarding_coach_response}
          </CoachBubble>
        </div>

        <div className="mt-auto pt-8">
          <Button
            variant="primary"
            label={STRINGS.onboarding_cta}
            fullWidth
            onPress={handleContinue}
          />
        </div>
      </main>
    </PhoneFrame>
  );
}
