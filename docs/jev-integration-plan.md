---
title: Pantry Pal — Jev Integration Plan
plan_version: 0.1
status: draft — needs founder decisions (section 8)
owner: Joe Fehr
parent_spec: pantry_pal_web_prototype.spec.md (v0.1)
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

> **Source quality:** The primary TypeSafe docs (`docs.typesafe.ai`) were
> blocked by this build environment's network policy. The data below comes
> from search-result summaries of the TypeSafe docs, the Pydantic AI docs,
> and third-party write-ups. Verify each number against the primary docs
> before you use it in code.

| Topic | Finding |
|---|---|
| Vendor | TypeSafe AI, San Francisco. Early access since 2026-09-15. |
| Model type | "System One" decision model. Non-autoregressive. No text output. |
| Output types | **Choice** — pick 1 of up to 255 options. **Score** — 2 to 10 ordered rubric levels. **Noul** — probability that a statement is true (0.0–1.0). |
| Output validity | Answers are constrained to the schema. Invalid values cannot occur. |
| Request shape | `POST /api/v1/systemone` with `model`, `state` (the input), `questions` (named, typed). Response has `answers` (value, probabilities, confidence) and `usage`. |
| Parallel questions | Many questions about one `state` run in parallel in one request. The state is billed once. TypeSafe's cookbook reports 13 questions in one call as ~12x cheaper and ~10x faster than 13 calls. |
| Latency | ~70–500 ms per request. |
| Price | $0.042 per 1M input tokens. Output is free. No caching or batch discount is documented. |
| Context limits | 64k tokens for state + all questions. 32k for state + the longest question. |
| Rate limits | 250k tokens/s, 1,200 requests/min. Can change without notice. |
| Access | Early-access waitlist and a browser playground. API key in `TYPESAFE_API_KEY`. |
| SDKs | TypeScript: `@typesafe-ai/sdk` (Node 20+), `TypeSafeClient` with `choice`, `score`, `noul` helpers. Python: `typesafe-sdk`, and `TypeSafeModel` in Pydantic AI. Also listed on Cloudflare AI and OpenRouter. |
| Model IDs | `jev-latest`, `jev-preview`, and pinned versions (for example `jev-1.13.0`). |

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

### Example request (from the TypeScript SDK docs, unverified)

```ts
import { TypeSafeClient, choice, noul } from "@typesafe-ai/sdk";

const client = new TypeSafeClient(); // reads TYPESAFE_API_KEY

const res = await client.systemOne({
  model: "jev-1.13.0",
  state: { item: "1 big bag spinach" },
  questions: {
    section: choice({
      instructions: "Which grocery store section sells this item?",
      options: ["PRODUCE", "PROTEIN", "DAIRY", "BAKERY", "PANTRY",
                "FROZEN", "SPICES", "BEVERAGES", "OTHER"],
    }),
    staple: noul({
      instructions: "Do most home cooks already keep this item stocked?",
    }),
  },
});
// res.answers.section → { value, probabilities, confidence }
```

Check the exact helper signatures against the SDK before you use this.

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
| **0. Access** | Join the waitlist. Get a key. Test in the playground. Add `api.typesafe.ai` to the build environment's allowed domains. | Yes | A test request returns an answer. |
| **1. Deterministic core** | Canonical ingredient table. `buildGroceryList()`, `diffGroceryList()`. `RulesClassifier`. Unit tests. Seed data is generated, not hand-written. | No | The Saturday long run diff banner comes from the engine, not from seed text. |
| **2. Shadow eval** | Labeled set. `scripts/eval-jev.ts`. Accuracy and calibration report. | Yes | Thresholds are chosen and written in this doc. |
| **3. Live classification** | `/api/classify` route. `JevClassifier` with cache and fallback. Pinned model. | Yes | New items get Jev sections. Demo still works with no network. |
| **4. Recipe tags and swaps** | Tag questions. Swap scoring. Suggestion UI. | Yes | A training change produces a ranked swap suggestion. |

Phase 1 can start now.

## 8. Decisions for the founder

- **D5 — Scope change.** Spec v0.1 lists "no real LLM calls" as a non-goal.
  Jev is not an LLM, but it is a live paid model call and it needs a server
  route. Options: (a) keep the F&F prototype static and do this in a v0.2
  branch; (b) allow Jev in the prototype with the rules fallback.
  **Recommendation: (a) for Phases 1–2, then (b) for Phase 3.**
- **D6 — Section taxonomy.** Use the 9 sections in section 4, or match the
  Instacart department names so checkout maps cleanly later.
- **D7 — Vendor risk.** TypeSafe is a seed-stage company in early access.
  Keep the `ItemClassifier` interface so an LLM (for example Claude with
  structured output) or a local classifier can replace Jev with no UI change.

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
