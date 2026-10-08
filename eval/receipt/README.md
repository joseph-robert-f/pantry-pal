# Receipt line matching eval (receipt pipeline step 1)

Measures how well Jev matches receipt lines (OCR-style text) to items on the
shopping list, before the feature ticks anything off for users. Results from
`jev-1.13.0` on 2026-10-08. Plan: `docs/receipt-pipeline-plan.md`.

## Run it

```bash
npm run eval:receipt                          # tuning set, replays cache
npm run eval:receipt -- --dataset holdout
npm run eval:receipt -- --questions v1        # an older question wording
npm run eval:receipt -- --live                # new API calls
```

- `lines.jsonl` — 118 labeled lines (tuning). Store styles: Costco (KS),
  Walmart (GV), Trader Joe's, Kroger, Whole Foods (365), Safeway, Target, Aldi.
  Includes near-misses that share words with list items (avocado oil, butter
  lettuce, banana bread, lemonade, garlic powder, parmesan crisps) and
  non-food items.
- `holdout.jsonl` — 52 new lines, written before any run, used once per
  question version.
- `accept` lists every acceptable answer; `NONE` = not on the list.
- List = the 23 items of the demo grocery list. Questions:
  `lib/receipt/match.ts`.

## Results

"Accuracy" scores the app's outcome per line: tick or ask the right item,
or leave the line off the list. The eval runs the production `matchReceipt`
with the cached Jev client as its transport.

| Version | Set | Accuracy | Wrong auto-ticks (≥ 0.90) | Auto-tick coverage | Food check |
|---|---|---|---|---|---|
| v1 — "which list item did the line buy" | tuning | 95.8% | 3 / 77 | 96.1% | 97.6% |
| v2 — product boundary in the wording | tuning | 94.1% | 3 / 79 | 98.7% | 100% |
| **v3 — v2 + verify request** | tuning | **98.3%** | **0 / 74** | 96.1% | **100%** |
| v1 | holdout | 96.2% | 0 / 26 | 92.9% | 100% |
| **v3** | holdout | **98.1%** | **0 / 25** | 89.3% | **100%** |

### What changed

- **v1 errors were "made from" products:** parmesan crisps → parmesan, garlic
  powder → garlic, egg whites → eggs (all auto-ticked), and "dog food" counted
  as food. Jev reads the question literally: "did the line buy" lets a
  product that contains the item count.
- **v2** states the boundary ("same product, any brand/size/variety; a
  product made from or flavored with it does not count") and asks for food
  "for people". The food check reached 100%, but the wrong ticks stayed: a
  Choice over list items leans toward picking one.
- **v3** adds a second request only when an item is picked: a Score —
  different product / related but different (made from, flavored with) /
  same product (the entity-alignment pattern in the TypeSafe docs). Below
  1.5 the pick becomes "not on list". Zero wrong ticks on both sets.

### Remaining misses (all safe: they fall to "not on your list")

- "BOUDIN SOURDOUGH" — verify scored 1.13 (related, not same).
- "CUKES ORG 2CT", "PERSIAN CUKES 6CT" — "cukes" is not read as cucumber.
  Next: give each list option its catalogue aliases as the Choice
  description.

## Decisions

1. **Use v3** (match + verify). Verify runs only when the pick could act
   (confidence ≥ 0.70). Cost: ~1.7 Jev calls per line ≈ $0.00004;
   a 40-line receipt ≈ $0.002 and ~1 s.
2. **Keep AUTO_TICK 0.90, ASK 0.70.** v3 made no wrong ticks at any
   threshold ≥ 0.50; 0.90 keeps a margin. With v3 the "ask" band is rarely
   used — the verify step turns borderline picks into "not on your list".
3. **Rules never tick.** Without Jev (no key, error, budget), catalogue
   matches become "Did you buy …?" questions.

## Limits

- 170 lines, written by one person. Real OCR output adds errors (split
  lines, misread letters) — re-run on real receipts in step 2.
- One run per version; self-consistency not measured for receipts.
