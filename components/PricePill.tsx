interface PricePillProps {
  label: string;
  amount: string;
  unit: string;
  badge?: string; // e.g. "SAVE 34%"
  selected: boolean;
  onPress: () => void;
}

// A price box on the paywall (spec §7.5, §8). Selected = terracotta accent;
// unselected = cream with a hairline border.
export default function PricePill({
  label,
  amount,
  unit,
  badge,
  selected,
  onPress,
}: PricePillProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={selected}
      className={`flex-1 rounded-2xl px-4 py-4 text-left relative ${
        selected
          ? "bg-terracotta-soft border-2 border-terracotta"
          : "bg-cream border border-hairline"
      }`}
    >
      {badge ? (
        <span className="absolute -top-2 left-4 bg-terracotta-soft text-terracotta-deep text-xs font-semibold px-2 py-0.5 rounded-full border border-terracotta">
          {badge}
        </span>
      ) : null}
      <span
        className={`block text-sm ${selected ? "text-terracotta-deep" : "text-muted"}`}
      >
        {label}
      </span>
      <span
        className={`block text-xl font-bold ${
          selected ? "text-terracotta-deep" : "text-ink"
        }`}
      >
        {amount}
      </span>
      <span
        className={`block text-xs ${selected ? "text-terracotta-deep" : "text-muted"}`}
      >
        {unit}
      </span>
    </button>
  );
}

export type { PricePillProps };
