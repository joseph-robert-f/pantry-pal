import React from "react";

interface CoachBubbleProps {
  children: React.ReactNode;
  variant?: "sage" | "tan"; // sage default
  signature?: string; // optional italic line at bottom
}

// The coach's voice rendered as a soft bubble (spec §8). Used on onboarding and
// the plan home. Sage by default.
export default function CoachBubble({
  children,
  variant = "sage",
  signature,
}: CoachBubbleProps) {
  const tone =
    variant === "tan" ? "bg-tan-soft text-tan-deep" : "bg-sage-soft text-sage-deep";
  return (
    <div className={`rounded-2xl px-4 py-2 text-base ${tone}`}>
      <p>{children}</p>
      {signature ? (
        <p className="mt-1 text-sm italic text-muted">{signature}</p>
      ) : null}
    </div>
  );
}

export type { CoachBubbleProps };
