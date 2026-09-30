# Jev shadow eval — grocery sections (#J2)

Measures how well Jev puts grocery items in the correct store section, before
Jev touches the live list (plan §5). Results here are from `jev-1.13.0` on
2026-09-30.

## Run it

```bash
npm run eval:jev -- --mode single --criteria v2                  # replays cache
npm run eval:jev -- --mode single --criteria v2 --dataset holdout
npm run eval:jev -- --mode batch --batch-size 25 --criteria v2
npm run eval:jev -- --mode single --criteria v2 --live            # new API calls
```

- `items.jsonl` — 287 hand-labeled items (tuning set). Real-world messy input:
  abbreviations, brands, typos, quantities, non-food items.
- `holdout.jsonl` — 124 new items, labeled before any run, used once to check
  the final criteria. Do not tune on it.
- Items that stores shelve in more than one aisle carry every acceptable
  section in `accept` and `"ambiguous": true`.
- `cache/` — raw API responses. Re-runs replay them with no API calls.
- `results/` — one JSON report per run (accuracy, threshold sweep, errors).
- Section criteria live in `lib/grocery/jevQuestions.ts`, shared with #J3.

## Results

| Run | Set | Accuracy | Errors | Coverage at conf ≥ 0.70 | Accuracy at ≥ 0.70 | p50 latency | Cost |
|---|---|---|---|---|---|---|---|
| v1 criteria, 1 item/request | tuning | 98.3% | 5 | 94.1% | 100% | 188 ms | $0.0059 |
| v1 criteria, 25 items/request | tuning | 98.3% | 5 | 94.8% | 99.3% | 585 ms / batch | $0.0029 |
| v2 criteria, 1 item/request | tuning | 100% | 0 | 99.0% | 100% | 182 ms | $0.0066 |
| v2 criteria, 25 items/request | tuning | 99.7% | 1 | 97.6% | 100% | 600 ms / batch | $0.0036 |
| **v2 criteria, 1 item/request** | **holdout** | **99.2%** | **1** | **95.2%** | **100%** | 175 ms | $0.0029 |
| v2 criteria, 25 items/request | holdout | 97.6% | 3 | 95.2% | 100% | 621 ms / batch | $0.0016 |
| Keyword rules (#J1 fallback) | tuning | 74.6% | — | — | — | — | free |
| Keyword rules (#J1 fallback) | holdout | 33.1% | — | — | — | — | free |

### What changed from v1 to v2

v1 errors were criteria gaps, not model errors. Jev reads criteria literally:

- "PROTEIN: **Raw** meat…" → deli turkey went to OTHER.
- PANTRY did not name protein powder → protein powder and whey went to OTHER.
- "OTHER: None of the above" did not say what OTHER is → foil and parchment
  went to PANTRY.

v2 names what each section includes, and defines OTHER as non-food household
items. The fixes are by category, not by item. The holdout run confirms they
generalize (99.2%).

## Decisions for #J3

1. **Use v2 criteria.**
2. **One item per request.** It is more accurate and more confident than
   batching (holdout: 99.2% vs 97.6%). Batching produced unrelated errors
   (guacamole → PROTEIN, fresh pasta → PROTEIN), consistent with TypeSafe's
   note that large state with unrelated content distracts the model. Cost is
   not a factor: ~550 tokens per item ≈ $0.00002. Send the requests in
   parallel; the catalogue cache means only new items reach Jev.
3. **Confidence threshold 0.70.** At ≥ 0.70, both holdout runs made no errors
   and kept ~95% of items. Below 0.70: keep Jev's top choice but set
   `needsReview: true`. Do not fall back to keyword rules for low-confidence
   answers — rules scored 33% on unseen items. Use rules only when Jev is
   unavailable (error, timeout, 429).
4. **Watch the rate limit.** 40 requests/s. A list with more than ~40 new
   items at once needs the client-side concurrency cap (the eval uses 8).

## Limits of this eval

- 411 items total, labeled by one person. Sections follow a typical US
  supermarket; stores differ.
- The holdout has only 1–3 errors per run, so the 0.70 threshold is a
  reasonable starting point, not a precise estimate. Re-run on real user
  items once #J3 logs them.
- One run per configuration. Self-consistency across repeated calls is not
  measured yet.

---

# Recipe judgments (#J4)

`npm run judge:recipes` asks Jev about each recipe once and writes
`lib/recipes/judgments.generated.ts`. The app reads that file: no runtime Jev
calls for recipes. Re-run after changing `RECIPES` (a unit test fails if a
recipe has no judgments).

**One request per recipe.** State: title, ingredient names, method, cook time
as words, and macros as named levels (protein/carbohydrate/fat: low,
moderate, high). No raw numbers (jev-1.13 is weak at arithmetic). Questions,
in parallel:

- 5 × **Score** (4 concrete levels): fit as dinner for hard day, lift day,
  pre long run, rest day, recovery day.
- 2 × **Noul** with criteria: one pan; good leftovers.

Code owns the rest: quick / high protein / carb-forward tags (numeric
cutoffs), swap ranking (`MIN_SWAP_GAIN` 0.15 on a 0–1 scale), tag cutoff
(`TAG_YES` 0.7).

## Results (2026-09-30, `jev-1.13.0`, 18 requests, $0.0008)

| Check | Result |
|---|---|
| Probe recipes (12, obvious best day): Jev's best day is an accepted one | **11 / 12**. Miss: steak + baked potato → lift day (hard/recovery expected; both close behind). |
| Seed recipes: Jev's best day equals the founder's day tag | 3 / 6 |
| Seed recipes: the founder's recipe is the best seed dinner for its tagged day (no swap suggested) | **4 / 6** |
| One-pan tag on seed recipes | 6 / 6 plausible (sheet pan 0.98, stir-fry 0.88; pasta 0.11, salmon bowls 0.05) |

**The 2 seed disagreements are both "hard day" dinners** that are moderate
or low in carbohydrate by their own macros:

- Ground beef stir-fry: 30 g carbs (24% of calories) unless served over the
  optional rice. Jev rates it a rest-day dinner (2.1/3) and a poor hard-day
  one (1.1/3).
- Sheet-pan chicken & sweet potatoes: 38% carbs. Jev: good for hard day
  (2.2/3), better for lift/recovery.

For both, Jev prefers the carb-forward pasta on a hard day. This is a signal
for the founder's real recipes (#14), not a model error: either add a
carbohydrate portion or re-tag the day.

## Limits

- 18 recipes. The probe set was written with obvious answers; it checks the
  rubric works, not fine-grained accuracy.
- Day-fit rubrics are `v1-draft`: Claude's first draft of sports-nutrition
  rules of thumb, confirmed by the founder as a placeholder. A nutritionist
  (#J4b) and a trainer (#J5) will replace them.
