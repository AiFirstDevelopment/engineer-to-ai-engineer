// Label each failing case of a scored run with the stage that failed, and the evidence.
// Usage: npx tsx evals/diagnose.ts <run>
import { readFileSync } from "node:fs";
import type { Scored } from "./scoring";
import { NEXT, stage, type Stage } from "./stages";

const run = process.argv[2];
if (!run) throw new Error("usage: evals/diagnose.ts <run>");
const scored = JSON.parse(readFileSync(`evals/runs/${run}/results.json`, "utf8")) as Scored;

const found = new Map<Stage, string[]>();
for (const r of scored.results) {
  const label = stage(r);
  if (!label) continue;
  const { rank, shown } = r.retrieval;
  const place = rank === null ? "not in the top 20" : `#${rank}`;
  const source = rank === null ? place : `${place}, ${shown ? "shown" : "not shown"}`;
  found.set(label, [...(found.get(label) ?? []), `${r.id}: ${r.why}; source ${source}`]);
}

for (const [label, cases] of found) {
  console.log(`${label} (${cases.length}): look at ${NEXT[label]}`);
  for (const line of cases) console.log(`  ${line}`);
}
const failed = [...found.values()].flat().length;
console.log(`${failed} failing of ${scored.results.length} in ${run}`);
