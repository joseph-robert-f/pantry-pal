import { ChevronDown, Plus } from "lucide-react";
import { STRINGS } from "@/lib/coachStrings";

interface StaplesGroupProps {
  staples: { id: string; name: string }[];
  expanded: boolean;
  onToggle: () => void;
  onPick: (id: string) => void; // user is out of this staple
}

// "Check you have" group under the grocery sections (#J1b). Staples the plan
// uses but most kitchens stock. Collapsed by default; tapping a staple moves
// it onto the list. Presentational only: the route file owns the state.
export default function StaplesGroup({ staples, expanded, onToggle, onPick }: StaplesGroupProps) {
  if (staples.length === 0) return null;
  return (
    <section className="mt-6 rounded-2xl border border-hairline">
      {/* Disclosure pattern: the heading wraps the button (a button may not contain a heading). */}
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls="staples-list"
          className="w-full min-h-11 flex items-center justify-between px-4 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wide"
        >
          {STRINGS.grocery_staples_title} ({staples.length})
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      {expanded ? (
        <div id="staples-list" className="px-4 pb-2">
          <p className="text-xs text-muted">{STRINGS.grocery_staples_hint}</p>
          <ul className="mt-1">
            {staples.map((s) => (
              <li key={s.id}>
                <button
                  type="button"
                  onClick={() => onPick(s.id)}
                  className="w-full min-h-9 flex items-center gap-2 py-1 text-left text-base text-ink"
                >
                  <Plus size={16} className="text-muted shrink-0" aria-hidden="true" />
                  {s.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}

export type { StaplesGroupProps };
