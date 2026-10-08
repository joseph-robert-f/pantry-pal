// Seed content (spec §5). All content hard-coded for the prototype.
//
// PLACEHOLDER — REPLACE WITH FOUNDER'S ACTUAL RECIPES, PHOTOS, AND VERIFIED
// MACROS (USDA FoodData Central) before sharing with friends-and-family.
// The structure below is what the iOS schema will expect.

export const DEMO_USER = {
  name: "Joe", // shown nowhere in UI; for internal reference only
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

export type Macros = {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
};

export type Ingredient = { qty: string; name: string };

export type Recipe = {
  id: string;
  title: string;
  photoUrl: string;
  timeMin: number;
  servings: number;
  macros: Macros;
  tags: string[];
  ingredients: Ingredient[];
  instructions: string[];
};

// The active plan shown on /plan.
export const DEMO_WEEK = {
  weekOf: "May 25",
  coachContext: "Heavier lift week + Sat long run. Bumped Friday carbs accordingly.",
  days: [
    { day: "M", isToday: false, dinner: "monday_chicken" },
    { day: "T", isToday: true, dinner: "sheet_pan_chicken_sweet_potato" },
    { day: "W", isToday: false, dinner: "salmon_bowls" },
    { day: "T", isToday: false, dinner: "ground_beef_stir_fry" },
    { day: "F", isToday: false, dinner: "carb_forward_pasta" },
    { day: "S", isToday: false, dinner: "weekend_recovery_eggs" },
  ],
};

export const RECIPES: Recipe[] = [
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
  {
    id: "monday_chicken",
    title: "Lemon-herb chicken & greens",
    photoUrl: "/recipes/monday-chicken.jpg",
    timeMin: 25,
    servings: 2,
    macros: { kcal: 430, protein: 42, carbs: 18, fat: 22 },
    tags: ["rest_day", "stovetop", "25min"],
    ingredients: [
      { qty: "1 lb", name: "chicken breast" },
      { qty: "1 big bag", name: "spinach" },
      { qty: "2 tbsp", name: "olive oil" },
      { qty: "2 cloves", name: "garlic" },
      { qty: "1", name: "lemon" },
      { qty: "to taste", name: "salt & pepper" },
    ],
    instructions: [
      "Season chicken and sear 5–6 min a side until cooked through.",
      "Rest the chicken; wilt spinach with garlic in the same pan.",
      "Slice chicken over the greens, finish with lemon.",
    ],
  },
  {
    id: "salmon_bowls",
    title: "Salmon rice bowls",
    photoUrl: "/recipes/salmon-bowls.jpg",
    timeMin: 30,
    servings: 2,
    macros: { kcal: 560, protein: 40, carbs: 55, fat: 20 },
    tags: ["lift_day", "oven", "leftover_friendly"],
    ingredients: [
      { qty: "2", name: "salmon filets" },
      { qty: "1 cup", name: "rice (dry)" },
      { qty: "1", name: "cucumber" },
      { qty: "2", name: "avocados" },
      { qty: "2 tbsp", name: "soy sauce" },
      { qty: "1 tbsp", name: "sesame oil" },
      { qty: "1 tsp", name: "rice vinegar" },
    ],
    instructions: [
      "Cook the rice.",
      "Roast salmon at 400°F for 12–14 min.",
      "Whisk soy, sesame oil, and vinegar into a quick sauce.",
      "Build bowls: rice, salmon, sliced cucumber and avocado, drizzle.",
    ],
  },
  {
    id: "ground_beef_stir_fry",
    title: "Ground beef & veg stir-fry",
    photoUrl: "/recipes/beef-stir-fry.jpg",
    timeMin: 20,
    servings: 2,
    macros: { kcal: 510, protein: 38, carbs: 30, fat: 26 },
    tags: ["hard_day", "stovetop", "20min"],
    ingredients: [
      { qty: "1 lb", name: "ground beef (90/10)" },
      { qty: "1 bag", name: "stir-fry vegetables" },
      { qty: "2 tbsp", name: "soy sauce" },
      { qty: "1 tbsp", name: "sesame oil" },
      { qty: "1 tbsp", name: "fresh ginger" },
      { qty: "2 cloves", name: "garlic" },
    ],
    instructions: [
      "Brown the beef in a hot pan; drain if needed.",
      "Add garlic, ginger, and vegetables; stir-fry 4–5 min.",
      "Splash in soy and sesame oil, toss, serve over rice if you like.",
    ],
  },
  {
    id: "carb_forward_pasta",
    title: "Carb-forward chicken pasta",
    photoUrl: "/recipes/carb-pasta.jpg",
    timeMin: 30,
    servings: 2,
    macros: { kcal: 640, protein: 40, carbs: 78, fat: 18 },
    tags: ["pre_long_run", "stovetop", "30min"],
    ingredients: [
      { qty: "8 oz", name: "pasta" },
      { qty: "1 lb", name: "chicken breast" },
      { qty: "2 cups", name: "marinara" },
      { qty: "2 tbsp", name: "olive oil" },
      { qty: "1/4 cup", name: "parmesan" },
      { qty: "handful", name: "fresh basil" },
    ],
    instructions: [
      "Boil pasta to al dente; reserve a splash of pasta water.",
      "Sear sliced chicken in olive oil until cooked.",
      "Warm marinara with the chicken, toss with pasta and a little water.",
      "Finish with parmesan and basil.",
    ],
  },
  {
    id: "weekend_recovery_eggs",
    title: "Recovery eggs & toast",
    photoUrl: "/recipes/recovery-eggs.jpg",
    timeMin: 15,
    servings: 1,
    macros: { kcal: 480, protein: 28, carbs: 42, fat: 22 },
    tags: ["recovery_day", "stovetop", "15min"],
    ingredients: [
      { qty: "3", name: "eggs" },
      { qty: "2 slices", name: "sourdough" },
      { qty: "1", name: "avocado" },
      { qty: "1 tbsp", name: "butter" },
      { qty: "to taste", name: "salt, pepper, chili flakes" },
    ],
    instructions: [
      "Toast the bread.",
      "Soft-scramble the eggs in butter, low and slow.",
      "Smash avocado on toast, pile on eggs, season.",
    ],
  },
];

// Grocery list inputs for the demo week (plan #J1). The list itself is built
// by lib/grocery from these inputs — see lib/demoGrocery.ts. Nothing on the
// list is hand-written any more.

// Non-recipe plan events that add items to the list.
export const TRAINING_EVENTS = [
  {
    id: "sat_long_run",
    addItems: [
      { qty: "4-pack", name: "bagels" },
      { qty: "3", name: "bananas" },
    ],
  },
];

// Last week's version of the plan, before the Saturday long run was added.
// The diff banner compares the list for DEMO_PLAN against this one.
export const DEMO_PLAN_PREVIOUS = {
  recipeIds: DEMO_WEEK.days.map((d) => d.dinner),
  eventIds: [] as string[],
};

export const DEMO_PLAN = {
  recipeIds: DEMO_WEEK.days.map((d) => d.dinner),
  eventIds: ["sat_long_run"],
};

// Sample receipt for the "Try a sample receipt" demo (receipt pipeline step 1).
// OCR-style text: store header, abbreviations, a continuation line, a coupon,
// a non-food item, a food item not on the list, totals, and payment.
export const DEMO_RECEIPT = `GREEN VALLEY MARKET
1200 MAIN ST
10/04/2026 18:22
KS ORG BNLS SKNLS CHKN BRST 24.99 F
CHKN THGH BNLS
1.52 lb @ 3.49/lb 5.30
ATL SALMON FLT 12.98 F
BABY SPNCH 16OZ 4.49 F
HASS AVOCADO 3CT 5.49 F
BANANAS ORG
3 @ 0.29 0.87
THMS EVRYTHNG BAGEL 6PK 4.99 F
RAOS MARINARA 24OZ 8.99 F
MFR COUPON -1.00
PARM REGG WEDGE 7.49 F
CLIF BAR CHOC CHIP 1.79 F
GV DISH SOAP 2.97
SUBTOTAL 79.35
TAX 0.24
TOTAL 79.59
VISA ************4321`;

// Items shown pre-checked so the demo shows the strikethrough state.
export const DEMO_CHECKED_IDS = ["lemon"];

// Two-week demo toggle (spec §5) — demonstrates the felt-experience trend.
export const DEMO_WEEKS = {
  week_1: {
    coachContext:
      "Energy was dragging this week — let's go slightly lighter on the lifts and lean into rest. I left dinners simple.",
    energyState: "dragging" as const,
  },
  week_3: {
    coachContext:
      "Energy's been trending up three weeks running. Bumping protein a notch and adding a heavier Tuesday lift.",
    energyState: "trending_up" as const,
  },
};

export type DemoWeekKey = keyof typeof DEMO_WEEKS;

export function getRecipe(id: string): Recipe | undefined {
  return RECIPES.find((r) => r.id === id);
}
