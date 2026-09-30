// Jev self-consistency near the confidence threshold (#J2a).
//
//   npm run consistency:jev              # 5 repeats per item, live calls
//   npm run consistency:jev -- --repeats 3
//
// Picks every eval item whose recorded confidence (v2 criteria, 1 item per
// request) is below 0.95 — the uncertain zone — plus 20 confident controls,
// and asks Jev the same question N times with no cache. Reports how often the
// chosen section changes, how much confidence moves, and how often an item
// crosses CONFIDENCE_THRESHOLD (the "check aisle" flag would flicker).

import { readFileSync, writeFileSync } from "node:fs";
import { CONFIDENCE_THRESHOLD } from "../lib/grocery/jevClassifier.ts";
import { JEV_MODEL, SECTION_CRITERIA_V2, singleItemRequest } from "../lib/grocery/jevQuestions.ts";
import { asChoice } from "../lib/jev/api.ts";
import { createCachedJevClient, pool } from "./jevClient.ts";

const i = process.argv.indexOf("--repeats");
const REPEATS = i >= 0 ? Number(process.argv[i + 1]) : 5;

type Row = { item: string; accept: string[] };

async function main() {
  const candidates: { item: string; accept: string[]; confidence: number }[] = [];
  for (const dataset of ["items", "holdout"]) {
    const suffix = dataset === "items" ? "" : `_${dataset}`;
    const replay = createCachedJevClient(`eval/jev/cache/${JEV_MODEL}_v2_single${suffix}.json`);
    const rows: Row[] = readFileSync(`eval/jev/${dataset}.jsonl`, "utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
    for (const r of rows) {
      const a = asChoice((await replay.ask(singleItemRequest(r.item, SECTION_CRITERIA_V2))).answers.section)!;
      candidates.push({ item: r.item, accept: r.accept, confidence: a.confidence });
    }
  }
  const uncertain = candidates.filter((c) => c.confidence < 0.95);
  const confident = candidates.filter((c) => c.confidence >= 0.95).filter((_, k) => k % 15 === 0).slice(0, 20);
  const probe = [...uncertain, ...confident];

  const live = createCachedJevClient(`eval/jev/cache/${JEV_MODEL}_v2_consistency.json`, { live: true, noCache: true });
  const jobs = probe.flatMap((p) => Array.from({ length: REPEATS }, () => p));
  const answers = await pool(jobs, async (p) => asChoice((await live.ask(singleItemRequest(p.item, SECTION_CRITERIA_V2))).answers.section)!, 8);
  live.save();

  type Stat = { item: string; recorded: number; choices: string[]; confs: number[]; accept: string[] };
  const stats: Stat[] = probe.map((p, k) => {
    const slice = answers.slice(k * REPEATS, (k + 1) * REPEATS);
    return { item: p.item, recorded: p.confidence, accept: p.accept, choices: slice.map((a) => a.choice), confs: slice.map((a) => a.confidence) };
  });

  const summarize = (label: string, rows: Stat[]) => {
    const flipsChoice = rows.filter((s) => new Set(s.choices).size > 1);
    const flipsFlag = rows.filter((s) => new Set(s.confs.map((c) => c < CONFIDENCE_THRESHOLD)).size > 1);
    const spread = rows.map((s) => Math.max(...s.confs) - Math.min(...s.confs));
    const maxSpread = Math.max(...spread);
    const meanSpread = spread.reduce((a, b) => a + b, 0) / (spread.length || 1);
    console.log(`\n## ${label}: ${rows.length} items × ${REPEATS} calls`);
    console.log(`section changed across repeats: ${flipsChoice.length}`);
    console.log(`"check aisle" flag flipped across repeats: ${flipsFlag.length}`);
    console.log(`confidence spread per item: mean ${meanSpread.toFixed(3)}, max ${maxSpread.toFixed(3)}`);
    for (const s of [...new Set([...flipsChoice, ...flipsFlag])]) {
      console.log(`   ${s.item.padEnd(26)} choices ${[...new Set(s.choices)].join("/")}  conf ${s.confs.map((c) => c.toFixed(2)).join(" ")}  want ${s.accept.join("/")}`);
    }
    return { items: rows.length, choiceFlips: flipsChoice.length, flagFlips: flipsFlag.length, meanSpread, maxSpread };
  };

  const report = {
    model: JEV_MODEL,
    date: new Date().toISOString().slice(0, 10),
    repeats: REPEATS,
    threshold: CONFIDENCE_THRESHOLD,
    uncertain: summarize("Uncertain zone (recorded confidence < 0.95)", stats.slice(0, uncertain.length)),
    confident: summarize("Confident controls (≥ 0.95)", stats.slice(uncertain.length)),
    items: stats,
    cost: { calls: live.stats.calls, inputTokens: live.stats.inputTokens, usd: (live.stats.inputTokens / 1e6) * 0.042 },
  };
  writeFileSync(`eval/jev/results/${JEV_MODEL}_v2_consistency.json`, JSON.stringify(report, null, 2) + "\n");
  console.log(`\ncost: ${live.stats.calls} calls, ${live.stats.inputTokens} tokens ≈ $${report.cost.usd.toFixed(4)}`);
}

await main();
