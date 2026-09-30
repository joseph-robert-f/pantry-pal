// Jev shadow eval for grocery sections (plan §5, issue #J2).
//
//   npm run eval:jev -- --mode single --criteria v1
//   npm run eval:jev -- --mode batch --batch-size 25 --criteria v1
//   npm run eval:jev -- --mode single --criteria v2 --dataset holdout
//
// Reads eval/jev/items.jsonl (hand-labeled), asks Jev for each item's
// section, and scores the answers. Raw responses are cached in
// eval/jev/cache/, so a re-run replays them without API calls; pass --live to
// ignore the cache. Needs TYPESAFE_API_KEY only for uncached requests.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createCachedJevClient, pool } from "./jevClient.ts";
import { classifyWithRules } from "../lib/grocery/rulesClassifier.ts";
import {
  JEV_MODEL,
  SECTION_CRITERIA,
  batchRequest,
  singleItemRequest,
} from "../lib/grocery/jevQuestions.ts";
import { asChoice, type ChoiceAnswer } from "../lib/jev/api.ts";

const TARGET_ACCURACY = 0.97; // plan §5 step 4
const CONCURRENCY = 8;

type Row = { item: string; accept: string[]; ambiguous?: boolean };
type Scored = Row & { choice: string; confidence: number; correct: boolean; runnerUp: string };

// --- args -----------------------------------------------------------------

function arg(name: string, fallback: string): string {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}
const mode = arg("mode", "single") as "single" | "batch";
const criteriaName = arg("criteria", "v1");
const batchSize = Number(arg("batch-size", "25"));
const live = process.argv.includes("--live");
const criteria = SECTION_CRITERIA[criteriaName];
if (!criteria) throw new Error(`Unknown criteria "${criteriaName}"`);
const runName = `${JEV_MODEL}_${criteriaName}_${mode}${mode === "batch" ? batchSize : ""}${arg("dataset", "items") === "items" ? "" : `_${arg("dataset", "items")}`}`;

// --- cache + transport ----------------------------------------------------

const client = createCachedJevClient(`eval/jev/cache/${runName}.json`, { live });
const { ask, stats } = client;
const poolN = <T, R>(inputs: T[], fn: (t: T) => Promise<R>) => pool(inputs, fn, CONCURRENCY);

// --- run ------------------------------------------------------------------

const dataset = arg("dataset", "items");
const rows: Row[] = readFileSync(`eval/jev/${dataset}.jsonl`, "utf8")
  .split("\n")
  .filter(Boolean)
  .map((l) => JSON.parse(l));

async function answersFor(rows: Row[]): Promise<ChoiceAnswer[]> {
  if (mode === "single") {
    const responses = await poolN(rows, (r) => ask(singleItemRequest(r.item, criteria)));
    return responses.map((res) => asChoice(res.answers.section)!);
  }
  const batches: Row[][] = [];
  for (let i = 0; i < rows.length; i += batchSize) batches.push(rows.slice(i, i + batchSize));
  const responses = await poolN(batches, (b) => ask(batchRequest(b.map((r) => r.item), criteria)));
  return responses.flatMap((res, bi) => batches[bi].map((_, i) => asChoice(res.answers[`section_${i}`])!));
}

function runnerUp(a: ChoiceAnswer): string {
  const [, second] = Object.entries(a.probabilities).sort((x, y) => y[1] - x[1]);
  return second ? `${second[0]} ${second[1].toFixed(2)}` : "";
}

const answers = await answersFor(rows);
const scored: Scored[] = rows.map((r, i) => ({
  ...r,
  choice: answers[i].choice,
  confidence: answers[i].confidence,
  correct: r.accept.includes(answers[i].choice),
  runnerUp: runnerUp(answers[i]),
}));
client.save();

// --- metrics --------------------------------------------------------------

const pct = (n: number) => `${(n * 100).toFixed(1)}%`;
const acc = (xs: { correct: boolean }[]) => (xs.length ? xs.filter((x) => x.correct).length / xs.length : NaN);
const quantile = (xs: number[], q: number) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : NaN;
};

