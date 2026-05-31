interface DemoControlsProps {
  // null = no demo override yet (home shows its default coach context).
  activeWeek: "week_1" | "week_3" | null;
  onSelect: (week: "week_1" | "week_3") => void;
}

// Prototype-only floating control (spec §3, §8). Toggles Week 1 (energy
// dragging) vs Week 3 (trending up) to demonstrate the felt-experience model
// adjusting over time. Hidden on mobile viewports. Removed before iOS port.
export default function DemoControls({ activeWeek, onSelect }: DemoControlsProps) {
  return (
    <div className="hidden sm:flex fixed bottom-4 right-4 z-50 items-center gap-1 bg-card border border-hairline rounded-full shadow-lg px-1 py-1">
      <span className="text-xs text-muted px-2 select-none">demo</span>
      <button
        type="button"
        onClick={() => onSelect("week_1")}
        className={`text-xs px-3 py-1 rounded-full ${
          activeWeek === "week_1" ? "bg-ink text-cream" : "text-ink"
        }`}
      >
        Week 1
      </button>
      <button
        type="button"
        onClick={() => onSelect("week_3")}
        className={`text-xs px-3 py-1 rounded-full ${
          activeWeek === "week_3" ? "bg-ink text-cream" : "text-ink"
        }`}
      >
        Week 3
      </button>
    </div>
  );
}

export type { DemoControlsProps };
