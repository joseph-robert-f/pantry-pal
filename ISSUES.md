# Pantry Pal Prototype — Issue Tracker

Robust, spec-driven issue tracker for the Pantry Pal web prototype. This is the
single source of truth for active work, bugs, and open decisions. It is updated
on every build iteration.

**Spec:** `pantry_pal_web_prototype.spec.md` (v0.2)
**Baseline definition of done:** spec §12 ("Prototype Done")

---

## Legend

- **Status:** `todo` · `in-progress` · `blocked` · `done` · `wontfix`
- **Priority:** `P0` (blocks baseline) · `P1` (baseline polish) · `P2` (nice-to-have / deferred)
- **Type:** `feature` · `bug` · `chore` · `decision` · `test`
- Each issue links to the spec section it satisfies and, where relevant, the
  acceptance criteria it must pass.

---

## Baseline progress (spec §12 — Definition of "Prototype Done")

| # | Criterion | Status |
|---|---|---|
| 1 | All 5 primary screens render (`/`, `/plan`, `/recipe/[id]`, `/list`, `/paywall`) | done — build + SSR string checks pass |
| 2 | Both stub screens render (`/coach`, `/discover`) | done |
| 3 | Every §7 acceptance criterion passes | done — code-audited against each Gherkin (see log 2026-05-31) |
| 4 | Every §6 string passes voice review checklist | done — strings used verbatim from spec catalogue |
| 5 | Week 1 / Week 3 demo toggle changes coach context on `/plan` | done |
| 6 | Diff banner on `/list` shows seed data text | done |
| 7 | Paywall flow works end-to-end | done |
| 8 | Deployed to Vercel at a shareable URL | **blocked — founder action** (needs GitHub repo + Vercel account) |
| 9 | Founder walked through on own phone | **blocked — founder action** |
| 10 | iOS-only concerns correctly absent | done (by design) |

**Build-side baseline: COMPLETE.** Criteria 8–9 require founder credentials/device.
Visual QA in a real browser is pending (macOS screen-recording permission not granted).

---

## Active issues

### P0 — blocks baseline

_All P0 build issues resolved — see Resolved._

