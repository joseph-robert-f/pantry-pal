import PhoneFrame from "@/components/PhoneFrame";
import BottomTabBar from "@/components/BottomTabBar";
import { STRINGS } from "@/lib/coachStrings";

// Coach stub (spec §7.6). Makes the tab bar feel complete without a live LLM.
export default function CoachPage() {
  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-2">
        <h1 className="text-lg font-semibold text-ink">{STRINGS.stub_coach_headline}</h1>
        <p className="text-sm text-muted max-w-[280px]">{STRINGS.stub_coach_sub}</p>
      </main>
      <BottomTabBar active="coach" />
    </PhoneFrame>
  );
}
