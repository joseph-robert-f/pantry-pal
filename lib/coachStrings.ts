// Coach Voice — String Catalogue (spec §6).
//
// Every visible string in the prototype is the coach's voice and lives here so
// a copy reviewer can audit all strings in one place before deploy.
// NO string lives in component code that isn't in this catalogue.

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
  recipe_cook_toast: "Locked in. Have at it.",

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
  stub_discover_sub:
    "Walled off from the coach. Always labeled. Coming with the App Store launch.",

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

export type StringKey = keyof typeof STRINGS;
