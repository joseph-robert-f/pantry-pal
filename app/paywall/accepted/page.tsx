import Link from "next/link";
import PhoneFrame from "@/components/PhoneFrame";
import CoachBubble from "@/components/CoachBubble";
import { STRINGS } from "@/lib/coachStrings";

// Trial accepted state (spec §7.5). Coach acceptance in voice, then a link back
// to the plan. No card charged — prototype.
export default function PaywallAcceptedPage() {
  return (
    <PhoneFrame>
      <main className="flex-1 flex flex-col items-center justify-center px-8 text-center gap-4">
        <CoachBubble>{STRINGS.trial_accepted_headline}</CoachBubble>
        <p className="text-sm text-muted">{STRINGS.trial_accepted_sub}</p>
        <Link href="/plan" className="text-sm text-terracotta underline">
          Back to your plan
        </Link>
      </main>
    </PhoneFrame>
  );
}
