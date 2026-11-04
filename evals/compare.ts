// Compare two scored runs case by case: every case whose status changed, with why and where its
// source was retrieved in each, then the totals. Usage: npx tsx evals/compare.ts <runA> <runB>
import { readFileSync } from "node:fs";
import type { CaseResult, Scored } from "./scoring";

const [a, b] = process.argv.slice(2).map(load);
if (!a || !b) throw new Error("usage: evals/compare.ts <runA> <runB>");

const before = new Map(a.results.map((r) => [r.id, r]));
const changed = b.results.filter((r) => before.get(r.id)?.status !== r.status);

console.log(`case                     ${a.run.padEnd(14)} ${b.run.padEnd(14)} why`);
for (const r of changed) {
  const old = before.get(r.id)!;
  const why = r.status === "pass" ? old.why : r.why;
  const source = `source ${rank(old)} then ${rank(r)}`;
  console.log(`${r.id.padEnd(24)} ${old.status.padEnd(14)} ${r.status.padEnd(14)} ${why}`);
  console.log(`${"".padEnd(25)}${source}`);
}

const cost = (s: Scored) => s.results.reduce((sum, r) => sum + r.cost, 0);
const change = Math.round(((cost(b) - cost(a)) / cost(a)) * 100);
const n = b.results.length;
console.log(`${n - changed.length} of ${n} cases unchanged`);
console.log(`passed  ${a.passed} -> ${b.passed} of ${n}`);
console.log(`cost    $${cost(a).toFixed(4)} -> $${cost(b).toFixed(4)} (${change}%)`);

function load(run: string): Scored {
  return JSON.parse(readFileSync(`evals/runs/${run}/results.json`, "utf8")) as Scored;
}

function rank(r: CaseResult): string {
  if (r.retrieval.rank === null) return "-";
  return `#${r.retrieval.rank}${r.retrieval.shown ? " shown" : ""}`;
}