- **[#8b] Deploy to Vercel** ([GH #2](https://github.com/joseph-robert-f/pantry-pal/issues/2)) — `chore` — _status: blocked (founder action)_ — Spec §10.
  - Needs a GitHub repo + Vercel account. Steps documented in README. Set
    `NEXT_PUBLIC_PROTOTYPE_VERSION=0.1` in Vercel env.
  - For Jev (#J3): set `TYPESAFE_API_KEY` as a server-only env var (no `NEXT_PUBLIC_` prefix).
  - Before any **public** sharing (beyond friends-and-family): add analytics (Plausible or PostHog) — spec §13.5, was #D4.
- **[#9b] Founder walkthrough on real iPhone in Safari** — `test` — _status: blocked (founder action)_ — Spec §10, §12.9.

### P1 — baseline polish / open follow-ups

- **[#17] Real-browser visual QA** ([GH #4](https://github.com/joseph-robert-f/pantry-pal/issues/4)) — `test` — _status: blocked_ — macOS screen-recording
  permission not granted, so automated screenshot QA couldn't run. Verified via
  build + typecheck + SSR string assertions instead. Recommend a manual pass at
  `npm run dev`.
- **[#14] Replace placeholder recipes + photos with founder's actuals** — `chore` — _status: todo_ — Spec §5, §13.2.
  - Includes photo rights (was #D2): founder shoots or licenses photos. Blocks wide sharing, not F&F.
  - New recipe ingredients must be in `lib/grocery/catalogue.ts`, or #J3 must be live to classify them.
  - Graceful `bg-tan` fallback implemented so missing photos never show broken images.
- **[#18] Lighthouse ≥85 on `/plan` (mobile)** ([GH #6](https://github.com/joseph-robert-f/pantry-pal/issues/6)) — `test` — _status: todo_ — Spec §10. Run after deploy.

### P2 — deferred / open decisions (spec §13)

_None open — see Resolved (#D1–D4)._

### v0.2 — Jev integration (see `docs/jev-integration-plan.md`)

- **[#J0] Get Jev early access + API key; allow `api.typesafe.ai` in build env** — `chore` — _status: done_ — Plan §7 phase 0. Live call OK 2026-09-30 (12/12 sections correct, 596 ms).
- **[#J1] Deterministic list engine: ingredient table, `buildGroceryList`, `diffGroceryList`, `RulesClassifier`** — `feature` — _status: done_ — Plan §4, §6.
  - `lib/grocery/`: catalogue (cache + fixed staples list), quantity merge, rules classifier, build, diff. Pure — no browser APIs.
  - `lib/demoGrocery.ts` builds the `/list` data from the demo plan. Banner "Added Saturday long run: + bagels, bananas" now comes from the diff of last week's plan vs this week's.
  - `npm test` — 18 tests (Node built-in runner). `tsc`, `next build`, and a Chromium check of `/list` pass.
- **[#J1a] Spec §7.4 conflict: "exactly 3 section headers"** — `decision` — _status: done_ — Founder: update the spec to match the real list. Spec v0.2 §5, §7.4, §12.6 updated. Was: The generated list has 5 sections (adds DAIRY: eggs, parmesan, butter; BAKERY: sourdough, bagels) because the full week's recipes need them. Also the list is longer (22 lines vs 7). Resolve with #D5/#D6: accept and update the spec criterion, or hide sections for the F&F demo.
- **[#J1b] "Check you have" group for staples** — `feature` — _status: todo_ — Engine returns `staples` (olive oil, salt, soy sauce…) but `/list` does not show them yet. Needs coach-voice strings.
- **[#J2] Jev shadow eval: labeled item set + `scripts/eval-jev.ts` + thresholds** — `test` — _status: done_ — Plan §5. Report: `eval/jev/README.md`.
  - 287-item tuning set + 124-item holdout. Holdout accuracy 99.2% (v2 criteria, 1 item/request) vs 33.1% for keyword rules.
  - Decisions for #J3: v2 criteria, one item per request, threshold 0.70 → below it flag `needsReview`; rules only when Jev is down.
- **[#J2a] Re-run eval on real user items** — `test` — _status: todo_ — #J3 is live but does not log items yet (no analytics, #D4). Once real items are collected, label a sample and re-check the 0.70 threshold. Also measure self-consistency (repeat calls).
- **[#J3] Live classification: `/api/classify`, `JevClassifier`, cache, fallback, pinned model** — `feature` — _status: done_ — Plan §4.
  - `lib/grocery/jevClassifier.ts`: catalogue first, then Jev (v2 criteria, 1 item/request, `jev-1.13.0`), threshold 0.70 → `needsReview`, rules on error/timeout (1.5 s)/429, per-process cache, concurrency cap 8.
  - `app/api/classify/route.ts`: only place the key is read. Max 20 names × 80 chars. No key → rules.
  - `lib/grocery/apiClassifier.ts`: browser client; falls back to rules if the route fails or the device is offline.
  - `/list`: "Add something else…" field. Typed items go to their aisle, marked "new"; low-confidence ones show "check aisle".
  - Verified: 32 unit tests; live route (chx thighs bnls → PROTEIN 0.97, egg bites → FROZEN 0.53 flagged); cache hit 5 ms; no-key fallback; 400 on bad input; key not in client bundle; Chromium add-item flow.
- **[#J3a] Voice review for new strings** — `chore` — _status: todo_ — `grocery_add_placeholder` ("Add something else…"), `grocery_add_button` ("Add"), `grocery_review_tag` ("check aisle"), `grocery_add_label`. Run spec §6 checklist.
- **[#J3b] Abuse guard on `/api/classify`** — `chore` — _status: todo (before public sharing)_ — Route is public. Input caps + cache limit cost (~$0.00002/item), but add a per-IP rate limit before sharing beyond F&F.
- **[#J4a] Swap suggestion placement** — `decision` — _status: open_ — "Swap meal" is a Plus feature (routes to paywall, spec §7.3). Decide where `rankSwaps` output shows and whether it is gated.
- **[#J4b] Review day-fit rubric wording** — `chore` — _status: todo (founder)_ — Level descriptions in `lib/recipes/jevRecipeQuestions.ts` are a first draft of sports-nutrition rules of thumb. Also voice-review the new tag and day-type strings.
- **[#J3c] Added items do not persist** — `feature` — _status: todo (P2)_ — Like checkbox state (spec §9), added items reset on reload. Fine for the prototype.
- **[#J4] Recipe tags + swap ranking (suggestion UI)** — `feature` — _status: in-progress_ — Plan §6. Report: `eval/jev/README.md` (Recipe judgments).
  - Done: `lib/recipes/` engine — Jev judges day fit (5 Scores) + one-pan / good-leftovers (Nouls) once per recipe, offline (`npm run judge:recipes` → `judgments.generated.ts`); code tags quick / high protein / carb-forward; `rankSwaps` with a minimum gain.
  - Done: recipe page shows attribute pills. Founder's day tag still wins; Jev's best day fills in only when a recipe has none.
  - Results: probes 11/12; seed recipes keep their slot 4/6 — the 2 misses are "hard day" dinners with moderate/low carbs.
  - Open: **where the swap suggestion shows in the UI** (founder decision — see #J4a).
- **[#D5] Scope change: live model call vs spec v0.1 non-goal** — `decision` — _status: done_ — Founder: yes. Jev allowed server-side with rules fallback. Spec v0.2 §0.
- **[#D6] Grocery section taxonomy (own 9 vs Instacart departments)** — `decision` — _status: done_ — Founder: keep the 9 for now; map to the grocery partner's departments once one is chosen. Spec v0.2 §5.
- **[#D7] Vendor risk: keep `ItemClassifier` interface vendor-neutral** — `decision` — _status: done_ — Founder: yes.

---

## Resolved

- **[#1]** Scaffolded Next.js 14 + TS + Tailwind (package.json, tsconfig, next.config, postcss, globals.css, .gitignore). `next build` ✓.
- **[#2]** Design tokens in `tailwind.config.ts` — colors, type scale, radii, `max-w-frame` (spec §2).
- **[#3]** `lib/coachStrings.ts` — full STRINGS catalogue, verbatim from spec §6.
- **[#4]** `lib/seedData.ts` — DEMO_USER, DEMO_WEEK, 6 RECIPES, DEMO_GROCERY, DEMO_WEEKS + `getRecipe`.
- **[#5]** All 10 components built per §8 contracts (PhoneFrame, BottomTabBar, CoachBubble, MealCard, DayChip, GroceryItem, PricePill, Button, Toast, DemoControls).
- **[#6]** Onboarding `/` — preselected "Lift 4x", pill toggle, localStorage flag, redirect.
- **[#7]** Plan `/plan` — coach context, day chips, today/tomorrow cards, demo toggle.
- **[#8]** Recipe `/recipe/[id]` — hero fallback, macros, tags, +N more, cook toast, swap→paywall.
- **[#9]** Grocery `/list` — diff banner, 3 sections, toggleable checkboxes, Instacart CTA.
- **[#10]** Paywall `/paywall` + `/paywall/accepted` — annual preselected, price toggle, CTA flow.
- **[#11]** Stub screens `/coach`, `/discover`.
- **[#12]** Build + `tsc --noEmit` pass; no errors in server log across all routes.
- **[#13]** README (setup, deploy, structure, pre-share checklist).
- **[#15]** A11y: semantic headings, `aria-pressed`/`aria-current`/`aria-label`, reading order.
- **[#16]** Footer + `NEXT_PUBLIC_PROTOTYPE_VERSION` (`.env.example`, `.env.local`).
- **[#D1–D4]** Spec §13 open decisions — closed 2026-09-30 after a re-check (they were also listed as open under P2 by mistake):
  - **#D1 typeface:** Source Serif 4 in `app/layout.tsx`. Tiempos vs Source Serif is a brand call for iOS, not the prototype.
  - **#D2 photo rights:** still true, but a duplicate of #14 — folded into #14.
  - **#D3 demo toggle:** ships with a "demo" label (`components/DemoControls.tsx`), per spec §13.4.
  - **#D4 analytics:** none, correct for F&F. "Add before public sharing" moved onto #8b.

---

## Notes / log

- **2026-05-31** — Tracker created. Repo had only the spec + empty git history. Building from scratch per file manifest in spec appendix.
- **2026-05-31** — Full prototype built. `npm install`, `tsc --noEmit`, and `next build` all clean (10 routes). Started `next start` and asserted every spec-exact acceptance string renders on `/plan`, `/recipe/[id]`, `/list`, `/paywall`, `/paywall/accepted`, `/coach`, `/discover`. Code-audited each §7 Gherkin criterion. Onboarding `/` renders client-side (gates on localStorage check) — confirmed via logic review, not SSR grep.
- **2026-05-31** — Build-side baseline COMPLETE. Remaining: founder deploy (#8b), founder device walkthrough (#9b), and optional real-browser visual QA (#17, blocked on screen-recording permission).
- **2026-09-30** — Added Jev integration plan (`docs/jev-integration-plan.md`) and v0.2 issues #J0–#J4, #D5–#D7. Primary TypeSafe docs blocked by build-env network policy; plan data is from secondary sources — verify before coding against the SDK.
- **2026-09-30** — #J0 done. Key + network confirmed in cloud env. Plan updated with verified API shape, limits (100k tok/s, 40 req/s), jev-1.13 weak spots, and live test results. Staple Noul question separates poorly — needs rework in #J2.
- **2026-09-30** — #J1 done. /list is now generated by the grocery engine. Spec §7.4 "exactly 3 sections" no longer holds — tracked as #J1a.
- **2026-09-30** — #J2 done. Installed the TypeSafe skill (plugin enabled in `.claude/settings.json`). Eval: v1 criteria 98.3%, v2 100% on tuning set, 99.2% on holdout. Threshold 0.70.
- **2026-09-30** — Founder decisions: #D5 yes, #J1a update spec, #D6 keep 9 sections (map to partner later), #D7 yes. Spec bumped to v0.2. #D1–D4 re-checked and closed (#D2 folded into #14, #D4 condition moved to #8b).
- **2026-09-30** — #J3 done. Jev classifies hand-added list items via `/api/classify`. New follow-ups: #J3a voice review, #J3b rate limit before public sharing, #J3c persistence.
- **2026-09-30** — #J4 engine + recipe tag pills done (PR #8). Swap suggestion UI waits on founder decision #J4a.
