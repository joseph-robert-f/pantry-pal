---
title: Pantry Pal — Receipt and Pantry Image Pipeline Plan
plan_version: 0.1
status: approved — founder decisions made 2026-10-08 (section 7). Step 1 done.
owner: Joe Fehr
parent_spec: pantry_pal_web_prototype.spec.md (v0.2)
related: docs/jev-integration-plan.md
date: 2026-10-08
---

# Receipt and Pantry Image Pipeline

Use photos of receipts and pantry items to update the shopping list and the
pantry. Jev does the matching. A separate tool turns images into text.

## 1. Summary

- Jev accepts text only (TypeSafe docs, State page). Images go through OCR,
  a barcode lookup, or a vision model first.
- Code parses the text: lines, prices, quantities, weights. Code drops lines
  that are not products (TAX, TOTAL, card lines).
- Jev matches each product line to one item on the shopping list, or to
  "not on list". This is the "select instead of generate" pattern: Jev picks
  from options that code supplies, so it cannot invent an item.
- Code acts on the confidence: tick the item off, ask the user, or leave it
  unmatched.

## 2. Evidence (2026-10-08 live probe, `jev-1.13.0`)

16 receipt lines in OCR style, matched against the 23-item demo list plus
"not on list":

| Result | Value |
|---|---|
| Correct | 16 / 16 |
| Examples | "KS ORG BNLS SKNLS CHKN BRST" → chicken breast (1.00); "THMS EVRYTHNG BAGEL 6PK" → bagels (1.00); "GV DISH SOAP" → not on list (1.00); "LIMES 3 @ .33" → not on list (0.90, the list has lemons) |
| Cost | 8,798 input tokens ≈ $0.0004 |
| Time | 0.8 s for all 16 lines in parallel |

16 hand-written lines prove the approach, not the accuracy. Step 1 measures
the accuracy on a larger labeled set.

### Step 1 eval (2026-10-08) — full report: `eval/receipt/README.md`

| Version | Holdout accuracy | Wrong auto-ticks | Food check |
|---|---|---|---|
| v1 (one question) | 96.2% | 0 / 26 (3 / 77 on tuning) | 100% |
| **v3 (match + verify)** | **98.1%** | **0 / 25** (0 / 74 on tuning) | **100%** |

v1 ticked "made from" products (parmesan crisps → parmesan). v3 adds a
verify request (same product / related / different) only for picked lines.

## 3. Pipeline

```
 Photo ──► 1. Image to text ──► 2. Parse (code) ──► 3. Match (Jev) ──► 4. Act (code)
           (not Jev)            lines, prices,      line → list item    tick off, ask,
                                quantities          or "not on list"    or leave unmatched
```

### 3.1 Image to text (not Jev)

| Input | Source, in order |
|---|---|
| Receipt | iOS: Apple on-device text recognition (free, private). Web prototype: a cloud receipt OCR service. Both return text lines; receipt services also return line items with prices. |
| Pantry item | 1. Barcode → product database (for example Open Food Facts): exact name and category, no model. 2. OCR of the label (brand + product). 3. Vision model, only for items with no barcode or label (produce). |

### 3.2 Parse (code)

- Split the text into lines.
- Remove non-product lines with rules: totals, tax, payment, change, store
  header, dates, bag fees, coupons and savings.
- Attach continuation lines ("2 @ 0.99", "1.52 lb @ 3.49/lb") to the item
  above them.
- Pull the price, quantity, and weight out with patterns. Jev never does the
  arithmetic.
- Send Jev only the product text. The store name, card digits, and address
  stay out.

### 3.3 Match (Jev)

One request per product line (v3 adds a verify request for picked lines —
see section 2). Two questions on the same state:

- **Choice** `match`: which shopping-list item did this line buy? Options =
  the list's item names + `NONE` ("not on the list").
- **Noul** `is_food`: is this line a food or drink product? Separates dish
  soap (not on list, ignore) from a Clif bar (not on list, but food: offer
  to add).

For a list or catalogue too large for one Choice (255 options), code makes a
shortlist first (text similarity), or Jev picks the aisle first with the
existing section question. Then Jev picks within the shortlist.

### 3.4 Act (code)

| Jev result | App action |
|---|---|
| Item, confidence ≥ 0.90 | Tick the item off the list. |
| Item, confidence 0.70–0.90 | Ask: "Did you buy *item*?" |
| Item below 0.70, or `NONE` and food | "Not on your list" — the user can add it. |
| `NONE` and not food | Ignore (dish soap, bags). |

After the receipt: list items with no match show as "Still need".
The thresholds are a starting point. Step 1 sets them from the eval.

## 4. Steps

| Step | Work | Done when |
|---|---|---|
| **1. Receipt matching from text** ✅ done 2026-10-08 | `lib/receipt/` parser + matcher + resolver; `POST /api/receipt`; "Paste a receipt" panel on `/list`; labeled eval set + `scripts/eval-receipt.ts`. | Eval accuracy and thresholds recorded; pasted receipt ticks off the demo list in the browser. |
| 2. Image capture + OCR | Camera input on `/list`; server route sends the image to the OCR service; image discarded after OCR. | A photo of a real receipt ticks off the list. |
| 3. Pantry item photos | Barcode lookup, then label OCR, then vision fallback; match to the ingredient catalogue. | A photo of a pantry item adds the right catalogue item. |
| 4. Pantry inventory (Plus, H2) | Store scanned items; feed "Check you have". | Staples you own stop showing in "Check you have". |

## 5. Privacy

- Images are processed and discarded. Only matched items are kept.
- Jev receives product text only — no store, card, or address data.
- The OCR provider sees the image. Choose a provider with no training on
  customer data and short or zero retention (decision D9).

## 6. Risks

| Risk | Mitigation |
|---|---|
| OCR errors in line text | Jev reads abbreviations well (probe). Low confidence → ask the user. |
| Store-specific abbreviations | Eval set covers several store styles; add failing styles to the set. |
| Two lines for the same item | Code ticks an item once; quantities add up in code. |
| Cost | ~550 tokens per line ≈ $0.00002; a 40-line receipt ≈ $0.001. |
| Rate limit | Lines share the existing Jev budget and concurrency cap. |

## 7. Founder decisions (2026-10-08)

- **D9 — Image-to-text provider:** iOS app uses Apple on-device text
  recognition; web prototype uses a cloud receipt OCR service (chosen in
  step 2, before any image is sent).
- **D10 — Plus or free:** ticking off the shopping list from a receipt is
  free (core list loop). Adding scanned items to the pantry is Plus (pantry
  inventory is Plus, spec §11). *Claude's default; the founder accepted the
  recommendations without a specific answer here — confirm or change.*
- **D11 — Data:** images are processed and discarded; only matched items are
  kept.
- **D12 — Scope:** this adds the first non-Jev AI service (OCR/vision). Spec
  v0.3 records it when step 2 starts. Step 1 uses text only and needs no new
  service.
