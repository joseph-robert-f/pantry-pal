import { useId } from "react";
import { ChevronDown } from "lucide-react";
import { STRINGS } from "@/lib/coachStrings";
import { RECEIPT_MAX_TEXT } from "@/lib/receipt/match";

interface ReceiptPanelProps {
  expanded: boolean;
  onToggle: () => void;
  text: string;
  onTextChange: (text: string) => void;
  onSample: () => void;
  onSubmit: () => void;
  pending: boolean;
  result: {
    tickedCount: number;
    ask: { id: string; name: string }[];
    unmatched: string[];
    stillNeed: string[];
  } | null;
  onAnswer: (id: string, bought: boolean) => void;
}

// "Paste a receipt" panel on /list (receipt pipeline step 1). Presentational
// only: the route file sends the text to /api/receipt and applies the result.
export default function ReceiptPanel({
  expanded,
  onToggle,
  text,
  onTextChange,
  onSample,
  onSubmit,
  pending,
  result,
  onAnswer,
}: ReceiptPanelProps) {
  const panelId = useId();
  const fieldId = useId();
  return (
    <section className="mt-4 rounded-2xl border border-hairline">
      <h2>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          aria-controls={panelId}
          className="w-full min-h-11 flex items-center justify-between px-4 py-2 text-left text-xs font-semibold text-muted uppercase tracking-wide"
        >
          {STRINGS.receipt_title}
          <ChevronDown
            size={16}
            aria-hidden="true"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          />
        </button>
      </h2>
      <div id={panelId} hidden={!expanded} className="px-4 pb-3">
        <label htmlFor={fieldId} className="sr-only">
          {STRINGS.receipt_label}
        </label>
        <textarea
          id={fieldId}
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          placeholder={STRINGS.receipt_placeholder}
          rows={5}
          maxLength={RECEIPT_MAX_TEXT}
          className="w-full rounded-2xl border border-hairline bg-card px-4 py-2 text-sm text-ink font-mono placeholder:text-muted placeholder:font-sans"
        />
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            onClick={onSubmit}
            disabled={pending || !text.trim()}
            className="h-9 rounded-full px-4 bg-ink text-cream font-semibold disabled:opacity-40"
          >
            {STRINGS.receipt_submit}
          </button>
          <button
            type="button"
            onClick={onSample}
            className="min-h-6 py-1 text-sm text-terracotta underline"
          >
            {STRINGS.receipt_sample}
          </button>
        </div>

        {result ? (
          <div className="mt-3 flex flex-col gap-2 text-sm text-ink" aria-live="polite">
            <p className="font-semibold">
              {STRINGS.receipt_ticked.replace("{n}", String(result.tickedCount))}
            </p>
            {result.ask.map((a) => (
              <div key={a.id} className="flex items-center gap-2">
                <span className="flex-1">{STRINGS.receipt_ask.replace("{item}", a.name)}</span>
                <button
                  type="button"
                  onClick={() => onAnswer(a.id, true)}
                  className="min-h-9 rounded-full px-3 border border-ink"
                >
                  {STRINGS.receipt_yes}
                </button>
                <button
                  type="button"
                  onClick={() => onAnswer(a.id, false)}
                  className="min-h-9 rounded-full px-3 border border-hairline text-muted"
                >
                  {STRINGS.receipt_no}
                </button>
              </div>
            ))}
            {result.unmatched.length ? (
              <p>
                <span className="text-muted">{STRINGS.receipt_unmatched}</span>{" "}
                {result.unmatched.join(", ")}
              </p>
            ) : null}
            {result.stillNeed.length ? (
              <p>
                <span className="text-muted">{STRINGS.receipt_still_need}</span>{" "}
                {result.stillNeed.join(", ")}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}

export type { ReceiptPanelProps };
