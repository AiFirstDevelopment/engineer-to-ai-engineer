// Evaluate the judge before trusting it: a dozen answers labelled by hand, each a real prompt
// from a run with the pipeline's own answer or a deliberately wrong one (a changed number, a
// citation to the wrong passage, a claim no passage makes). The judge's agreement with the
// labels is the confidence its verdicts deserve. Every prompt was written under the pipeline's
// system prompt, which the judge is given too.
// Usage: npx tsx --env-file=.env evals/judge-eval.ts
import { readFileSync } from "node:fs";
import { realModels } from "../src/models";
import { SYSTEM } from "../src/prompt";
import { judge, JUDGE_MODEL } from "./judge";

type Labelled = { id: string; prompt: string; answer: string; grounded: boolean; cited: boolean };

const cases = readFileSync("evals/judge-cases.jsonl", "utf8")
  .split("\n")
  .filter((line) => line.trim())
  .map((line) => JSON.parse(line) as Labelled);

let grounded = 0;
let cited = 0;
let cost = 0;
console.log(`judge ${JUDGE_MODEL}, ${cases.length} labelled answers; disagreements:`);
for (const c of cases) {
  const verdict = await judge({ system: SYSTEM, prompt: c.prompt }, c.answer, realModels);
  cost += verdict.cost;
  if (verdict.grounded === c.grounded) grounded++;
  if (verdict.cited === c.cited) cited++;
  if (verdict.grounded !== c.grounded || verdict.cited !== c.cited) {
    console.log(`  ${c.id}: grounded ${verdict.grounded} (label ${c.grounded}), ` +
      `cited ${verdict.cited} (label ${c.cited})`);
    console.log(`  judge said: ${verdict.reason.slice(0, 84)}`);
  }
}
const n = cases.length;
console.log(`agreement: grounded ${grounded}/${n}, cited ${cited}/${n}; cost $${cost.toFixed(4)}`);
