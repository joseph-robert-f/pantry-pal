---
title: Pantry Pal — Web Prototype
spec_version: 0.1
status: ready_to_build
horizon: pre-H1 (prototype only, not shipping product)
owner: Joe Fehr
deliverable: clickable web prototype, deployed to Vercel
estimated_effort: 1–2 sessions with Claude Code / Cursor
parent_spec: pantry_pal_spec_v0.1.html
---

# Pantry Pal — Web Prototype Technical Specification

A clickable web prototype that lets the founder and a small circle of friends-and-family experience the Pantry Pal product flow before any iOS code is written. Built in Next.js + Tailwind so that components map cleanly to the eventual React Native + NativeWind iOS build.

This spec is intentionally complete: an AI coding agent (Claude Code, Cursor, Spec-Kit, etc.) should be able to read this file end-to-end and produce a working prototype without further clarification. Where decisions are deferred, they are explicitly marked `DEFERRED — replace at build time`.

---

## 0. Goals & Non-Goals

### Goals

1. Validate that the **coach voice lands** when read by someone who is not the founder. This is the single highest-leverage thing the prototype can test.
2. Validate that the **week-planning loop** (Sunday plan → recipe → grocery → checkout) feels right at the layout level.
3. Produce a **shareable URL** the founder can text to five friends for unstructured reaction.
4. Build with components that **port to React Native** with minimal rework so the prototype is scaffolding for iOS, not throwaway code.

### Non-Goals

- Real authentication. The prototype is a single anonymous experience.
- Real LLM calls. All coach copy is hard-coded.
- Real HealthKit integration. Workout data is hard-coded into the demo.
- Real grocery delivery integration. The "Shop with Instacart" button opens a stubbed link (instacart.com).
- Real payment. The paywall "Start trial" button shows a thank-you state.
- Coach chat surface. Deferred — needs a live LLM to evaluate honestly.
- Weekly check-in flow. Deferred — 30-second flow that doesn't reveal much in a mockup.
- Multi-user/persona switching. Single demo user only.
- Responsive desktop layout. Rendered inside a phone frame, max-width 390px.

---

## 1. Tech Stack — Decided

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 14+** (App Router) | TypeScript, server components disabled where unnecessary |
| Styling | **Tailwind CSS** | NativeWind-compatible class names where possible |
| Language | TypeScript, strict mode | |
| Package manager | pnpm or npm | Either is fine |
| Hosting | **Vercel** | Free tier, deployed on push to `main` |
| State | React `useState` / `useReducer` only | No external state lib for prototype |
| Routing | Next.js App Router file-based routes | One route per screen |
| Icons | `lucide-react` | Lightweight, RN-compatible later |
| Fonts | `Inter` (UI) + `Tiempos Headline` or `Source Serif 4` (display) | Loaded via `next/font` |

**Component compatibility rule:** every interactive component (Button, Card, MealRow, etc.) is written as a presentational React function component that accepts plain props. No browser-only APIs (`window`, `localStorage`, `fetch`) in any component file — they live in route-level files only. This ensures the component layer ports to React Native cleanly.

---

## 2. Design System Tokens

Tokens are defined in `tailwind.config.ts` under `theme.extend`. Use semantic names, not raw color values, in components.

### Color tokens

```ts
// tailwind.config.ts (excerpt)
colors: {
  // Warm neutrals
  cream: "#FAF7F2",         // background
  card: "#FFFFFF",          // surface
  ink: "#1F1B16",           // primary text
  muted: "#6B6259",         // secondary text
  subtle: "#E8DFD3",        // soft border / fill
  hairline: "#D9CFC0",      // 1px borders

  // Accents
  terracotta: {
    DEFAULT: "#C56E47",
    soft: "#F4E2D7",
    deep: "#7A3617",        // text on terracotta-soft
  },
  sage: {
    DEFAULT: "#7A8B6F",
    soft: "#DDE5D6",
    deep: "#3F5036",        // text on sage-soft
  },
  tan: {
    DEFAULT: "#C8A668",
    soft: "#F1E5C7",
    deep: "#6B5219",
  },
}
```

### Typography

```ts
fontFamily: {
  sans: ["var(--font-inter)", "system-ui", "sans-serif"],
  serif: ["var(--font-display)", "Georgia", "serif"],
}

fontSize: {
  // Use these only. No arbitrary sizes.
  xs: ["11px", { lineHeight: "1.4" }],
  sm: ["13px", { lineHeight: "1.5" }],
  base: ["15px", { lineHeight: "1.55" }],
  lg: ["18px", { lineHeight: "1.4" }],
  xl: ["22px", { lineHeight: "1.3" }],
  "2xl": ["28px", { lineHeight: "1.2" }],
}
```

### Spacing

Use only the 4-step Tailwind scale: `1` (4px), `2` (8px), `4` (16px), `8` (32px). No arbitrary spacing. Compose for nuance.

### Border radius

