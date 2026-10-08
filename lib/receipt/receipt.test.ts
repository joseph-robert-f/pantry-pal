import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ASK,
  AUTO_TICK,
  NONE,
  decide,
  matchReceipt,
  parseReceipt,
  receiptLineRequest,
  summarizeReceipt,
  verifyRequest,
  type ListItemRef,
  type ReceiptTransport,
} from "./index.ts";
import type { SystemOneResponse } from "../jev/api.ts";

// --- parse ------------------------------------------------------------------

const COSTCO = `COSTCO WHOLESALE
STORE #123 SEATTLE WA
1234567 KS ORG BNLS SKNLS CHKN BRST 24.99 E
987654 HASS AVOCADO 3CT 5.49
SUBTOTAL 30.48
TAX 0.00
TOTAL 30.48
VISA ************4321
10/07/2026 14:32
ITEMS SOLD 2`;

test("parse keeps product lines and drops header, totals, payment, dates", () => {
  const lines = parseReceipt(COSTCO);
  assert.deepEqual(lines.map((l) => l.text), ["KS ORG BNLS SKNLS CHKN BRST", "HASS AVOCADO 3CT"]);
  assert.equal(lines[0].price, 24.99);
  assert.equal(lines[1].price, 5.49);
});

test("parse attaches quantity and weight continuation lines", () => {
  const lines = parseReceipt(`BANANAS ORG
3 @ 0.29 0.87
CHKN THGH BNLS
1.52 lb @ 3.49/lb 5.30`);
  assert.deepEqual(lines.map((l) => [l.text, l.qty, l.weightLb, l.price]), [
    ["BANANAS ORG", 3, null, 0.87],
    ["CHKN THGH BNLS", null, 1.52, 5.3],
  ]);
});

test("parse reads inline quantity and weight", () => {
  const [a, b] = parseReceipt("LIMES 3 @ .33 0.99\nSWT POTATO 2.1LB @1.29 2.71");
  assert.equal(a.qty, 3);
  assert.equal(b.weightLb, 2.1);
  assert.equal(b.price, 2.71);
});

test("parse drops coupons, discounts, and lines with no words", () => {
  const lines = parseReceipt(`RAOS MARINARA 24OZ 8.99
INSTANT SAVINGS -1.50
MFR COUPON -1.00
0001234567890
-------------
GRND BF 90/10 1LB 6.49 F`);
  assert.deepEqual(lines.map((l) => l.text), ["RAOS MARINARA 24OZ", "GRND BF 90/10 1LB"]);
});

test("parse converts kg to lb", () => {
  const [l] = parseReceipt("CHICKEN THIGHS\n0.69 kg @ 7.70/kg 5.31");
  assert.equal(l.weightLb, 1.52);
});

test("parse keeps unpriced items that have a quantity or weight line, and reads lower-case tax flags", () => {
  assert.deepEqual(parseReceipt("BANANAS ORG\n3 @ 0.29\nMILK 3.99").map((l) => l.text), ["BANANAS ORG", "MILK"]);
  assert.deepEqual(parseReceipt("bananas 0.87 f\nmilk 3.99").map((l) => [l.text, l.price]), [["bananas", 0.87], ["milk", 3.99]]);
});

test("parse keeps food whose name contains receipt words", () => {
  const text = "KOOL-AID JAMMERS 3.49\nBALANCE BAR 1.99\nTOTAL CEREAL 4.29\nCASHEWS 6.99\nSTORE BRAND OATS 2.49";
  assert.deepEqual(parseReceipt(text).map((l) => l.text), ["KOOL-AID JAMMERS", "BALANCE BAR", "TOTAL CEREAL", "CASHEWS", "STORE BRAND OATS"]);
});

test("parse drops receipt-only lines that start with the same words", () => {
  const text = "MILK 3.99\nBALANCE DUE 12.30\nTOTAL 20.75\nCHANGE DUE 0.00\nCASH TENDERED 21.00\nAID A0000000031010\nCASHIER: JANE\nYOU SAVED 2.00\nTHANK YOU FOR SHOPPING";
  assert.deepEqual(parseReceipt(text).map((l) => l.text), ["MILK"]);
});