const rulesScored = rows.map((r) => {
  const c = classifyWithRules(r.item);
  return { correct: r.accept.includes(c.section), matched: c.source !== "rules" || !c.needsReview };
});

const thresholds = [0, 0.5, 0.6, 0.7, 0.8, 0.85, 0.9, 0.95, 0.98, 0.99];
const sweep = thresholds.map((t) => {
  const above = scored.filter((s) => s.confidence >= t);
  return {
    threshold: t,
    coverage: above.length / scored.length,
    accuracy: acc(above),
    n: above.length,
    errorsAbove: above.filter((s) => !s.correct).length,
  };
});
// Lowest cutoff that meets the target and keeps no errors on this set. Small
// sets overfit: confirm on a held-out set before using it.
const recommended = sweep.find((s) => s.accuracy >= TARGET_ACCURACY && s.errorsAbove === 0) ?? null;

const bySection = new Map<string, Scored[]>();
for (const s of scored.filter((s) => !s.ambiguous)) {
  const k = s.accept[0];
  bySection.set(k, [...(bySection.get(k) ?? []), s]);
}

const report = {
  run: runName,
  date: new Date().toISOString().slice(0, 10),
  items: scored.length,
  ambiguousItems: scored.filter((s) => s.ambiguous).length,
  jev: {
    accuracy: acc(scored),
    accuracyUnambiguous: acc(scored.filter((s) => !s.ambiguous)),
    bySection: Object.fromEntries([...bySection].map(([k, v]) => [k, { n: v.length, accuracy: acc(v) }])),
    thresholdSweep: sweep,
    recommendedThreshold: recommended?.threshold ?? null,
  },
  rulesBaseline: {
    accuracy: acc(rulesScored),
    unmatched: rulesScored.filter((r) => !r.matched).length,
  },
  cost: {
    liveCalls: stats.calls,
    cachedCalls: stats.cached,
    inputTokens: stats.inputTokens,
    usd: (stats.inputTokens / 1e6) * 0.042,
    latencyP50Ms: Math.round(quantile(stats.latenciesMs, 0.5)),
    latencyP95Ms: Math.round(quantile(stats.latenciesMs, 0.95)),
  },
  errors: scored
    .filter((s) => !s.correct)
    .map(({ item, accept, choice, confidence, runnerUp }) => ({ item, accept, choice, confidence, runnerUp })),
};

mkdirSync("eval/jev/results", { recursive: true });
writeFileSync(`eval/jev/results/${runName}.json`, JSON.stringify(report, null, 2) + "\n");

// --- summary --------------------------------------------------------------

console.log(`\n## ${runName}  (${scored.length} items, ${report.ambiguousItems} ambiguous)\n`);
console.log(`Jev accuracy          ${pct(report.jev.accuracy)}  (unambiguous only: ${pct(report.jev.accuracyUnambiguous)})`);
console.log(`Rules baseline        ${pct(report.rulesBaseline.accuracy)}  (${report.rulesBaseline.unmatched} items fell to OTHER)`);
console.log(`\nthreshold  coverage  accuracy  errors kept`);
for (const s of sweep) console.log(`  ≥${s.threshold.toFixed(2)}    ${pct(s.coverage).padStart(6)}    ${pct(s.accuracy).padStart(6)}    ${s.errorsAbove}`);
console.log(`\nLowest error-free threshold on this set: ${recommended ? `${recommended.threshold} — covers ${pct(recommended.coverage)}` : "none"}`);
console.log(`\nper section: ${[...bySection].map(([k, v]) => `${k} ${pct(acc(v))}`).join(" · ")}`);
console.log(`cost: ${stats.calls} live + ${stats.cached} cached calls, ${stats.inputTokens} input tokens ≈ $${report.cost.usd.toFixed(5)}` +
  (stats.calls ? `, p50 ${report.cost.latencyP50Ms} ms, p95 ${report.cost.latencyP95Ms} ms` : ""));
console.log(`\nerrors (${report.errors.length}):`);
for (const e of report.errors) {
  console.log(`  ${e.item.padEnd(28)} → ${e.choice.padEnd(9)} conf ${e.confidence.toFixed(2)}  want ${e.accept.join("/")}  (2nd: ${e.runnerUp})`);
}
