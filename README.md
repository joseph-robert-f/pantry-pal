# Pantry Pal — Web Prototype

A clickable web prototype of Pantry Pal — a coach-voiced weekly meal planner for
people who train. Built in **Next.js 14 (App Router) + TypeScript + Tailwind**
so the component layer ports cleanly to React Native + NativeWind for the
eventual iOS build.

> **Not a shipped product.** Single anonymous demo experience, no real auth, no
> LLM calls, no payments. All coach copy is hard-coded. See
> `pantry_pal_web_prototype.spec.md` for the full specification (v0.1).

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
npm run start       # serve the production build
```

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

## Project structure

```
app/          # one route per screen (App Router)
components/   # presentational components — no browser APIs, port to RN cleanly
lib/          # seedData.ts (demo content) + coachStrings.ts (string catalogue)
public/recipes/  # placeholder for founder's recipe photos
```

**Component invariant:** components never read `localStorage`, `window`, or
`fetch`. Browser state lives in route-level files only (spec §1, §8).

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
