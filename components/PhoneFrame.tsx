import React from "react";

interface PhoneFrameProps {
  children: React.ReactNode;
}

// Simulated iPhone frame centered on the page (spec §3). Honest about where the
// real product lives. Max-width 390px, device bezel, iOS status-bar pill.
export default function PhoneFrame({ children }: PhoneFrameProps) {
  return (
    <div className="min-h-screen bg-cream py-8 flex flex-col items-center justify-start">
      <div className="w-full max-w-frame bg-card rounded-2xl shadow-xl border border-hairline overflow-hidden min-h-[844px] relative flex flex-col">
        {/* iOS status bar simulation */}
        <div className="h-12 bg-card flex items-center justify-center shrink-0">
          <div className="w-16 h-1.5 bg-ink rounded-full" />
        </div>
        {children}
      </div>
      <footer className="max-w-frame mt-4 px-4 text-center text-xs text-muted">
        Pantry Pal — Prototype. Not a shipped product. © 2026 Joe Fehr.
        {process.env.NEXT_PUBLIC_PROTOTYPE_VERSION ? (
          <span> · v{process.env.NEXT_PUBLIC_PROTOTYPE_VERSION}</span>
        ) : null}
      </footer>
    </div>
  );
}

export type { PhoneFrameProps };