`rounded-md` (6px), `rounded-lg` (10px), `rounded-2xl` (16px), `rounded-full`. No arbitrary radii.

---

## 3. Layout & Viewport

The prototype renders inside a **simulated iPhone frame** centered on the web page. This is honest about where the real product lives.

### Root layout (`app/layout.tsx`)

- Full-viewport background: `bg-cream`
- Centered phone frame container: `max-w-[390px]` `mx-auto` `min-h-screen` `bg-card` with a subtle border to suggest a device bezel.
- Small footer outside the frame: `"Pantry Pal — Prototype. Not a shipped product. © 2026 Joe Fehr."` rendered at 11px in `text-muted`.
- A persistent floating "demo controls" pill in the bottom-right of the page that toggles between **Week 1 (energy dragging)** and **Week 3 (energy trending up)** to demonstrate the felt-experience model adjusting over time. Hidden on mobile viewports.

### Phone frame component

```tsx
// components/PhoneFrame.tsx
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-cream py-8 flex items-start justify-center">
      <div className="w-full max-w-[390px] bg-card rounded-2xl
                      shadow-xl border border-hairline overflow-hidden
                      min-h-[844px] relative">
        {/* iOS status bar simulation */}
        <div className="h-12 bg-card flex items-center justify-center">
          <div className="w-16 h-1.5 bg-ink rounded-full" />
        </div>
        {children}
      </div>
    </div>
  );
}
```

---

## 4. Navigation

Bottom-tab navigation modeled on iOS. Four tabs, file-based routing.

### Routes

| Route | Screen | Tab label | Tab icon (lucide) |
|---|---|---|---|
| `/` | Onboarding (first visit) → redirects to `/plan` on completion | — | — |
| `/plan` | Weekly plan home | Plan | `Calendar` |
| `/recipe/[id]` | Recipe detail | (inherits Plan tab active) | — |
| `/list` | Grocery list | List | `ShoppingBasket` |
| `/coach` | Coach chat (stub — "Coming soon" empty state) | Coach | `MessageCircle` |
| `/discover` | Discover marketplace (stub — "Coming soon") | Discover | `Compass` |
| `/paywall` | Plus paywall (modal-style, presented from any tab) | — | — |

### BottomTabBar component contract

```tsx
type TabKey = "plan" | "list" | "coach" | "discover";

interface BottomTabBarProps {
  active: TabKey;
}
```

- Fixed to bottom of phone frame.
- 4 equal-width tabs, 56px tall.
- Active tab: `text-ink` with icon filled.
- Inactive tabs: `text-muted` with icon outline.
- No badges, no notification dots (off-thesis).

---

## 5. Seed Content

All content is hard-coded in `lib/seedData.ts`. The founder is expected to **replace placeholder content with their own actual training pattern, recipes, and photographs** before sharing the prototype with friends-and-family — this is the founder-as-first-user thesis applied to the prototype.

### Demo user profile

```ts
export const DEMO_USER = {
  name: "Joe",  // shown nowhere in UI; for internal reference only
  trainingPattern: {
    liftsPerWeek: 4,
    cardioPerWeek: 1,
    weekendLongEffort: true,
  },
  goal: "build_muscle" as const,
  dietary: {
    restrictions: [] as string[],
    dislikes: [] as string[],
    allergens: [] as string[],
  },
};
```

### Demo week (the active plan shown on `/plan`)

```ts
// lib/seedData.ts
export const DEMO_WEEK = {
  weekOf: "May 25",
  coachContext: "Heavier lift week + Sat long run. Bumped Friday carbs accordingly.",
  days: [
    { day: "M", isToday: false, dinner: "monday_chicken" },
    { day: "T", isToday: true,  dinner: "sheet_pan_chicken_sweet_potato" },
    { day: "W", isToday: false, dinner: "salmon_bowls" },
    { day: "T", isToday: false, dinner: "ground_beef_stir_fry" },
    { day: "F", isToday: false, dinner: "carb_forward_pasta" },
    { day: "S", isToday: false, dinner: "weekend_recovery_eggs" },
  ],
};
```

### Recipe set — six placeholder recipes

> **PLACEHOLDER — REPLACE WITH FOUNDER'S ACTUAL RECIPES.**
> The structure below is what the iOS schema will expect. The founder should photograph the actual six meals they cook most weeks (iPhone, natural light, no styling) and replace the `photoUrl` references. Macros should be verified against USDA FoodData Central before the prototype goes to anyone.

