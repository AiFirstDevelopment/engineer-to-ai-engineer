// Run every question in questions.jsonl through the pipeline; print pass or fail and the cost.
// A question passes when the answer contains one of the strings it expects.
// Usage: npx tsx --env-file=.env evals/run.ts
import { readFileSync } from "node:fs";
import { answer } from "../src/pipeline";

type Case = { question: string; expect: string[] };

const cases = readFileSync("evals/questions.jsonl", "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as Case);

let passed = 0;
let cost = 0;

for (const c of cases) {
  const result = await answer(c.question);
  const got = result.answer.toLowerCase();
  const ok = c.expect.some((expected) => got.includes(expected.toLowerCase()));
  if (ok) passed++;
  cost += result.cost;
  console.log(`${ok ? "PASS" : "FAIL"}  ${c.question}`);
  if (!ok) console.log(`      got: ${result.answer.replace(/\s+/g, " ").slice(0, 85)}`);
}

console.log(`\n${passed}/${cases.length} passed, cost $${cost.toFixed(4)}`);
