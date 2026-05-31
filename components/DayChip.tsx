interface DayChipProps {
  letter: string;
  isActive: boolean;
  onPress?: () => void;
}

// Single day chip in the week row (spec §7.2, §8). Active (today) = terracotta;
// inactive = cream with a hairline border.
export default function DayChip({ letter, isActive, onPress }: DayChipProps) {
  return (
    <button
      type="button"
      onClick={onPress}
      aria-pressed={isActive}
      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold ${
        isActive
          ? "bg-terracotta text-white"
          : "bg-cream border border-hairline text-ink"
      }`}
    >
      {letter}
    </button>
  );
}

export type { DayChipProps };