```ts
export const RECIPES = [
  {
    id: "sheet_pan_chicken_sweet_potato",
    title: "Sheet-pan chicken & sweet potatoes",
    photoUrl: "/recipes/sheet-pan-chicken.jpg",
    timeMin: 30,
    servings: 2,
    macros: { kcal: 540, protein: 45, carbs: 52, fat: 18 },
    tags: ["hard_day", "oven", "30min"],
    ingredients: [
      { qty: "1.5 lb", name: "chicken thighs" },
      { qty: "2 large", name: "sweet potatoes" },
      { qty: "3 tbsp", name: "olive oil" },
      { qty: "1 tsp each", name: "smoked paprika, garlic powder" },
      { qty: "1", name: "lemon" },
      { qty: "to taste", name: "salt & pepper" },
      { qty: "handful", name: "fresh parsley" },
    ],
    instructions: [
      "Heat oven to 425°F.",
      "Toss everything on a sheet pan with olive oil and spices.",
      "Roast 25–30 min until chicken hits 165°F.",
      "Squeeze lemon over, scatter parsley, eat.",
    ],
  },
  // 5 more recipes follow the same shape:
  // - monday_chicken (lighter day, rest)
  // - salmon_bowls (leftover-friendly)
  // - ground_beef_stir_fry (hard day, quick)
  // - carb_forward_pasta (Friday, pre-long-run)
  // - weekend_recovery_eggs (Sunday, low effort)
];
```

### Grocery list for the demo week

```ts
export const DEMO_GROCERY = {
  weekOf: "May 25",
  diffBanner: { trigger: "Added Saturday long run", items: ["bagels", "bananas"] },
  sections: [
    {
      name: "PRODUCE",
      items: [
        { qty: "2", name: "sweet potatoes", checked: false, status: null },
        { qty: "3", name: "lemons", checked: true, status: null },
        { qty: "1 big bag", name: "spinach", checked: false, status: null },
        { qty: "3", name: "bananas", checked: false, status: "new" },
      ],
    },
    {
      name: "PROTEIN",
      items: [
        { qty: "1.5 lb", name: "chicken thighs", checked: false, status: null },
        { qty: "2", name: "salmon filets", checked: false, status: null },
      ],
    },
    {
      name: "PANTRY",
      items: [
        { qty: "4-pack", name: "bagels", checked: false, status: "new" },
      ],
    },
  ],
};
```

### Two-week demo toggle data

To demonstrate the felt-experience trend, the prototype supports a Week 1 / Week 3 toggle on the home screen.

```ts
export const DEMO_WEEKS = {
  week_1: {
    coachContext: "Energy was dragging this week — let's go slightly lighter on the lifts and lean into rest. I left dinners simple.",
    energyState: "dragging",
  },
  week_3: {
    coachContext: "Energy's been trending up three weeks running. Bumping protein a notch and adding a heavier Tuesday lift.",
    energyState: "trending_up",
  },
};
```

---

## 6. Coach Voice — String Catalogue

Every visible string in the prototype is the coach's voice. This catalogue exists so a designer or copy reviewer can audit all strings in one place before deploy. **No string lives in component code that isn't in this catalogue.**

```ts
// lib/coachStrings.ts
export const STRINGS = {

  // Onboarding
  onboarding_eyebrow: "Step 2 of 5",
  onboarding_q1: "How does a normal training week look?",
  onboarding_q1_sub: "Rough is fine. We'll figure it out from there.",
  onboarding_option_lift_3: "Lift 3x",
  onboarding_option_lift_4: "Lift 4x",
  onboarding_option_lift_5: "Lift 5x",
  onboarding_option_cardio: "+ cardio",
  onboarding_option_long_run: "+ long run wknd",
  onboarding_coach_response: "Got it — 4 lifts and a weekend run. I'll plan accordingly.",
  onboarding_coach_signature: "— your coach",
  onboarding_cta: "Continue",

  // Home
  home_week_label: "Week of May 25",
  home_title: "This week",
  home_coach_context: "Heavier lift week + Sat long run. Bumped Friday carbs accordingly.",
  home_today_label: "TODAY · TUESDAY",
  home_tomorrow_label: "TOMORROW",
  home_tab_plan: "Plan",
  home_tab_list: "List",
  home_tab_coach: "Coach",
  home_tab_discover: "Discover",

  // Recipe
  recipe_macros_format: "{p}P · {c}C · {f}F · {kcal} cal · {min}min",
  recipe_section_ingredients: "Ingredients",
  recipe_section_instructions: "How to make it",
  recipe_button_swap: "Swap meal",
  recipe_button_cook: "Start cooking",

  // Grocery list
  grocery_title: "Grocery list",
  grocery_subhead: "For week of May 25",
  grocery_diff_banner_prefix: "Added Saturday long run:",
  grocery_new_tag: "new",
  grocery_section_produce: "PRODUCE",
  grocery_section_protein: "PROTEIN",
  grocery_section_pantry: "PANTRY",
  grocery_cta_instacart: "Shop with Instacart",

  // Paywall (Plus upsell)
  paywall_headline_l1: "Want to talk to",
  paywall_headline_l2: "your coach directly?",
  paywall_sub_l1: "Plus opens up chat plus a few",
  paywall_sub_l2: "other things you might like.",
  paywall_feature_chat: "Chat anytime, in plain language",
  paywall_feature_pantry: "Pantry tracking",
  paywall_feature_voice: "Voice check-ins",
  paywall_feature_wearable: "Wearable trend awareness",
  paywall_price_monthly: "Monthly",
  paywall_price_annual: "Annual",
  paywall_price_monthly_amount: "$9.99",
  paywall_price_annual_amount: "$79",
  paywall_price_monthly_unit: "per month",
  paywall_price_annual_unit: "per year",
  paywall_annual_badge: "SAVE 34%",
  paywall_cta: "Start 7-day trial",
  paywall_disclaimer: "Cancel anytime. No charge during trial.",

  // Stub screens (Coach and Discover)
  stub_coach_headline: "Coach chat opens up with Plus.",
  stub_coach_sub: "This prototype shows the experience. The real thing is coming.",
  stub_discover_headline: "Discover is where vetted brands live.",
  stub_discover_sub: "Walled off from the coach. Always labeled. Coming with the App Store launch.",

  // Empty states
  empty_no_healthkit_headline: "Connect your workouts when you're ready.",
  empty_no_healthkit_sub: "I'll work with what you tell me until then.",

  // Error states
  error_plan_generation_headline: "Something didn't land right on my end.",
  error_plan_generation_sub: "Try again in a minute?",

  // Trial accepted (paywall CTA post-click)
  trial_accepted_headline: "Glad to have you. Let's get into it.",
  trial_accepted_sub: "(Prototype — no card charged.)",
} as const;
```

