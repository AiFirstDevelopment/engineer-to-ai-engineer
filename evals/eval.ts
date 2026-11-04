// Run the golden set through the pipeline, traced and scored, within the budget (run-eval.ts).
// Usage: npx tsx --env-file=.env evals/eval.ts <run> [--budget 0.50] [--hybrid] [--rerank]
//        [--widen] [--cite-check] [--rewrite]. With no pipeline flags it runs what is served.
import { SERVED } from "../src/config";
import { loadLedger, RUN_CAP, TOTAL_CAP } from "./ledger";
import { printResults } from "./report";
import { runEval } from "./run-eval";
import { optionsFromArgs } from "./suite";

const [run, ...args] = process.argv.slice(2);
if (!run || run.startsWith("--")) throw new Error("usage: evals/eval.ts <run> [flags]");
const budgetAt = args.indexOf("--budget");
const budget = budgetAt < 0 ? RUN_CAP : Math.min(Number(args[budgetAt + 1]), RUN_CAP);
const flags = args.filter((_, i) => budgetAt < 0 || (i !== budgetAt && i !== budgetAt + 1));

printResults(await runEval(run, flags.length ? optionsFromArgs(flags) : SERVED, budget));
const ledger = loadLedger();
console.log(`ledger: ${ledger.runs.length} runs, $${ledger.total.toFixed(4)} of $${TOTAL_CAP}`);
