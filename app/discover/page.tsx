import PhoneFrame from "@/components/PhoneFrame";
import BottomTabBar from "@/components/BottomTabBar";
import { STRINGS } from "@/lib/coachStrings";

// Discover stub (spec §7.6). Vetted brands live here later — walled off from the
// coach, always labeled. Coming with the App Store launch.
export default function DiscoverPage() {
  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-2">
        <h1 className="text-lg font-semibold text-ink">
          {STRINGS.stub_discover_headline}
        </h1>
        <p className="text-sm text-muted max-w-[280px]">{STRINGS.stub_discover_sub}</p>
      </main>
      <BottomTabBar active="discover" />
    </PhoneFrame>
  );
}