### Voice review checklist (run before deploy)

Every string above must pass each of these:

- [ ] Does it sound like a knowledgeable friend, not a marketing voice?
- [ ] Is it specific where possible, not generic?
- [ ] Does it move forward, not dwell?
- [ ] Is it free of food-moralizing ("good," "bad," "earned," "deserved")?
- [ ] Does it avoid shame language ("missed," "you should have," "you didn't")?
- [ ] Is it concise — under 2 sentences where possible?
- [ ] Does it use contractions and plain words?
- [ ] Would the coach in `coach_persona_thesis.md` actually say it?

---

## 7. Screen Specifications

Each screen below has: **purpose**, **layout**, **interactions**, and **acceptance criteria in Given/When/Then form**. The acceptance criteria are the contract Claude Code / Cursor should test against.

---

### 7.1 Onboarding (`/`)

**Purpose.** Show the coach voice in its most charged moment — the first 90 seconds — and demonstrate the training-pattern input model. For the prototype, this is a single screen that, on completion, persists `onboardingComplete: true` to `localStorage` and routes to `/plan`. Subsequent visits skip onboarding.

**Layout (top to bottom).**

1. Status bar (from `PhoneFrame`)
2. Eyebrow text `STRINGS.onboarding_eyebrow` in `text-xs text-muted`, top padding 16px from frame edge
3. Progress bar: 240px wide, two segments — first 120px in `bg-terracotta`, remaining in `bg-subtle`. Height 3px, `rounded-full`.
4. Question heading `STRINGS.onboarding_q1` in `text-lg font-semibold`, 32px top margin
5. Subhead `STRINGS.onboarding_q1_sub` in `text-sm text-muted`, 8px below
6. Pill option grid — 5 selectable pills, multi-select, wrapping. `Lift 4x` is preselected (active state) to show the demo flow.
7. Coach response bubble in `bg-sage-soft text-sage-deep` with `STRINGS.onboarding_coach_response` followed by italic `STRINGS.onboarding_coach_signature` in `text-muted`. Appears 32px below the pills.
8. CTA button at bottom: full-width, `bg-ink text-cream`, 36px tall, `rounded-full`, label `STRINGS.onboarding_cta`.

**Interactions.**

- Tap a pill → toggles its active state (`bg-terracotta text-white` when active, otherwise `bg-cream border border-hairline text-ink`).
- Tap CTA → write `localStorage.setItem("pp_onboarded", "true")` → navigate to `/plan`.
- The coach response bubble is shown statically for the prototype. It does not need to update based on selections.

**Acceptance criteria.**

```gherkin
Given a first-time visitor with no localStorage flag,
when they land on `/`,
then the onboarding screen renders with "Lift 4x" already selected as active.

Given the onboarding screen,
when the user taps any other pill option,
then that pill toggles its visual active state.

Given the onboarding screen with at least one pill active,
when the user taps "Continue",
then localStorage contains "pp_onboarded" = "true"
and the user is navigated to `/plan`.

Given a returning visitor with "pp_onboarded" = "true",
when they land on `/`,
then they are redirected to `/plan` without seeing the onboarding screen.

Given the onboarding screen,
when a screen reader is used,
then the question text, subhead, and CTA are all announced in reading order.
```

---

### 7.2 Weekly plan home (`/plan`)

**Purpose.** The Sunday-planning moment. Demonstrates the dynamic meal plan, the coach context line, and the today/tomorrow stack.

**Layout (top to bottom).**

