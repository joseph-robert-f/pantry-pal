import { Check } from "lucide-react";
import { STRINGS } from "@/lib/coachStrings";

interface GroceryItemProps {
  qty: string;
  name: string;
  checked: boolean;
  status?: "new" | null;
  onToggle: () => void;
}

// One grocery row (spec §7.4, §8). Checked = strikethrough + filled checkbox.
// status "new" = sage checkbox border + a "new" label on the right.
export default function GroceryItem({
  qty,
  name,
  checked,
  status,
  onToggle,
}: GroceryItemProps) {
  const isNew = status === "new";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={checked}
      className="w-full flex items-center gap-2 py-2 text-left"
    >
      <span
        className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
          checked
            ? "bg-ink border border-ink text-cream"
            : isNew
              ? "border-2 border-sage"
              : "border border-hairline"
        }`}
      >
        {checked ? <Check size={14} strokeWidth={3} /> : null}
      </span>
      <span
        className={`text-base flex-1 ${
          checked ? "line-through text-muted" : "text-ink"
        }`}
      >
        <span className="text-muted">{qty}</span> {name}
      </span>
      {isNew ? (
        <span className="text-xs text-sage font-semibold">{STRINGS.grocery_new_tag}</span>
      ) : null}
    </button>
  );
}

export type { GroceryItemProps };
