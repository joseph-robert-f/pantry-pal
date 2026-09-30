import { test } from "node:test";
import assert from "node:assert/strict";
import {
  CONFIDENCE_THRESHOLD,
  createApiClassifier,
  createJevClassifier,
  type JevTransport,
} from "./index.ts";
import type { SystemOneRequest } from "./jevQuestions.ts";

// Fake Jev: answers from a table, records what it was asked.
function fakeJev(table: Record<string, [string, number]>) {
  const asked: string[] = [];
  const send: JevTransport = async (body: SystemOneRequest) => {
    const item = (body.state as { item: string }).item;
    asked.push(item);
    const row = table[item];
    if (!row) throw new Error("Jev 500");
    const [choice, confidence] = row;
    return {
      model: "jev-1.13.0",
      answers: { section: { type: "choice", choice, confidence, probabilities: { [choice]: confidence } } },
    };
  };
  return { send, asked };
}

test("catalogue items never reach Jev", async () => {
  const jev = fakeJev({});
  const out = await createJevClassifier({ send: jev.send }).classify(["bananas", "Salmon Fillets"]);
  assert.deepEqual(jev.asked, []);
  assert.equal(out["bananas"].source, "catalogue");
  assert.equal(out["Salmon Fillets"].section, "PROTEIN");
});

test("a confident Jev answer is used as is", async () => {
  const jev = fakeJev({ "pedialyte": ["BEVERAGES", 0.93] });
  const out = await createJevClassifier({ send: jev.send }).classify(["pedialyte"]);
  assert.deepEqual(out["pedialyte"], {
    section: "BEVERAGES",
    isStaple: false,
    confidence: 0.93,
    source: "jev",
    needsReview: false,
  });
});

test("below the threshold, keep Jev's choice and flag it for review", async () => {
  const jev = fakeJev({ "egg bites": ["FROZEN", CONFIDENCE_THRESHOLD - 0.01] });
  const out = await createJevClassifier({ send: jev.send }).classify(["egg bites"]);
  assert.equal(out["egg bites"].section, "FROZEN");
  assert.equal(out["egg bites"].needsReview, true);
});

test("at exactly the threshold, no review flag", async () => {
  const jev = fakeJev({ "egg bites": ["DAIRY", CONFIDENCE_THRESHOLD] });
  const out = await createJevClassifier({ send: jev.send }).classify(["egg bites"]);
  assert.equal(out["egg bites"].needsReview, false);
});

test("when Jev fails, answer from rules and do not cache the failure", async () => {
  const jev = fakeJev({});
  const cache = new Map();
  const out = await createJevClassifier({ send: jev.send, cache }).classify(["frozen dumplings"]);
  assert.equal(out["frozen dumplings"].source, "rules");
  assert.equal(out["frozen dumplings"].section, "FROZEN");
  assert.equal(cache.size, 0);
});

test("an answer outside the section list falls back to rules", async () => {
  const jev = fakeJev({ "oat milk": ["DELI", 0.99] });
  const out = await createJevClassifier({ send: jev.send }).classify(["oat milk"]);
  assert.equal(out["oat milk"].source, "rules");
});

test("repeat names hit the cache, including different spacing and case", async () => {
  const jev = fakeJev({ "tahini": ["PANTRY", 0.97], "Tahini ": ["PANTRY", 0.97] });
  const classifier = createJevClassifier({ send: jev.send });
  await classifier.classify(["tahini", "tahini"]);
  await classifier.classify(["Tahini "]);
  assert.deepEqual(jev.asked, ["tahini"]);
});

test("concurrency cap is respected", async () => {
  let inFlight = 0;
  let peak = 0;
  const send: JevTransport = async () => {
    inFlight++;
    peak = Math.max(peak, inFlight);
    await new Promise((r) => setTimeout(r, 5));
    inFlight--;
    return { model: "m", answers: { section: { type: "choice", choice: "PANTRY", confidence: 1, probabilities: {} } } };
  };
  const names = Array.from({ length: 12 }, (_, i) => `mystery item ${i}`);
  const out = await createJevClassifier({ send, concurrency: 3 }).classify(names);
  assert.equal(Object.keys(out).length, 12);
  assert.ok(peak <= 3, `peak ${peak}`);
});

test("the cache stays bounded", async () => {
  const table = Object.fromEntries(["a1", "a2", "a3"].map((n) => [n, ["PANTRY", 0.9] as [string, number]]));
  const jev = fakeJev(table);
  const cache = new Map();
  await createJevClassifier({ send: jev.send, cache, maxCacheSize: 2 }).classify(["a1", "a2", "a3"]);
  assert.equal(cache.size, 2);
});

// --- browser client -------------------------------------------------------

test("api client returns the route's answers", async () => {
  const fetchFn = (async () =>
    new Response(JSON.stringify({ results: { tahini: { section: "PANTRY", isStaple: false, confidence: 0.97, source: "jev", needsReview: false } } }))) as typeof fetch;
  const out = await createApiClassifier(fetchFn).classify(["tahini"]);
  assert.equal(out["tahini"].source, "jev");
});

test("api client falls back to rules when the route fails or is offline", async () => {
  const down = (async () => new Response("", { status: 500 })) as typeof fetch;
  const offline = (async () => { throw new TypeError("Failed to fetch"); }) as typeof fetch;
  for (const fetchFn of [down, offline]) {
    const out = await createApiClassifier(fetchFn).classify(["frozen peas"]);
    assert.equal(out["frozen peas"].source, "rules");
    assert.equal(out["frozen peas"].section, "FROZEN");
  }
});