1. Status bar
2. Week label `STRINGS.home_week_label` in `text-xs text-muted`
3. Page title `STRINGS.home_title` in `text-xl font-bold`, 4px below
4. Coach context bubble `bg-sage-soft text-sage-deep` with `STRINGS.home_coach_context`, 16px below title, full width inside frame margins
5. Day chip row: 6 chips (M, T, W, T, F, S). The chip marked `isToday` in seed data is `bg-terracotta text-white`; others are `bg-cream border border-hairline`.
6. "TODAY · TUESDAY" eyebrow in `text-xs font-semibold text-terracotta`
7. Today's meal card in `bg-terracotta-soft`, 68px tall, with recipe title (2 lines if needed) and macro line in `text-xs text-muted`. Tap → navigate to `/recipe/[id]`.
8. "TOMORROW" eyebrow in `text-xs font-semibold text-muted`
9. Tomorrow's meal card in `bg-cream border border-subtle`, 52px tall. Tap → navigate to `/recipe/[id]`.
10. (Bottom) BottomTabBar with `Plan` active.

**Interactions.**

- Tap today's meal card → navigate to `/recipe/sheet_pan_chicken_sweet_potato` (the seed today recipe).
- Tap tomorrow's meal card → navigate to `/recipe/salmon_bowls`.
- Tap any day chip → no navigation in prototype; visually changes selection (cosmetic only).
- Tap "List" tab → navigate to `/list`.
- Tap "Coach" tab → navigate to `/coach` (stub).
- Tap "Discover" tab → navigate to `/discover` (stub).
- Demo-controls pill (bottom-right of page, outside frame) toggles between Week 1 and Week 3 demo data, updating the coach context line only.

**Acceptance criteria.**

```gherkin
Given a user has completed onboarding,
when they land on `/plan`,
then the page renders within the phone frame with the bottom tab bar showing "Plan" as active.

Given the `/plan` screen,
when the user views the coach context line,
then it reads exactly: "Heavier lift week + Sat long run. Bumped Friday carbs accordingly."

Given the `/plan` screen with the demo-controls set to "Week 1",
when the user toggles to "Week 3",
then the coach context line updates to the Week 3 string from DEMO_WEEKS.

Given the `/plan` screen,
when the user taps the today meal card,
then they are navigated to `/recipe/sheet_pan_chicken_sweet_potato`.

Given the `/plan` screen,
when the user taps the "List" tab,
then they are navigated to `/list`.

Given the day chip row,
when rendered,
then exactly one chip has the terracotta background indicating "today" (Tuesday in the seed data).
```

---

### 7.3 Recipe detail (`/recipe/[id]`)

**Purpose.** Demonstrate the recipe surface — photograph, macros at-a-glance, ingredient list, and the two primary CTAs ("Swap meal" and "Start cooking").

**Layout (top to bottom).**

1. Hero photo: full-width, 160px tall, with the recipe `photoUrl` as background. If no image asset exists, fallback to a solid `bg-tan` block with a subtle radial shape. Back chevron `<` in `text-white` overlays at top-left.
2. Title `text-lg font-bold` in `text-ink`, 16px below hero.
3. Macro line formatted via `STRINGS.recipe_macros_format` in `text-xs text-muted`.
4. Tag pills row: training-day tag in `bg-sage-soft text-sage-deep`, equipment tag in `bg-terracotta-soft text-terracotta-deep`.
5. Section header `STRINGS.recipe_section_ingredients` in `text-sm font-semibold`.
6. Ingredient list — first 5 visible, then a `+ N more` affordance in `text-terracotta underline`.
7. Section header `STRINGS.recipe_section_instructions` in `text-sm font-semibold`.
8. Numbered instruction list, each step in `text-sm`.
9. Bottom CTA row: two buttons side by side. Left `Swap meal` is `bg-cream border border-ink text-ink`; right `Start cooking` is `bg-ink text-cream font-semibold`.

**Interactions.**

- Tap back chevron → `router.back()`.
- Tap `Swap meal` → trigger paywall route `/paywall` (this is the natural "I want to talk to the coach" moment).
- Tap `Start cooking` → show an inline checkmark toast in `bg-sage-soft text-sage-deep` for 2 seconds: "Locked in. Have at it."
- Tap `+ N more` → expand the full ingredient list inline.

**Acceptance criteria.**

```gherkin
Given a user on `/plan`,
when they tap today's meal card,
then `/recipe/sheet_pan_chicken_sweet_potato` renders with the title, macros, and at least 5 visible ingredients.

Given the recipe detail screen,
when the user taps "Swap meal",
then the paywall route `/paywall` is presented.

Given the recipe detail screen,
when the user taps "Start cooking",
then a toast appears reading "Locked in. Have at it." in sage colors, and disappears after 2 seconds.

Given the recipe detail screen with more than 5 ingredients,
when the user taps "+ 2 more",
then the full ingredient list expands inline and the "+ 2 more" affordance disappears.

Given the macro line,
when rendered for the seed recipe,
then it reads exactly: "45P · 52C · 18F · 540 cal · 30min".
```

---

### 7.4 Grocery list (`/list`)

