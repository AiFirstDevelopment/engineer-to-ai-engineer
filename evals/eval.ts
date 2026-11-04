// Run the golden set through the pipeline, traced and scored case by case, within the budget.
// Each case's trace goes to evals/runs/<run>/traces/<case>.json, the scores to results.json,
// and the run's line in evals/runs/ledger.json is rewritten after every case, so a run that
// dies still counts what it spent. Once the budget is spent the remaining cases are not run.
// Usage: npx tsx --env-file=.env evals/eval.ts <run> [--budget 0.50] [--hybrid] [--rerank]
//        [--widen] [--cite-check] [--rewrite]. With no pipeline flags it runs what is served.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { MODEL } from "../src/claude";
import { SERVED } from "../src/config";
import { allChunks } from "../src/db";
import { realModels } from "../src/models";
import { answer, SETTINGS } from "../src/pipeline";
import { loadGolden } from "./golden";
import { JUDGE_MODEL } from "./judge";
import { commit, loadLedger, RUN_CAP, saveLedger, TOTAL_CAP, type Entry } from "./ledger";
import { printResults } from "./report";
import { notRun, saveResults, scoreCase, type CaseResult } from "./scoring";
import { optionsFromArgs } from "./suite";
import { traced } from "./tracer";

const [run, ...args] = process.argv.slice(2);
if (!run || run.startsWith("--")) throw new Error("usage: evals/eval.ts <run> [flags]");
const folder = `evals/runs/${run}`;
if (existsSync(folder)) throw new Error(`${folder} exists; name the run something new`);

const budgetAt = args.indexOf("--budget");
const budget = Math.min(budgetAt < 0 ? RUN_CAP : Number(args[budgetAt + 1]), RUN_CAP);
if (!(budget > 0)) throw new Error(`--budget is a number of dollars, at most ${RUN_CAP}`);
const flags = args.filter((arg, i) => i !== budgetAt && i !== budgetAt + 1);
const options = flags.length ? optionsFromArgs(flags) : SERVED;

const ledger = loadLedger();
const before = ledger.total; // what earlier runs spent
if (before >= TOTAL_CAP) throw new Error(`the eval budget is spent: $${before} of $${TOTAL_CAP}`);
const config = { options, ...SETTINGS, model: MODEL, judge: JUDGE_MODEL, budget };
const at = new Date().toISOString();
const line: Entry = { run, at, git: commit(), config, passed: 0, failed: 0, notRun: 0, cost: 0 };
ledger.runs.push(line);

mkdirSync(`${folder}/traces`, { recursive: true });
const chunks = allChunks();
const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
const results: CaseResult[] = [];

for (const c of loadGolden()) {
  if (line.cost >= budget || before + line.cost >= TOTAL_CAP) {
    results.push(notRun(c));
  } else {
    const { models, calls } = traced(realModels);
    const started = performance.now();
    const result = await answer(c.question, options, { models, chunks });
    const ms = Math.round(performance.now() - started);
    const chats = calls.flatMap((call) => (call.kind === "chat" ? [call] : []));
    const input = chats.reduce((n, call) => n + call.inputTokens, 0);
    const output = chats.reduce((n, call) => n + call.outputTokens, 0);
    const trace = { run, case: c.id, question: c.question, options, ...result, calls, ms };
    const record = { ...trace, tokens: { input, output } };
    writeFileSync(`${folder}/traces/${c.id}.json`, JSON.stringify(record, null, 2) + "\n");
    results.push(await scoreCase(c, record, byId, realModels));
  }
  const count = (status: string) => results.filter((r) => r.status === status).length;
  Object.assign(line, { passed: count("pass"), failed: count("fail"), notRun: count("not run") });
  line.cost = Number(results.reduce((sum, r) => sum + r.cost, 0).toFixed(4));
  saveLedger(ledger);
}

printResults(saveResults(run, results));
console.log(`ledger: ${ledger.runs.length} runs, $${ledger.total.toFixed(4)} of $${TOTAL_CAP}`);
