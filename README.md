# Pantry Pal — Web Prototype

A clickable web prototype of Pantry Pal — a coach-voiced weekly meal planner for
people who train. Built in **Next.js 15 (App Router) + React 19 + TypeScript + Tailwind**
so the component layer ports cleanly to React Native + NativeWind for the
eventual iOS build.

> **Not a shipped product.** Single anonymous demo experience, no real auth, no
> LLM calls, no payments. All coach copy is hard-coded. The one live model call
> is TypeSafe's Jev for grocery item classification, server-side, with a
> no-network fallback (spec v0.2, `docs/jev-integration-plan.md`). See
> `pantry_pal_web_prototype.spec.md` for the full specification (v0.2).

## What it demonstrates

- The **coach voice** across onboarding, planning, recipes, and the paywall.
- The **week-planning loop**: Sunday plan → recipe → grocery → checkout.
- The **diff-based grocery list** (the signature feature).
- A **Week 1 / Week 3 demo toggle** showing the felt-experience model adjusting
  over time.

Everything renders inside a simulated iPhone frame (max-width 390px).

## Getting started

```bash
npm install
cp .env.example .env.local   # sets NEXT_PUBLIC_PROTOTYPE_VERSION for the footer
npm run dev                  # http://localhost:3000
```

Other scripts:

```bash
npm run build       # production build (must pass before deploy)
npm run typecheck   # tsc --noEmit, strict mode
npm test            # grocery engine unit tests (Node built-in runner)
npm run eval:jev    # Jev accuracy eval (replays cached responses; see eval/jev/README.md)
npm run consistency:jev  # Jev repeat-call stability near the threshold (live calls, ~$0.005)
npm run judge:recipes  # Jev recipe judgments → lib/recipes/judgments.generated.ts (re-run after editing RECIPES)
node scripts/qa-browser.cjs http://localhost:3000 /tmp/qa  # browser QA of every route (needs Playwright; see file header)
npm run start       # serve the production build
```

## CI and checks

GitHub Actions (`.github/workflows/ci.yml`) runs on every PR and push to
`main`: `npm ci`, typecheck, `npm test`, `npx vitest run`, a replay of the
Jev recipe judgments and eval from committed caches (no API key; fails if
`lib/recipes` or `eval/jev` would change — re-run the script with the key and
commit), and `next build`. Node version: `.nvmrc` (22; needs ≥ 22.18 because
`npm test` runs `.ts` files directly).

There is no ESLint config; `npm run typecheck` is the static check.

In Claude Code on the web, `.claude/hooks/session-start.sh` installs
dependencies when a session starts.

## Routes

| Route | Screen |
|---|---|
| `/` | Onboarding (redirects to `/plan` once `pp_onboarded` is set) |
| `/plan` | Weekly plan home |
| `/recipe/[id]` | Recipe detail |
| `/list` | Grocery list |
| `/coach` | Coach stub |
| `/discover` | Discover stub |
| `/paywall` → `/paywall/accepted` | Plus paywall + trial-accepted state |
| `POST /api/classify` | Server-only. Classifies grocery items into aisle sections with Jev; keyword-rules fallback with no key or on error |

## Project structure

```
app/          # one route per screen (App Router)
components/   # presentational components — no browser APIs, port to RN cleanly
lib/          # seedData.ts (demo content) + coachStrings.ts (string catalogue)
lib/grocery/  # grocery engine: plan → merged, classified list → diff (see docs/jev-integration-plan.md)
lib/demoGrocery.ts  # builds the /list demo data with the engine
public/recipes/  # placeholder for founder's recipe photos
```

**Component invariant:** components never read `localStorage`, `window`, or
`fetch`. Browser state lives in route-level files only (spec §1, §8).

**Jev (optional):** set `TYPESAFE_API_KEY` in `.env.local` to classify items
typed into the list with Jev. Without it, the keyword rules answer. Behind an
HTTPS proxy, start Node with `NODE_USE_ENV_PROXY=1` so server-side `fetch`
uses it.

**String catalogue:** every visible string lives in `lib/coachStrings.ts`. No
string in component code that isn't in the catalogue (spec §6).

## Deploy (Vercel)

1. Push to a private GitHub repo (`pantry-pal-prototype`).
2. Connect the repo to Vercel (free tier). Auto-deploys on push to `main`.
3. Set env var `NEXT_PUBLIC_PROTOTYPE_VERSION = "0.1"`.
4. (Optional) configure a memorable subdomain, e.g. `pantrypal-preview.vercel.app`.

See the **pre-deploy checklist** in spec §10 and the **definition of done** in
spec §12 before sharing with friends-and-family.

## Before sharing

- Replace the six placeholder recipes + photos with the founder's actuals
  (`lib/seedData.ts`, `public/recipes/`). Verify macros against USDA FoodData
  Central.
- Run the voice review checklist (spec §6) over `lib/coachStrings.ts`.

## Issue tracking

Active work, bugs, and open decisions are tracked in
[`ISSUES.md`](./ISSUES.md), kept in sync with the spec's definition of done.
