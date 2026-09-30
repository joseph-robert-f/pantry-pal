import { STRINGS } from "@/lib/coachStrings";

interface AddItemFormProps {
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
}

// Free-text "add an item" row for the grocery list (#J3). Presentational only:
// the route file classifies the item and adds it.
export default function AddItemForm({ value, pending, onChange, onSubmit }: AddItemFormProps) {
  return (
    <form
      className="mt-4 flex items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (value.trim() && !pending) onSubmit();
      }}
    >
      <label htmlFor="add-item" className="sr-only">
        {STRINGS.grocery_add_label}
      </label>
      <input
        id="add-item"
        type="text"
        value={value}
        maxLength={80}
        autoComplete="off"
        placeholder={STRINGS.grocery_add_placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 h-9 rounded-full border border-hairline bg-card px-4 text-base text-ink placeholder:text-muted"
      />
      <button
        type="submit"
        disabled={pending || !value.trim()}
        className="h-9 rounded-full px-4 bg-ink text-cream font-semibold disabled:opacity-40"
      >
        {STRINGS.grocery_add_button}
      </button>
    </form>
  );
}

export type { AddItemFormProps };