**Purpose.** Demonstrate the diff-based grocery list — the signature feature beyond meal planning itself. The prototype must show the "Added Saturday long run: + bagels, bananas" diff banner.

**Layout (top to bottom).**

1. Status bar
2. Subhead `STRINGS.grocery_subhead` in `text-xs text-muted`
3. Title `STRINGS.grocery_title` in `text-xl font-bold`
4. Diff banner: `bg-terracotta-soft text-terracotta-deep`, 34px tall, contains `"Added Saturday long run:"` on line 1 and `"+ bagels, bananas"` on line 2 in font-semibold.
5. For each section in `DEMO_GROCERY.sections`:
   - Section header in `text-xs font-semibold text-muted uppercase tracking-wide`
   - Items: checkbox + qty + name. Checked items have `line-through text-muted` styling. Items with `status: "new"` have a 2px sage border on their checkbox and a small `new` label on the right in `text-sage`.
6. Bottom CTA: `Shop with Instacart` full-width button in `bg-terracotta text-white font-semibold`, `rounded-full`, 36px tall.
7. BottomTabBar with `List` active.

**Interactions.**

- Tap any item row → toggle its `checked` state (visual only — state lives in component, not persisted).
- Tap `Shop with Instacart` → opens `https://www.instacart.com` in a new tab. **The link is stubbed for the prototype**; the real product uses affiliate URLs.
- Tap any tab → navigate.

**Acceptance criteria.**

```gherkin
Given a user navigates to `/list`,
when the page renders,
then the diff banner is visible at the top with the text "Added Saturday long run: + bagels, bananas".

Given the grocery list,
when rendered with seed data,
then exactly 3 section headers are visible: PRODUCE, PROTEIN, PANTRY.

Given the grocery list,
when the user taps an unchecked item,
then the item appears with strikethrough styling and the checkbox fills.

Given items with `status: "new"`,
when rendered,
then their checkbox border is sage-colored and a "new" label appears on the right.

Given the grocery list,
when the user taps "Shop with Instacart",
then instacart.com opens in a new tab.
```

---

### 7.5 Paywall (`/paywall`)

**Purpose.** Test whether the coach voice survives the moment where the app is acting in its own commercial interest. This is the most persona-fragile surface in the prototype.

**Layout (top to bottom).**

1. Status bar
2. Close `✕` icon at top-right in `text-muted`, 24px from edges
3. Headline `STRINGS.paywall_headline_l1` / `paywall_headline_l2` in `text-xl font-bold`, 2 lines
4. Sub `STRINGS.paywall_sub_l1` / `paywall_sub_l2` in `text-sm text-muted`, 2 lines
5. Feature list — 4 rows, each with a small sage dot and the feature label in `text-sm`. Use `STRINGS.paywall_feature_*` keys.
6. Two price boxes side-by-side:
   - **Monthly**: `bg-cream border border-hairline`, "Monthly" label, "$9.99", "per month" — all muted/ink.
   - **Annual**: `bg-terracotta-soft border-2 border-terracotta`, "SAVE 34%" badge at top in `text-terracotta-deep`, "Annual", "$79", "per year" — terracotta-deep accents. Pre-selected.
7. CTA `STRINGS.paywall_cta` — full-width `bg-ink text-cream font-semibold` `rounded-full`, 36px tall.
8. Disclaimer `STRINGS.paywall_disclaimer` in `text-xs text-muted`, centered.

**Interactions.**

- Tap close `✕` → `router.back()`.
- Tap a price box → toggles which is selected (visual only).
- Tap CTA → navigate to a `/paywall/accepted` route that renders:
  - Coach bubble `STRINGS.trial_accepted_headline`
  - Sub `STRINGS.trial_accepted_sub` in muted
  - "Back to your plan" link → `/plan`

**Acceptance criteria.**

```gherkin
Given a user on `/recipe/[id]`,
when they tap "Swap meal",
then `/paywall` is presented.

Given the paywall screen,
when rendered,
then the headline reads exactly: "Want to talk to your coach directly?"
and the annual price box is pre-selected with the SAVE 34% badge.

Given the paywall screen,
when the user taps the monthly price box,
then it becomes selected and the annual box becomes unselected (visual only).

Given the paywall screen,
when the user taps "Start 7-day trial",
then they are navigated to `/paywall/accepted`
and see the message "Glad to have you. Let's get into it." in coach voice.

Given the paywall screen,
when the user taps the close icon,
then they are returned to the previous screen.

Given any string in the paywall screen,
when reviewed against the voice review checklist in §6,
then every string passes every checklist item.
```

---

### 7.6 Stub screens (`/coach` and `/discover`)

**Purpose.** Make the tab bar feel complete without building features that need a live LLM or curated brand content.

**Layout.** Centered vertically in the phone frame:
- Headline in `text-lg font-semibold`
- Sub in `text-sm text-muted`, max-width 280px
- Bottom tab bar with the appropriate tab active

