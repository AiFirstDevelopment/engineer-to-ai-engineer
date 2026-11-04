// The gate: the served pipeline's eval as a check that passes or fails, for CI on every pull
// request that touches the pipeline, and for a person before pushing. It fails when less than
// THRESHOLD of the cases pass, when any fallback case answers (an invented answer is the failure
// that costs most), or when the budget stopped the run (cases not run are not passes).
// Usage: npx tsx --env-file=.env evals/gate.ts [run]   (in CI the key comes from a secret)
import { SERVED } from "../src/config";
import { runEval } from "./run-eval";
import { summary } from "./report";

// The share of cases that must pass. The served pipeline has scored 26 to 30 of 30 over runs, so
// the line sits under the noise: a change that trips it has done real harm.
export const THRESHOLD = 0.85;
const BUDGET = 0.5; // dollars; a served run costs about $0.13

const run = process.argv[2] ?? `gate-${new Date().toISOString().replace(/[:.]/g, "-")}`;
const scored = await runEval(run, SERVED, BUDGET);

const failed = scored.results.filter((r) => r.status !== "pass");
const needed = Math.ceil(THRESHOLD * scored.results.length);
for (const r of failed) {
  console.log(`${r.status === "fail" ? "FAIL" : r.status}  ${r.id}: ${r.why}`);
}
console.log(summary(scored));

const problems = [
  scored.passed < needed && `${scored.passed} passed, the gate needs ${needed}`,
  failed.some((r) => r.expect === "fallback" && r.status === "fail") && "a fallback case answered",
  failed.some((r) => r.status === "not run") && "the budget stopped the run",
].filter(Boolean);
console.log(problems.length ? `gate: FAILED (${problems.join("; ")})` : "gate: passed");
process.exit(problems.length ? 1 : 0);
