// One eval run: the golden set through the pipeline, traced and scored case by case, within
// the budget. Each case's trace goes to evals/runs/<run>/traces/<case>.json, the scores to
// results.json, and the run's line in evals/runs/ledger.json is rewritten after every case, so
// a run that dies still counts what it spent. Once the budget is spent, the remaining cases are
// not run. evals/eval.ts and evals/gate.ts both run it.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { MODEL } from "../src/claude";
import { allChunks } from "../src/db";
import { realModels } from "../src/models";
import { answer, SETTINGS, type Options } from "../src/pipeline";
import { loadGolden } from "./golden";
import { JUDGE_MODEL } from "./judge";
import { commit, loadLedger, RUN_CAP, saveLedger, TOTAL_CAP, type Entry } from "./ledger";
import { notRun, saveResults, scoreCase, type CaseResult, type Scored } from "./scoring";
import { traced } from "./tracer";

export async function runEval(run: string, options: Options, budget = RUN_CAP): Promise<Scored> {
  const folder = `evals/runs/${run}`;
  if (existsSync(folder)) throw new Error(`${folder} exists; name the run something new`);
  if (!(budget > 0 && budget <= RUN_CAP)) throw new Error(`a budget is $0 to $${RUN_CAP}`);

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
  return saveResults(run, results);
}
