// Quantity parsing and merging. Kept in code, never sent to Jev: TypeSafe's
// own docs say jev-1.13 does not do arithmetic reliably (plan §2).

export type Quantity =
  | { kind: "measured"; amount: number; unit: string } // unit "" = count
  | { kind: "text"; text: string }; // "handful", "to taste", "4-pack"

// Size words are descriptors, not units: "2 large" sweet potatoes is a count.
const DESCRIPTORS = new Set(["large", "medium", "small"]);
const UNIT_SINGULAR: Record<string, string> = {
  cups: "cup",
  cloves: "clove",
  slices: "slice",
  bags: "bag",
  "big bags": "big bag",
  lbs: "lb",
};
// Units shown without an "s" in the plural.
const NO_PLURAL = new Set(["lb", "oz", "tbsp", "tsp", ""]);

function parseAmount(token: string): number | null {
  const frac = token.match(/^(\d+)\/(\d+)$/);
  if (frac) return Number(frac[1]) / Number(frac[2]);
  return /^\d+(\.\d+)?$/.test(token) ? Number(token) : null;
}

export function parseQty(raw: string): Quantity {
  const text = raw.trim().replace(/\s+each$/, "");
  const match = text.match(/^(\S+)\s*(.*)$/);
  const amount = match ? parseAmount(match[1]) : null;
  if (match === null || amount === null) return { kind: "text", text };
  let unit = match[2].trim().toLowerCase();
  if (DESCRIPTORS.has(unit)) unit = "";
  unit = UNIT_SINGULAR[unit] ?? unit;
  return { kind: "measured", amount, unit };
}

function formatAmount(n: number): string {
  const whole = Math.floor(n);
  const rest = Math.round((n - whole) * 100) / 100;
  const frac: Record<number, string> = { 0.25: "1/4", 0.5: "1/2", 0.75: "3/4" };
  if (rest === 0) return String(whole);
  if (whole === 0 && frac[rest]) return frac[rest];
  return String(Math.round(n * 100) / 100);
}

export function formatQty(q: Quantity): string {
  if (q.kind === "text") return q.text;
  const unit = q.amount > 1 && !NO_PLURAL.has(q.unit) ? `${q.unit}s` : q.unit;
  return unit ? `${formatAmount(q.amount)} ${unit}` : formatAmount(q.amount);
}

// Sum amounts that share a unit. Keep anything else as separate parts, so
// "1 tbsp" + "handful" reads "1 tbsp + handful" instead of a wrong total.
export function mergeQtys(raws: string[]): string {
  const measured = new Map<string, number>();
  const texts: string[] = [];
  for (const raw of raws) {
    const q = parseQty(raw);
    if (q.kind === "measured") {
      measured.set(q.unit, (measured.get(q.unit) ?? 0) + q.amount);
    } else if (!texts.includes(q.text)) {
      texts.push(q.text);
    }
  }
  const parts = [...measured].map(([unit, amount]) =>
    formatQty({ kind: "measured", amount, unit }),
  );
  return [...parts, ...texts].join(" + ");
}
