---
title: Pantry Pal — Jev Integration Plan
plan_version: 0.1
status: approved — founder decisions made 2026-09-30 (section 8). Phases 0–3 done.
owner: Joe Fehr
parent_spec: pantry_pal_web_prototype.spec.md (v0.2)
date: 2026-09-30
---

# Jev Integration Plan

Use TypeSafe AI's Jev model to classify items, and to keep the shopping list
and recipe list up to date when the weekly plan changes.

## 1. Summary

- Jev is a decision model, not an LLM. It does not write text. It returns
  typed answers with probabilities and a confidence score.
- Jev is a good fit for three Pantry Pal jobs:
  1. Put each grocery item in the correct aisle section.
  2. Tag recipes (for example: high-protein, carb-forward, quick).
  3. Rank recipe swaps when the training week changes.
- Jev cannot write coach copy, normalize item names, or calculate
  quantities. Do these jobs with deterministic code (or with an LLM later).
- The auto-update engine (build the list, compare it to the previous week,
  mark new items) does not need Jev. Build it first, with a local stub
  classifier. Then connect Jev.
- Jev is in early access. Its limits can change without notice. Always keep
  a local fallback.

## 2. What Jev is (research)

> **Source quality:** Rows marked ✅ were verified on 2026-09-30 against the
> primary docs (`docs.typesafe.ai`) and a live API call. Other rows come from
> third-party write-ups.

| Topic | Finding |
|---|---|
| Vendor | TypeSafe AI, San Francisco. Early access since 2026-09-15. |
| Model type | "System One" decision model. Non-autoregressive. No text output. |
| Output types ✅ | **Choice** — pick 1 of up to 255 options. **Score** — 2 to 10 ordered rubric levels. **Noul** — probability that a statement is true (0.0–1.0). |
| Output validity | Answers are constrained to the schema. Invalid values cannot occur. |
| Request shape ✅ | `POST https://api.typesafe.ai/v1/systemone`, `Authorization: Bearer <key>`. Body: `model`, `state` (string, object, or array), `questions` (map of id → `{type, instructions, criteria}`). Choice `criteria` is a map of option → description. Score `criteria` is an ordered array. Response: `model` (versioned ID), `answers` (Choice: `choice`, `confidence`, `probabilities`; Noul: `noul`), `usage`. |
| Parallel questions | Many questions about one `state` run in parallel in one request. The state is billed once. TypeSafe's cookbook reports 13 questions in one call as ~12x cheaper and ~10x faster than 13 calls. |
| Latency | ~70–500 ms per request. |
| Price ✅ | $0.042 per 1M input tokens. Output is free. No caching or batch discount is documented. |
| Context limits ✅ | 64k tokens for state + all questions. 32k for state + the longest question. |
| Rate limits ✅ | 100k tokens/s, 40 requests/s for `jev-1.13.0`. Over the limit returns `429` with `retry-after`. Can change without notice. |
| Access | Early-access waitlist and a browser playground. API key in `TYPESAFE_API_KEY`. |
| SDKs | TypeScript: `@typesafe-ai/sdk` (Node 20+), `TypeSafeClient` with `choice`, `score`, `noul` helpers. Python: `typesafe-sdk`, and `TypeSafeModel` in Pydantic AI. Also listed on Cloudflare AI and OpenRouter. |
| Model IDs ✅ | `jev-1.13.0` is current. `jev-latest` and `jev-preview` are aliases that move without notice. The docs say to pin the version if you tune thresholds. |

### Accuracy and calibration — read this before you trust it

- Jev is not "accurate out of the box". Reviewers say: *"The accuracy is
  something you build, not something you buy."*
- TypeSafe's own dashboard shows Jev about 6 points below a frontier LLM on
  aggregate accuracy for classification tasks.
- One independent study measured an expected calibration error of 0.107.
  Choice and Score answers were **overconfident**. Yes/no answers were
  **underconfident**.
- Accuracy increases when you split one complex question into several
  simple questions (one report: 62.6% asked once, 95% split five ways).
- Jev is strongest on short, factual judgments. It is weakest on multi-step
  reasoning.

### Known weak spots (TypeSafe's own "jev-1.13 jaggedness" page) ✅

- Reads instructions literally. Write the exact condition and put edge cases in `criteria`.
- Does not count or do math. Quantities and merges stay in code.
- Compares dates badly. Keep date logic in code.
- Accuracy drops with large, irrelevant state. Send only the fields the question needs.
- Cannot generate text.

### Live test — 2026-09-30 ✅

