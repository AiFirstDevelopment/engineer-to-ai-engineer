// Run the golden set through the pipeline, traced: one file per case in
// evals/runs/<run>/traces/<case>.json with every step of that case. Then score the run.
// Usage: npx tsx --env-file=.env evals/eval.ts <run> [--hybrid] [--rerank] [--widen] [--cite-check]
// With no flags it runs what the server serves (src/config.ts).
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { SERVED } from "../src/config";
import { allChunks } from "../src/db";
import { realModels } from "../src/models";
import { answer } from "../src/pipeline";
import { loadGolden } from "./golden";
import { printResults } from "./report";
import { scoreRun } from "./scoring";
import { optionsFromArgs } from "./suite";
import { traced } from "./tracer";

const [run, ...flags] = process.argv.slice(2);
if (!run || run.startsWith("--")) throw new Error("usage: evals/eval.ts <run> [flags]");
const folder = `evals/runs/${run}`;
if (existsSync(folder)) throw new Error(`${folder} exists; name the run something new`);
mkdirSync(`${folder}/traces`, { recursive: true });

const options = flags.length ? optionsFromArgs(flags) : SERVED;
const chunks = allChunks();

for (const c of loadGolden()) {
  const { models, calls } = traced(realModels);
  const started = performance.now();
  const result = await answer(c.question, options, { models, chunks });
  const ms = Math.round(performance.now() - started);
  const chats = calls.flatMap((call) => (call.kind === "chat" ? [call] : []));
  const tokens = {
    input: chats.reduce((n, call) => n + call.inputTokens, 0),
    output: chats.reduce((n, call) => n + call.outputTokens, 0),
  };
  const trace = { run, case: c.id, question: c.question, options, ...result, calls, tokens, ms };
  writeFileSync(`${folder}/traces/${c.id}.json`, JSON.stringify(trace, null, 2) + "\n");
}

printResults(await scoreRun(run, realModels));
