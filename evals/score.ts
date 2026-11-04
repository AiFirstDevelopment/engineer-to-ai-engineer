// Score a run that evals/eval.ts traced, or score it again after the cases or the checks change.
// Writes evals/runs/<run>/results.json and prints the table.
// Usage: npx tsx --env-file=.env evals/score.ts <run>
import { realModels } from "../src/models";
import { printResults } from "./report";
import { scoreRun } from "./scoring";

const run = process.argv[2];
if (!run) throw new Error("usage: evals/score.ts <run>");
printResults(await scoreRun(run, realModels));
