// Run the ten questions once and print pass or fail for each, and the cost.
// Usage: npx tsx --env-file=.env evals/run.ts [--hybrid] [--rerank] [--widen] [--cite-check]
import { optionsFromArgs, run } from "./suite";

const result = await run(optionsFromArgs(process.argv.slice(2)));

for (const o of result.outcomes) {
  const note = o.flagged ? "  (a citation was removed)" : "";
  console.log(`${o.passed ? "PASS" : "FAIL"}  ${o.question}${note}`);
  if (!o.passed) console.log(`      got: ${o.answer.replace(/\s+/g, " ").slice(0, 85)}`);
}

console.log(`\n${result.passed}/${result.outcomes.length} passed, cost $${result.cost.toFixed(4)}`);