**Content.**
- `/coach` → `STRINGS.stub_coach_headline` + `STRINGS.stub_coach_sub`
- `/discover` → `STRINGS.stub_discover_headline` + `STRINGS.stub_discover_sub`

**Acceptance criteria.**

```gherkin
Given a user taps the Coach tab,
when they land on `/coach`,
then they see the stub message "Coach chat opens up with Plus." with the muted sub line.

Given a user taps the Discover tab,
when they land on `/discover`,
then they see the stub message "Discover is where vetted brands live." with the muted sub line.
```

---

## 8. Component Contracts

The reusable components Claude Code should build. Listed in dependency order.

```tsx
// components/PhoneFrame.tsx
interface PhoneFrameProps {
  children: React.ReactNode;
}

// components/BottomTabBar.tsx
type TabKey = "plan" | "list" | "coach" | "discover";
interface BottomTabBarProps {
  active: TabKey;
}

// components/CoachBubble.tsx
interface CoachBubbleProps {
  children: React.ReactNode;
  variant?: "sage" | "tan";  // sage default
  signature?: string;        // optional italic line at bottom
}

// components/MealCard.tsx
interface MealCardProps {
  variant: "today" | "upcoming";
  title: string;
  macroLine: string;
  onPress: () => void;
}

// components/DayChip.tsx
interface DayChipProps {
  letter: string;
  isActive: boolean;
  onPress?: () => void;
}

// components/GroceryItem.tsx
interface GroceryItemProps {
  qty: string;
  name: string;
  checked: boolean;
  status?: "new" | null;
  onToggle: () => void;
}

// components/PricePill.tsx
interface PricePillProps {
  label: string;
  amount: string;
  unit: string;
  badge?: string;        // e.g. "SAVE 34%"
  selected: boolean;
  onPress: () => void;
}

// components/Button.tsx
interface ButtonProps {
  variant: "primary" | "secondary";
  label: string;
  fullWidth?: boolean;
  onPress: () => void;
}

// components/Toast.tsx
interface ToastProps {
  message: string;
  visible: boolean;
  variant?: "sage";  // default
}

// components/DemoControls.tsx — prototype-only, removed before iOS port
interface DemoControlsProps {
  activeWeek: "week_1" | "week_3";
  onSelect: (week: "week_1" | "week_3") => void;
}
```

**Component invariants:**

- No component reads from `localStorage`, `window`, `fetch`, or any browser API. State is passed in as props.
- All onPress handlers are typed `() => void`. No event objects exposed in component contracts.
- Every component file exports a single default function component and its props interface.
- No inline styles. All styling via Tailwind classes.

---

## 9. State Management

Minimum viable state. No Redux, no Zustand, no Context.

- **Onboarding completion**: `localStorage` key `pp_onboarded`. Read/written only in route components (`app/page.tsx`).
- **Demo week toggle**: a single `useState` in `app/plan/page.tsx` controlling Week 1 vs. Week 3 coach context.
- **Grocery checkbox state**: `useState` array in `app/list/page.tsx`. Not persisted — refresh resets.
- **Paywall price selection**: `useState` in `app/paywall/page.tsx`. Not persisted.
- **Toast visibility**: `useState` + `setTimeout` in `app/recipe/[id]/page.tsx`.

No global state. If a refresh resets prototype state, that's acceptable.

---

## 10. Deployment

### Vercel setup

1. Push initial commit to a new GitHub repo (`pantry-pal-prototype`, private).
2. Connect repo to Vercel (free tier, personal account).
3. Configure custom subdomain: `pantrypal-preview.vercel.app` (or similar).
4. Set environment variable: `NEXT_PUBLIC_PROTOTYPE_VERSION = "0.1"` (rendered in footer for visitor sanity).
5. Auto-deploy on push to `main`. No staging environment needed.

### Pre-deploy checklist

- [ ] All strings in `STRINGS` catalogue pass the voice review checklist (§6).
- [ ] All 6 placeholder recipes have been replaced with the founder's actual recipes (or explicitly approved as placeholder for the first round of feedback).
- [ ] Recipe photographs are taken in natural light, on real surfaces, not stock.
- [ ] Lighthouse score for `/plan` is ≥85 on mobile.
- [ ] Visited on a real iPhone in Safari to confirm the phone-frame illusion works at the viewport size.
- [ ] No console errors on any of the 5 routes.
- [ ] Footer reads "Pantry Pal — Prototype. Not a shipped product."

---

## 11. Out of Scope (Deferred to iOS)

The following are explicitly NOT in the prototype and should not be built. Each maps to a future iOS spec.

