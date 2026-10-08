// Receipt text → product lines (receipt pipeline step 1, plan §3.2). Code only:
// rules drop non-product lines and pull out prices, quantities, and weights.
// Jev never sees store, payment, or address lines.

export type ReceiptLine = {
  raw: string; // the line as received (for display)
  text: string; // product text sent to Jev: SKU and trailing price removed
  qty: number | null; // "3 @ .33" or a "2 @ 0.99" continuation
  weightLb: number | null; // "2.1LB @1.29" or a "1.52 lb @ 3.49/lb" continuation
  price: number | null; // line total, when printed
};

// Non-product lines (totals, payment, store info). Matching is careful not to
// drop real food: "KOOL-AID", "BALANCE BAR", "TOTAL CEREAL", "CASHEWS".
//
// 1. Always meta when the line STARTS with one of these.
const META_START = new RegExp(
  "^(" +
    [
      "SUB\\s*TOTAL", "TAX(ES|ABLE)?", "VISA", "MASTERCARD", "AMEX", "DISCOVER\\s+CARD",
      "DEBIT", "CREDIT", "EBT", "AUTH(ORIZATION)?", "APPROV(AL|ED)", "CASHIER", "REGISTER",
      "REG\\s*#", "TRANS(ACTION)?\\s*#", "MEMBER\\s*#", "THANK\\s+YOU", "RECEIPT", "TEL", "PHONE",
      "ITEMS?\\s+SOLD", "#\\s*ITEMS", "STORE\\s*#", "CHIP\\s+READ", "AID",
    ].join("|") +
    ")\\b",
  "i",
);
// 2. Meta when the line starts with one of these AND every other word is
//    receipt vocabulary ("BALANCE DUE" yes, "BALANCE BAR" no).
const META_IF_ONLY = new RegExp(
  "^(" +
    [
      "TOTAL", "BALANCE", "CHANGE", "CASH", "TENDER(ED)?", "SAVINGS", "YOU\\s+SAVED",
      "INSTANT\\s+SAVINGS", "MFR\\s+COUPON", "COUPON", "DISCOUNT", "BAG\\s+FEE",
      "BOTTLE\\s+DEP(OSIT)?", "CRV", "REWARDS", "POINTS",
    ].join("|") +
    ")\\b",
  "i",
);
const META_TAIL = new Set(
  ("DUE PAID AMOUNT AMT TENDERED BACK SOLD CODE NUMBER NO ID EARNED BALANCE TOTAL TAX " +
    "SAVINGS SALES STATE LOCAL RATE CARD ACCOUNT APPROVED PURCHASE CHIP READ MODE CASH " +
    "ITEMS YOU SAVED TODAY MFR INSTANT COUPON COUPONS DISCOUNT FEE BAG BAGS BOTTLE DEPOSIT " +
    "REWARDS POINTS MEMBER STORE OF THE ON YOUR ORDER").split(" "),
);
// 3. Meta anywhere in the line.
const META_ANYWHERE = /\bTHANK\s+YOU\b|\bWWW\.|\.COM\b|\bRETURN\s+POLICY\b|\bSURVEY\b/i;

function isMetaLine(line: string): boolean {
  if (META_START.test(line) || META_ANYWHERE.test(line)) return true;
  const m = line.match(META_IF_ONLY);
  if (!m) return false;
  const rest = line.slice(m[0].length).toUpperCase().match(/[A-Z]{2,}/g) ?? [];
  // Words with digits (amounts, codes) were already skipped by the pattern.
  return rest.every((w) => META_TAIL.has(w));
}

const DATE_OR_TIME = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b|\b\d{1,2}:\d{2}\b/;
const MASKED_CARD = /[*X]{4,}\s*\d{2,4}/i;
// "2 @ 0.99" or "2 @ 0.99 1.98" on its own line.
const QTY_CONTINUATION = /^(\d+)\s*@\s*\$?(\d*\.\d{2})(\s+\$?(\d+\.\d{2}))?\s*$/;
// "1.52 lb @ 3.49/lb 5.30" on its own line.
const WEIGHT_CONTINUATION = /^(\d+(?:\.\d+)?)\s*(lb|lbs|kg)\s*@\s*\$?(\d*\.\d{2})(?:\s*\/\s*(?:lb|kg))?(\s+\$?(\d+\.\d{2}))?\s*$/i;
// Trailing line total, with an optional tax flag: "4.99", "$4.99 F", "4.99 n".
const TRAILING_PRICE = /\s+\$?(-?\d+\.\d{2})(\s+[A-Za-z]{1,2})?\s*$/;
const LEADING_SKU = /^\d{4,}\s+/;
const INLINE_QTY = /\b(\d+)\s*@\s*\$?(\d*\.\d{2})\b/;
const INLINE_WEIGHT = /\b(\d+(?:\.\d+)?)\s*(LB|LBS|KG)\b/i;

function toLb(value: number, unit: string): number {
  return /kg/i.test(unit) ? Math.round(value * 2.20462 * 100) / 100 : value;
}

export function parseReceipt(input: string): ReceiptLine[] {
  const out: ReceiptLine[] = [];
  for (const rawLine of input.split(/\r?\n/)) {
    const raw = rawLine.replace(/\s+/g, " ").trim();
    if (!raw) continue;

    const qtyCont = raw.match(QTY_CONTINUATION);
    if (qtyCont) {
      const prev = out.at(-1);
      if (prev) {
        prev.qty = Number(qtyCont[1]);
        if (qtyCont[4]) prev.price = Number(qtyCont[4]);
      }
      continue;
    }
    const weightCont = raw.match(WEIGHT_CONTINUATION);
    if (weightCont) {
      const prev = out.at(-1);
      if (prev) {
        prev.weightLb = toLb(Number(weightCont[1]), weightCont[2]);
        if (weightCont[5]) prev.price = Number(weightCont[5]);
      }
      continue;
    }

    if (!/[A-Za-z]{2,}/.test(raw)) continue; // no words: prices, barcodes, separators
    if (isMetaLine(raw) || DATE_OR_TIME.test(raw) || MASKED_CARD.test(raw)) continue;

    let text = raw.replace(LEADING_SKU, "");
    let price: number | null = null;
    const trailing = text.match(TRAILING_PRICE);
    if (trailing) {
      price = Number(trailing[1]);
      if (price < 0) continue; // negative line: a discount or coupon
      text = text.slice(0, trailing.index).trim();
    }
    if (!/[A-Za-z]{2,}/.test(text)) continue;

    const q = text.match(INLINE_QTY);
    const w = text.match(INLINE_WEIGHT);
    out.push({
      raw,
      text,
      qty: q ? Number(q[1]) : null,
      weightLb: w ? toLb(Number(w[1]), w[2]) : null,
      price,
    });
  }
  // Header: lines before the first line with item evidence (a price, or a
  // quantity or weight from a continuation line) are the store name and
  // address. Drop them so store details never reach Jev. With no evidence at
  // all (prices lost in OCR), keep every line.
  const first = out.findIndex((l) => l.price !== null || l.qty !== null || l.weightLb !== null);
  return first > 0 ? out.slice(first) : out;
}