test("parse treats unpriced lines above the first item as header (store name, address)", () => {
  assert.deepEqual(parseReceipt("chicken breast\nbananas 0.87\nmilk 3.99").map((l) => l.text), ["bananas", "milk"]);
});

// --- match ------------------------------------------------------------------

const ITEMS: ListItemRef[] = [
  { id: "chicken_breast", name: "chicken breast" },
  { id: "avocado", name: "avocados" },
  { id: "banana", name: "bananas" },
  { id: "lemon", name: "lemons" },
];

// Fake Jev. Match requests answer from `table`; verify requests (v3) answer
// "same product" (score 2) unless the line is listed in `related`.
function fakeJev(table: Record<string, [string, number, number]>, related: string[] = []): ReceiptTransport {
  return async (body): Promise<SystemOneResponse> => {
    const line = (body.state as { receipt_line: string }).receipt_line;
    if ("same" in body.questions) {
      const score = related.includes(line) ? 1 : 2;
      return { model: "jev-1.13.0", answers: { same: { type: "score", score, confidence: 1, probabilities: {} } } };
    }
    const [choice, confidence, food] = table[line] ?? [NONE, 1, 0];
    if (choice === "THROW") throw new Error("Jev 500");
    return {
      model: "jev-1.13.0",
      answers: {
        match: { type: "choice", choice, confidence, probabilities: { [choice]: confidence } },
        is_food: { type: "noul", noul: food },
      },
    };
  };
}

test("the request offers every list item plus NONE, and sends only the product text", () => {
  const body = receiptLineRequest("HASS AVOCADO 3CT", ITEMS.map((i) => i.name));
  const match = body.questions.match;
  assert.equal(match.type, "choice");
  assert.deepEqual(Object.keys(match.criteria as object), ["chicken breast", "avocados", "bananas", "lemons", NONE]);
  assert.equal((body.state as { receipt_line: string }).receipt_line, "HASS AVOCADO 3CT");
});

test("decide: thresholds and the food check", () => {
  assert.equal(decide(true, AUTO_TICK, 1), "tick");
  assert.equal(decide(true, AUTO_TICK - 0.01, 1), "ask");
  assert.equal(decide(true, ASK, 1), "ask");
  assert.equal(decide(true, ASK - 0.01, 1), "unmatched");
  assert.equal(decide(false, 1, 0.9), "unmatched");
  assert.equal(decide(false, 1, 0.1), "ignore");
});

test("matchReceipt maps answers to actions", async () => {
  const lines = parseReceipt("KS CHKN BRST\nHASS AVO\nGV DISH SOAP\nCLIF BAR\nLIMES");
  const out = await matchReceipt(lines, ITEMS, fakeJev({
    "KS CHKN BRST": ["chicken breast", 1, 0.95],
    "HASS AVO": ["avocados", 0.8, 0.99],
    "GV DISH SOAP": [NONE, 1, 0.04],
    "CLIF BAR": [NONE, 1, 0.98],
    "LIMES": [NONE, 0.9, 0.96],
  }));
  assert.deepEqual(out.map((m) => [m.line.text, m.item?.id ?? null, m.action]), [
    ["KS CHKN BRST", "chicken_breast", "tick"],
    ["HASS AVO", "avocado", "ask"],
    ["GV DISH SOAP", null, "ignore"],
    ["CLIF BAR", null, "unmatched"],
    ["LIMES", null, "unmatched"],
  ]);
});

test("v3 verify step turns a 'made from' pick into not-on-list", async () => {
  const lines = parseReceipt("PARMESAN CRISPS\nKS CHKN BRST");
  const items = [...ITEMS, { id: "parmesan", name: "parmesan" }];
  const out = await matchReceipt(lines, items, fakeJev({
    "PARMESAN CRISPS": ["parmesan", 0.99, 0.97],
    "KS CHKN BRST": ["chicken breast", 1, 0.95],
  }, ["PARMESAN CRISPS"]));
  assert.deepEqual(out.map((m) => [m.item?.id ?? null, m.action]), [
    [null, "unmatched"],
    ["chicken_breast", "tick"],
  ]);
});