One request: 12 grocery strings in `state.items`, 24 questions (a Choice for
section and a Noul for "pantry staple" per item).

| Result | Value |
|---|---|
| Round trip | 596 ms |
| Input tokens | 3,286 (≈ $0.00014) |
| Section accuracy | 12 of 12 correct, including messy input ("Greek yog" → DAIRY, "chx thighs bnls" → PROTEIN). Confidence 0.96–1.0. |
| Staple question | **Weak.** Salt 0.72, but chicken thighs 0.54 and Greek yogurt 0.53. The values do not separate well. Rewrite the question with explicit criteria, or use a fixed staples list in code. |

This is a small sample, not an eval. Phase 2 still applies.

**Conclusion for Pantry Pal:** Aisle and tag classification are short,
factual judgments with a small option set. This is Jev's best case. But you
must build a labeled test set and set your own confidence thresholds.

## 3. Where Jev fits in Pantry Pal

| Job | Jev? | Question type | Notes |
|---|---|---|---|
| Put item in aisle section | **Yes** | Choice (~10 sections) | Main use. Small, stable option set. |
| Is the item a pantry staple the user likely has (salt, oil)? | **Yes** | Noul | Lets the list skip staples. Show them in a collapsed "Check you have" group. |
| Is the item perishable in < 5 days? | **Yes** | Noul | Useful for day-of-week shopping hints later. |
| Match a free-text item to the canonical ingredient catalogue | **Partly** | Choice | 255-option limit. Use two steps: section first, then item within the section. |
| Recipe tags (high-protein, carb-forward, quick, one-pan) | **Yes** | Noul per tag | One request per recipe, one question per tag. |
| Rank recipe swaps for a changed training day | **Yes** | Score (1–5 fit) per candidate | Jev ranks. Code picks. Coach copy stays in the string catalogue. |
| Normalize item names, merge duplicates, add quantities | **No** | — | Deterministic code with a canonical ingredient table. |
| Coach copy ("Bumped Friday carbs…") | **No** | — | Jev does not write text. Keep the string catalogue (spec §6). LLM coach stays H2. |

### A note on "scale"

At prototype scale, the ingredient vocabulary is small (tens to low hundreds
of items). Most classifications repeat, so a cache answers most requests.
Jev gives the most value later, when the input is user free text:

- Pantry inventory (H2 Plus feature, spec §11).
- Items added by hand to the list.
- Imported recipes and grocery receipts.

Design the classifier interface for those inputs now, even if the prototype
only uses seed data.

## 4. Architecture

```
 Plan change (e.g. "Added Saturday long run")
        │
        ▼
 ┌──────────────────────┐
 │ lib/planner/         │  deterministic
 │  buildGroceryList()  │  recipes → ingredients → merge → quantities
 └─────────┬────────────┘
           ▼
 ┌──────────────────────┐   cache hit ──► section
 │ lib/classify/        │
 │  classifyItems()     │   cache miss ─► POST /api/classify (server only)
 └─────────┬────────────┘                   │
           │                                ▼
           │                       Jev (state = item, questions =
           │                       section / staple / perishable)
           │                                │
           │                confidence ≥ threshold ─► accept + cache
           │                confidence <  threshold ─► fallback rules,
           │                                            flag "review"
           ▼
 ┌──────────────────────┐
 │ lib/planner/         │  deterministic
 │  diffGroceryList()   │  previous list vs new list
 └─────────┬────────────┘  → status "new" / "removed" / qty changed
           ▼               → diffBanner { trigger, items }
      /list page
```

### Rules

1. **The API key stays on the server.** Call Jev only from a Next.js route
   handler (`app/api/classify/route.ts`). The browser never sees
   `TYPESAFE_API_KEY`.
2. **Components stay pure** (spec §1, §8). `lib/classify` and `lib/planner`
   do not use `window`, `localStorage`, or `fetch`. The route files inject
   the classifier.
3. **One interface, two implementations.**
   ```ts
   export type Section =
     | "PRODUCE" | "PROTEIN" | "DAIRY" | "BAKERY" | "PANTRY"
     | "FROZEN" | "SPICES" | "BEVERAGES" | "OTHER";

   export type Classification = {
     section: Section;
     isStaple: boolean;
     confidence: number;          // 0–1, from Jev or 1.0 for rule hits
     source: "cache" | "rules" | "jev";
     needsReview: boolean;
   };

   export interface ItemClassifier {
     classify(names: string[]): Promise<Record<string, Classification>>;
   }
   ```
   - `RulesClassifier`: keyword table. No network. Default for the demo.
   - `JevClassifier`: calls `/api/classify`. Falls back to `RulesClassifier`
     on error, timeout (> 1.5 s), or rate-limit response.
