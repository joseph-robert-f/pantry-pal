interface MealCardProps {
  variant: "today" | "upcoming";
  title: string;
  macroLine: string;
  onPress: () => void;
}

// Meal card for the plan home (spec §7.2, §8). "today" is taller and terracotta;
// "upcoming" is shorter with a soft border.
export default function MealCard({ variant, title, macroLine, onPress }: MealCardProps) {
  const isToday = variant === "today";
  return (
    <button
      type="button"
      onClick={onPress}
      className={`w-full text-left rounded-2xl px-4 flex flex-col justify-center ${
        isToday
          ? "bg-terracotta-soft min-h-[68px] py-2"
          : "bg-cream border border-subtle min-h-[52px] py-2"
      }`}
    >
      <span
        className={`text-base font-semibold leading-tight ${
          isToday ? "text-terracotta-deep" : "text-ink"
        } line-clamp-2`}
      >
        {title}
      </span>
      <span className="text-xs text-muted mt-1">{macroLine}</span>
    </button>
  );
}

export type { MealCardProps };