| Feature | Reason for deferral | Where it lives later |
|---|---|---|
| Real LLM coach chat | Needs live API + cost monitoring | iOS H2 (Plus tier) |
| Live HealthKit data | Web has no HealthKit | iOS H1 (P0) |
| Real auth (Apple Sign-In, magic link) | Not needed for single-user demo | iOS Phase 1 |
| Real payment | App Store handles | iOS Phase 2 |
| Push notifications | Web push is fragile and off-spec | iOS H1 (P0) |
| Weekly check-in flow | Doesn't reveal much as static mockup | iOS H1 (P0) |
| Pantry inventory | Plus-tier feature, H2 | iOS H2 (Plus) |
| Voice check-ins / voice coach | Latency/cost reasons | iOS H2 / H3 |
| Discover marketplace | Brand-sales motion required | iOS H2/H3 |
| Multi-week plan history | Single demo week is enough for prototype | iOS H2 |

---

## 12. Acceptance — Definition of "Prototype Done"

The prototype is shippable to friends-and-family when **all** of the following are true:

1. All five primary screens (`/`, `/plan`, `/recipe/[id]`, `/list`, `/paywall`) render correctly in mobile Safari and Chrome.
2. Both stub screens (`/coach`, `/discover`) render with their stub copy.
3. Every acceptance criterion in §7 passes.
4. Every string in §6 passes the voice review checklist.
5. The Week 1 / Week 3 demo toggle changes the coach context line on `/plan`.
6. The diff banner on `/list` shows the seed data text.
7. The paywall flow (tap "Swap meal" → see paywall → tap CTA → see coach acceptance) works end-to-end.
8. Deployed to Vercel at a shareable URL.
9. Founder has personally walked through the prototype on their own phone and is comfortable showing it to 5 friends.
10. The "things you might not have thought of" items from `pantry_pal_spec_v0.1.html` §18 that affect the prototype (multi-device sync, push permission UX) are not present here — that's correct. They're iOS concerns.

---

## 13. What This Spec Does Not Decide

These remain explicitly **open** and should be resolved during the prototype build or before iOS work begins:

1. **Exact display typeface.** Inter is locked for UI; the display serif is a placeholder until the founder picks between Tiempos Headline (paid) and Source Serif 4 (free).
2. **Recipe photography licensing or rights.** Placeholder recipes use placeholder images. Founder must shoot or license actual photos before the prototype is shared widely.
3. **What happens after `/paywall/accepted` for the prototype.** Current spec routes back to `/plan`. Acceptable; not load-bearing.
4. **Whether the demo-controls toggle ships in the public prototype.** Recommended: yes, with a small "demo" label. It demonstrates the felt-experience model in 5 seconds.
5. **Analytics on the prototype.** None for the friends-and-family stage. Add Plausible or PostHog before any public sharing.

---

## 14. Handoff to iOS

When the prototype validates positively (operationally: 3 of 5 friends-and-family viewers say something like "this would actually help me" without prompting), the iOS handoff brief is:

1. Port `tailwind.config.ts` design tokens to NativeWind tokens.
2. Port each component from `components/` to React Native primitives. Most ports are 1:1 (`<View>` for `<div>`, `<Pressable>` for `<button>`, `<Text>` for inline text).
3. Replace `next/navigation` with `expo-router`.
4. Replace web `<img>` with `expo-image`.
5. Add the surfaces deferred in §11 as new spec files in `specs/features/`.
6. Begin work on the blocking iOS decisions in `pantry_pal_spec_v0.1.html` §16 — Convex vs. Supabase, meal-flex engine strategy, auth, privacy policy.

---

## Appendix: File Manifest

The Claude Code agent should create the following files. This is the complete file manifest for the prototype.

```
pantry-pal-prototype/
├── app/
│   ├── layout.tsx               # Root layout, fonts, metadata
│   ├── page.tsx                 # Onboarding screen + redirect logic
│   ├── plan/page.tsx            # Weekly plan home
│   ├── recipe/[id]/page.tsx     # Recipe detail
│   ├── list/page.tsx            # Grocery list
│   ├── coach/page.tsx           # Stub
│   ├── discover/page.tsx        # Stub
│   ├── paywall/page.tsx         # Plus paywall
│   └── paywall/accepted/page.tsx # Post-trial-accepted state
├── components/
│   ├── PhoneFrame.tsx
│   ├── BottomTabBar.tsx
│   ├── CoachBubble.tsx
│   ├── MealCard.tsx
│   ├── DayChip.tsx
│   ├── GroceryItem.tsx
│   ├── PricePill.tsx
│   ├── Button.tsx
│   ├── Toast.tsx
│   └── DemoControls.tsx
├── lib/
│   ├── seedData.ts              # DEMO_USER, DEMO_WEEK, DEMO_GROCERY, RECIPES, DEMO_WEEKS
│   └── coachStrings.ts          # STRINGS catalogue
├── public/
│   └── recipes/                 # Recipe photos (placeholder → founder's actuals)
├── tailwind.config.ts           # Design tokens
├── next.config.js
├── package.json
├── tsconfig.json
└── README.md                    # Setup, deploy, link to this spec
```

---

*End of spec. Version 0.1, May 29, 2026. Owner: Joe Fehr. Parent: `pantry_pal_spec_v0.1.html` (anchor doc for all decisions not made here).*