4. **Pin the model version** (for example `jev-1.13.0`). Do not use
   `jev-latest` in production. A silent model change can move your
   calibration.
5. **Cache by normalized item name.** Aisle for "bananas" does not change.
   Keep a seed JSON of known items. Add Jev answers above the threshold.
6. **Ask many questions per request.** Send section, staple, and perishable
   as three questions on one state. Batch up to the context limit.

### Example request (HTTP, verified with a live call)

Batch many items in one request. Put the items in `state` as an array and
point each question at one item by index.

```json
POST https://api.typesafe.ai/v1/systemone
{
  "model": "jev-1.13.0",
  "state": { "items": ["1 big bag spinach", "Greek yog"] },
  "questions": {
    "section_0": {
      "type": "choice",
      "instructions": "Which grocery store section sells `items[0]`?",
      "criteria": {
        "PRODUCE": "Fresh fruit, vegetables, herbs",
        "PROTEIN": "Raw meat, poultry, fish, seafood, tofu",
        "DAIRY": "Milk, yogurt, cheese, butter, eggs, plant-based milk and yogurt",
        "BAKERY": "Bread, bagels, tortillas, baked goods",
        "PANTRY": "Shelf-stable dry and canned goods, grains, pasta, oils, sauces",
        "FROZEN": "Items sold frozen",
        "SPICES": "Salt, pepper, dried herbs, spice blends",
        "BEVERAGES": "Drinks other than milk",
        "OTHER": "None of the above"
      }
    },
    "section_1": { "...": "same, with `items[1]`" }
  }
}
```

Response, per question:
`{ "type": "choice", "choice": "PRODUCE", "confidence": 1.0, "probabilities": { "PRODUCE": 1.0, ... } }`

The TypeScript SDK is `@typesafe-ai/sdk` (Node 20+). Check its helper
signatures before you use it, or call the HTTP API with `fetch` from the
route handler.

## 5. Evaluation and thresholds

Do not connect Jev to the live list before you do these steps.

1. **Make a labeled test set.** 200–300 real ingredient strings. Include
   messy input ("1 big bag spinach", "Greek yog", "chx thighs bnls"). Label
   the correct section and staple flag by hand.
2. **Run Jev in shadow mode.** Classify the set. Do not show the results to
   users. Record the answer, the probabilities, and the confidence.
3. **Measure per question:**
   - Accuracy.
   - Accuracy at each confidence band (0.5, 0.7, 0.8, 0.9).
   - Coverage (percent of items above the threshold).
4. **Set the threshold.** Pick the lowest confidence where accuracy is
   ≥ 97% for section. A wrong aisle is a small error, but it makes the
   list look careless.
5. **Split weak questions.** If a question has low accuracy, split it into
   simple Noul questions ("Is this sold in the produce section?"). The
   research shows this helps a lot.
6. **Keep the eval script in the repo** (`scripts/eval-jev.ts`). Run it
   again for each new pinned model version.

### Results (2026-09-30, `jev-1.13.0`) ✅

Full report: `eval/jev/README.md`.

| | Tuning set (287) | Holdout (124) |
|---|---|---|
| Jev, v2 criteria, 1 item/request | 100% | **99.2%** |
| Jev, v2 criteria, 25 items/request | 99.7% | 97.6% |
| Keyword rules | 74.6% | 33.1% |

- **Threshold: 0.70.** No errors at or above it on the holdout, ~95% coverage.
- **One item per request**, not batches: more accurate, and cost is negligible.
- Below 0.70: keep Jev's choice and flag `needsReview`. Keyword rules are
  only for when Jev is unavailable.

## 6. Auto-update behavior

### Shopping list

| Trigger | Result |
|---|---|
| A recipe is added to the plan | Add its ingredients. Merge with existing items. Mark new items `status: "new"`. |
| A recipe is removed | Subtract its quantities. Remove items that reach zero. Do not remove checked items — show them struck through. |
| A training event changes (e.g. Sat long run) | The plan rule adds or changes recipes/snacks. The list update follows from the recipe change. |
| Any change | Recalculate `diffBanner` from the diff: `trigger` = plan event text from the string catalogue, `items` = added item names. |

The diff engine is deterministic. Jev only supplies the section for items
that are not in the cache.

### Recipe list

- Jev tags each recipe once, when the recipe is added. Store the tags.
- When the training week changes, code filters candidate recipes by tags.
  Jev scores each candidate for fit (Score, 1–5). Code picks the top result.
