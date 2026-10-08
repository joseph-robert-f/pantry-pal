// Receipt-line matching eval (receipt pipeline step 1, plan §4).
//
//   npm run eval:receipt                      # tuning set, replays cache
//   npm run eval:receipt -- --dataset holdout
//   npm run eval:receipt -- --live            # new API calls
//   npm run eval:receipt -- --questions v1    # an older question wording
//
// Each labeled line runs through the production matcher (matchReceipt)
// against the demo shopping list. A line counts as correct when the app's
// outcome is right: tick or ask the right item, or leave it off the list.
// Reports match accuracy, auto-tick precision by threshold (a wrong auto-tick
// is the costly error), and the food check on lines that are not on the list.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { DEMO_GROCERY } from "../lib/demoGrocery.ts";
import { JEV_MODEL } from "../lib/jev/api.ts";
import {
  ASK,
  AUTO_TICK,
  IS_FOOD,
  NONE,
  RECEIPT_QUESTIONS,
  matchReceipt,
  type ReceiptQuestionVersion,
} from "../lib/receipt/match.ts";
import type { ReceiptLine } from "../lib/receipt/parse.ts";
import { createCachedJevClient } from "./jevClient.ts";

const arg = (name: string, fallback: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
};
const dataset = arg("dataset", "lines");
const version = arg("questions", RECEIPT_QUESTIONS) as ReceiptQuestionVersion;
const live = process.argv.includes("--live");
const runName = `${JEV_MODEL}_${version}_${dataset}`;

type Row = { line: string; accept: string[]; food: boolean };
const rows: Row[] = readFileSync(`eval/receipt/${dataset}.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const names = DEMO_GROCERY.sections.flatMap((s) => s.items.map((i) => i.name));

const client = createCachedJevClient(`eval/receipt/cache/${runName}.json`, { live });
// The production matcher, with the cached client as its transport, so the
// eval measures exactly what /api/receipt does.
const lines: ReceiptLine[] = rows.map((r) => ({ raw: r.line, text: r.line, qty: null, weightLb: null, price: null }));
const items = names.map((name) => ({ id: name, name }));
const matches = await matchReceipt(lines, items, client.ask, { version });
client.save();

const scored = rows.map((r, i) => {
  const m = matches[i];
  // What the app does: tick/ask an item, or treat the line as not on the list.
  const outcome = m.item && (m.action === "tick" || m.action === "ask") ? m.item.name : NONE;
  const onList = r.accept.some((a) => a !== NONE);
  return {
    ...r,
    choice: outcome,
    confidence: m.confidence,
    foodP: m.isFood,
    correct: r.accept.includes(outcome),
    onList,
    picked: outcome !== NONE,
    action: m.action,
    verify: m.verify ?? null,
    source: m.source,
  };
});
if (scored.some((s) => s.source !== "jev")) throw new Error("Some lines fell back to rules: check the key or cache.");

const pct = (n: number) => (Number.isFinite(n) ? `${(n * 100).toFixed(1)}%` : "—");
const frac = (num: number, den: number) => (den ? num / den : NaN);

// Auto-tick precision/coverage by threshold.
const sweep = [0.5, 0.7, 0.8, 0.85, 0.9, 0.95, 0.99].map((t) => {
  const ticked = scored.filter((s) => s.picked && s.confidence >= t);
  const wrong = ticked.filter((s) => !s.correct);
  const onList = scored.filter((s) => s.onList);
  return {
    threshold: t,
    ticks: ticked.length,
    wrongTicks: wrong.length,
    precision: frac(ticked.length - wrong.length, ticked.length),
    coverage: frac(ticked.filter((s) => s.correct).length, onList.length),
  };
});

const notOnList = scored.filter((s) => !s.onList);
const report = {
  run: runName,
  date: new Date().toISOString().slice(0, 10),
  lines: scored.length,
  listItems: names.length,
  thresholds: { autoTick: AUTO_TICK, ask: ASK, isFood: IS_FOOD },
  matchAccuracy: frac(scored.filter((s) => s.correct).length, scored.length),
  onListAccuracy: frac(scored.filter((s) => s.onList && s.correct).length, scored.filter((s) => s.onList).length),
  notOnListAccuracy: frac(notOnList.filter((s) => s.correct).length, notOnList.length),
  foodAccuracyNotOnList: frac(notOnList.filter((s) => (s.foodP >= IS_FOOD) === s.food).length, notOnList.length),
  actions: Object.fromEntries(["tick", "ask", "unmatched", "ignore"].map((a) => [a, scored.filter((s) => s.action === a).length])),
  sweep,
  errors: scored
    .filter((s) => !s.correct || (!s.onList && (s.foodP >= IS_FOOD) !== s.food))
    .map(({ line, accept, choice, confidence, food, foodP, action, verify }) => ({ line, accept, choice, confidence, food, foodP: Math.round(foodP * 100) / 100, action, verify })),
  cost: { liveCalls: client.stats.calls, cachedCalls: client.stats.cached, inputTokens: client.stats.inputTokens, usd: (client.stats.inputTokens / 1e6) * 0.042 },
};

// A pure replay rewrites the report only if the scores changed (CI diffs it).
mkdirSync("eval/receipt/results", { recursive: true });
const reportPath = `eval/receipt/results/${runName}.json`;
const scores = (r: Record<string, unknown>) => JSON.stringify({ ...r, date: null, cost: null });
const previous = existsSync(reportPath) ? JSON.parse(readFileSync(reportPath, "utf8")) : null;
if (client.stats.calls > 0 || !previous || scores(previous) !== scores(report)) {
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + "\n");
}

console.log(`\n## ${runName}: ${scored.length} lines vs ${names.length} list items + NONE\n`);
console.log(`match accuracy        ${pct(report.matchAccuracy)}  (on-list ${pct(report.onListAccuracy)}, not-on-list ${pct(report.notOnListAccuracy)})`);
console.log(`food check (not-on-list lines) ${pct(report.foodAccuracyNotOnList)}`);
console.log(`actions at tick ≥${AUTO_TICK}, ask ≥${ASK}: ${JSON.stringify(report.actions)}`);
console.log(`\nauto-tick ≥   ticks  wrong  precision  coverage`);
for (const s of sweep) console.log(`  ${s.threshold.toFixed(2)}       ${String(s.ticks).padStart(4)}  ${String(s.wrongTicks).padStart(5)}  ${pct(s.precision).padStart(9)}  ${pct(s.coverage).padStart(8)}`);
console.log(`\nerrors (${report.errors.length}):`);
for (const e of report.errors) console.log(`  ${e.line.padEnd(30)} → ${e.choice.padEnd(20)} conf ${e.confidence.toFixed(2)}  food ${e.foodP.toFixed(2)}${e.food ? "" : " (not food)"}${e.verify === null ? "" : `  verify ${e.verify.toFixed(2)}`}  want ${e.accept.join("/")}  [${e.action}]`);
console.log(`\ncost: ${client.stats.calls} live + ${client.stats.cached} cached calls, ${client.stats.inputTokens} tokens ≈ $${report.cost.usd.toFixed(4)}`);
