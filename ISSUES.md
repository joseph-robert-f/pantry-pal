# Pantry Pal Prototype — Issue Tracker

Robust, spec-driven issue tracker for the Pantry Pal web prototype. This is the
single source of truth for active work, bugs, and open decisions. It is updated
on every build iteration.

**Spec:** `pantry_pal_web_prototype.spec.md` (v0.1)
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

- **[#8b] Deploy to Vercel** — `chore` — _status: blocked (founder action)_ — Spec §10.
  - Needs a GitHub repo + Vercel account. Steps documented in README. Set
    `NEXT_PUBLIC_PROTOTYPE_VERSION=0.1` in Vercel env.
- **[#9b] Founder walkthrough on real iPhone in Safari** — `test` — _status: blocked (founder action)_ — Spec §10, §12.9.

### P1 — baseline polish / open follow-ups

- **[#17] Real-browser visual QA** — `test` — _status: blocked_ — macOS screen-recording
  permission not granted, so automated screenshot QA couldn't run. Verified via
  build + typecheck + SSR string assertions instead. Recommend a manual pass at
  `npm run dev`.
- **[#14] Replace placeholder recipes + photos with founder's actuals** — `chore` — _status: todo_ — Spec §5, §13.2.
  - Graceful `bg-tan` fallback implemented so missing photos never show broken images.
- **[#18] Lighthouse ≥85 on `/plan` (mobile)** — `test` — _status: todo_ — Spec §10. Run after deploy.

### P2 — deferred / open decisions (spec §13)

- **[#D1] Display typeface** — `decision` — _status: open_ — Using Source Serif 4 (free) as placeholder per spec §13.1.
- **[#D2] Recipe photography rights** — `decision` — _status: open_ — Founder to shoot/license. Using CSS-gradient placeholders.
- **[#D3] Demo-controls in public prototype** — `decision` — _status: open_ — Shipping with "demo" label per spec §13.4 recommendation.
- **[#D4] Analytics** — `decision` — _status: open_ — None for F&F stage per spec §13.5.

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
- **[#D1–D4]** Open decisions resolved per spec §13 defaults (Source Serif 4, placeholder photos, demo toggle ships labeled, no analytics).

---

## Notes / log

- **2026-05-31** — Tracker created. Repo had only the spec + empty git history. Building from scratch per file manifest in spec appendix.
- **2026-05-31** — Full prototype built. `npm install`, `tsc --noEmit`, and `next build` all clean (10 routes). Started `next start` and asserted every spec-exact acceptance string renders on `/plan`, `/recipe/[id]`, `/list`, `/paywall`, `/paywall/accepted`, `/coach`, `/discover`. Code-audited each §7 Gherkin criterion. Onboarding `/` renders client-side (gates on localStorage check) — confirmed via logic review, not SSR grep.
- **2026-05-31** — Build-side baseline COMPLETE. Remaining: founder deploy (#8b), founder device walkthrough (#9b), and optional real-browser visual QA (#17, blocked on screen-recording permission).