- The swap shows as a suggestion, not an automatic change. The user
  confirms it. (A silent recipe change breaks trust in the coach.)

## 7. Phases

| Phase | Work | Needs Jev? | Done when |
|---|---|---|---|
| **0. Access** ✅ done 2026-09-30 | Join the waitlist. Get a key. Test in the playground. Add `api.typesafe.ai` to the build environment's allowed domains. | Yes | A test request returns an answer. |
| **1. Deterministic core** ✅ done 2026-09-30 | Canonical ingredient table. `buildGroceryList()`, `diffGroceryList()`. `RulesClassifier`. Unit tests. Seed data is generated, not hand-written. | No | The Saturday long run diff banner comes from the engine, not from seed text. |
| **2. Shadow eval** ✅ done 2026-09-30 | Labeled set. `scripts/eval-jev.ts`. Accuracy and calibration report. | Yes | Thresholds are chosen and written in this doc. |
| **3. Live classification** ✅ done 2026-09-30 | `/api/classify` route. `JevClassifier` with cache and fallback. Pinned model. | Yes | New items get Jev sections. Demo still works with no network. |
| **4. Recipe tags and swaps** 🔶 in progress — engine + tags done; swap UI waits on #J4a | Tag questions. Swap scoring. Suggestion UI. | Yes | A training change produces a ranked swap suggestion. |

Phases 0–3 are done. Phase 4 (recipe tags and swaps) is next. Eval results and the #J3 decisions: `eval/jev/README.md`.

## 8. Founder decisions (2026-09-30)

- **D5 — Scope change: approved.** Jev calls are allowed in the prototype,
  server-side, with the keyword-rules fallback. Spec §0 updated (v0.2).
- **J1a — List shape: update the spec.** Spec §5 and §7.4 now describe the
  generated list (5 sections, 22 items for the seed week).
- **D6 — Section taxonomy: keep the 9 sections for now.** When a grocery
  partner is chosen, map to that partner's departments. The change stays in
  one place: the `Section` type and the criteria map.
- **D7 — Vendor risk: approved.** Keep the `ItemClassifier` interface
  vendor-neutral, so an LLM or a local classifier can replace Jev with no UI
  change.

## 9. Risks

| Risk | Mitigation |
|---|---|
| Early-access limits change or access stops | Rules fallback. Cache. Interface allows vendor swap. |
| Overconfident answers | Own eval set. Thresholds per question. `needsReview` flag. |
| Model version drift | Pin versions. Re-run eval before you upgrade. |
| API key exposure | Server-only route. Key only in Vercel env vars. |
| Cost | Very low: ~100 input tokens per item (state + 3 questions) → 1M uncached items ≈ $4.20. The cache makes most requests free. Not a real risk. |

## 10. Sources

- [TypeSafe AI blog — Introducing System One Models & Jev](https://typesafe.ai/blog/introducing-system-one-models-and-jev)
- [TypeSafe docs — Models](https://docs.typesafe.ai/models)
- [TypeSafe docs — Python SDK usage](https://docs.typesafe.ai/sdk/python/usage)
- [Pydantic AI — TypeSafe (Jev)](https://pydantic.dev/docs/ai/models/typesafe/)
- [OpenRouter — Jev SDK for TypeScript and Python](https://openrouter.ai/docs/guides/community/typesafe-sdk)
- [Cloudflare AI docs — Jev](https://developers.cloudflare.com/ai/models/typesafe/jev/)
- [Wikipedia — Jev (AI model)](https://en.wikipedia.org/wiki/Jev_(AI_model))
- [DataCamp — Jev explained](https://www.datacamp.com/blog/system-one-models-jev)
- [Layer3 Labs — Jev limits](https://www.layer3labs.io/guides/jev-limits)
- [Layer3 Labs — Jev benchmarks](https://www.layer3labs.io/guides/jev-benchmarks)
- [DEV Community — Independent benchmark against LLMs](https://dev.to/pravvich/typesafes-jev-independent-benchmark-against-llms-with-code-3deh)
- [NavyaAI — Jev vs a DIY LLM classifier](https://www.navyaai.com/blog/jev-typesafe-limitations-production)
- [The Daily Brief — 62.6% asked once, 95% split five ways](https://www.beri.net/article/typesafe-jev-typed-decision-model-calibration-decomposition-shadow-eval)
- [MindStudio — Jev pricing](https://www.mindstudio.ai/blog/jev-pricing-cost-per-token)
