interface ButtonProps {
  variant: "primary" | "secondary";
  label: string;
  fullWidth?: boolean;
  onPress: () => void;
}

// Primary = ink fill, cream text. Secondary = cream fill, ink border (spec §8).
export default function Button({
  variant,
  label,
  fullWidth,
  onPress,
}: ButtonProps) {
  const tone =
    variant === "primary"
      ? "bg-ink text-cream font-semibold"
      : "bg-cream border border-ink text-ink";
  return (
    <button
      type="button"
      onClick={onPress}
      className={`h-9 rounded-full px-4 text-base flex items-center justify-center ${tone} ${
        fullWidth ? "w-full" : ""
      }`}
    >
      {label}
    </button>
  );
}

export type { ButtonProps };
