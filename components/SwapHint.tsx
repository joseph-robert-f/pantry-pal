import { ChevronRight } from "lucide-react";

interface SwapHintProps {
  text: string; // e.g. "Better fit for a hard day:"
  title: string; // the suggested recipe
  onPress: () => void;
}

// A quieter swap suggestion under the recipe tags (#J4a). Presentational only:
// the route decides where a tap goes (the Plus paywall, spec §7.3).
export default function SwapHint({ text, title, onPress }: SwapHintProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      className="mt-3 w-full flex items-center gap-2 rounded-2xl bg-sage-soft px-4 py-2 text-left"
    >
      <span className="flex-1 text-sm text-sage-deep">
        {text} <span className="font-semibold">{title}</span>
      </span>
      <ChevronRight size={16} className="text-sage-deep shrink-0" />
    </button>
  );
}

export type { SwapHintProps };