test("verify requests carry only the line and the picked item", () => {
  const body = verifyRequest("EGG WHITES 32OZ", "eggs");
  assert.deepEqual(Object.keys(body.questions), ["same"]);
  const st = body.state as { receipt_line: string; shopping_list_item: string };
  assert.equal(st.receipt_line, "EGG WHITES 32OZ");
  assert.equal(st.shopping_list_item, "eggs");
});

test("decide: a low-confidence pick on a non-food line is ignored, not shown", () => {
  assert.equal(decide(true, 0.5, 0.04), "ignore");
  assert.equal(decide(true, 0.5, 0.9), "unmatched");
});

test("verify runs only when the pick could act (confidence ≥ ASK)", async () => {
  let verifies = 0;
  const base = fakeJev({ "LOW": ["bananas", ASK - 0.1, 0.9], "HIGH": ["bananas", 0.95, 0.9] });
  const counting: ReceiptTransport = async (body) => {
    if ("same" in body.questions) verifies++;
    return base(body);
  };
  await matchReceipt(parseReceipt("LOW\nHIGH"), ITEMS, counting);
  assert.equal(verifies, 1);
});

test("lines past the deadline are answered by rules", async () => {
  const out = await matchReceipt(parseReceipt("ORGANIC BANANAS"), ITEMS, fakeJev({ "ORGANIC BANANAS": ["bananas", 1, 1] }), {
    deadline: Date.now() - 1,
  });
  assert.deepEqual([out[0].source, out[0].action], ["rules", "ask"]);
});

test("when Jev fails, rules can only ask, never tick", async () => {
  const lines = parseReceipt("ORGANIC BANANAS\nMYSTERY THING");
  const out = await matchReceipt(lines, ITEMS, fakeJev({ "ORGANIC BANANAS": ["THROW", 0, 0], "MYSTERY THING": ["THROW", 0, 0] }));
  assert.deepEqual(out.map((m) => [m.item?.id ?? null, m.action, m.source]), [
    ["banana", "ask", "rules"],
    [null, "unmatched", "rules"],
  ]);
});

test("with no transport (no key), rules answer", async () => {
  const out = await matchReceipt(parseReceipt("CHICKEN BREAST BNLS"), ITEMS, null);
  assert.deepEqual([out[0].item?.id, out[0].action], ["chicken_breast", "ask"]);
});

// --- summary ----------------------------------------------------------------

test("summary: ticks, questions, unmatched, ignored, still need", async () => {
  const lines = parseReceipt("KS CHKN BRST\nHASS AVO\nAVOCADO BAG\nGV DISH SOAP\nCLIF BAR");
  const out = await matchReceipt(lines, ITEMS, fakeJev({
    "KS CHKN BRST": ["chicken breast", 1, 0.95],
    "HASS AVO": ["avocados", 0.8, 0.99], // asked …
    "AVOCADO BAG": ["avocados", 0.95, 0.99], // … but another line ticks it
    "GV DISH SOAP": [NONE, 1, 0.04],
    "CLIF BAR": [NONE, 1, 0.98],
  }));
  const s = summarizeReceipt(out, ITEMS);
  assert.deepEqual(s.tickIds.sort(), ["avocado", "chicken_breast"]);
  assert.deepEqual(s.ask, []);
  assert.deepEqual(s.unmatched, ["CLIF BAR"]);
  assert.equal(s.ignored, 1);
  assert.deepEqual(s.stillNeed.map((i) => i.id), ["banana", "lemon"]);
});

test("summary shows product text without the price", async () => {
  const lines = parseReceipt("RAOS MARINARA 24OZ 8.99 F\nCLIF BAR CHOC CHIP 1.79 F");
  const out = await matchReceipt(lines, ITEMS, fakeJev({ "RAOS MARINARA 24OZ": [NONE, 1, 0.97], "CLIF BAR CHOC CHIP": [NONE, 1, 0.98] }));
  assert.deepEqual(summarizeReceipt(out, ITEMS).unmatched, ["RAOS MARINARA 24OZ", "CLIF BAR CHOC CHIP"]);
});
