// Score a run: each case's trace against its golden case. Retrieval first (where did a source
// come back), then the rules (facts, forbidden claims, citations), then the judge for what the
// rules cannot decide. A fallback case passes on "I don't know" and fails on any answer. A case
// with no trace was not run (the budget stopped the run first): it is "not run", never a pass.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import type { StoredChunk } from "../src/db";
import { allChunks } from "../src/db";
import type { Models } from "../src/models";
import { checkAnswer, retrieval, saidIDontKnow, type Checked, type Retrieval } from "./checks";
import { loadGolden, type Case } from "./golden";
import { judge, JUDGE_MODEL, type Verdict } from "./judge";
import type { Trace } from "./tracer";

export type CaseResult = {
  id: string;
  expect: Case["expect"];
  status: "pass" | "fail" | "not run";
  why: string; // the first check that failed, or ""
  retrieval: Retrieval;
  checked?: Checked;
  verdict?: Verdict;
  cost: number; // the pipeline's and the judge's
};

export type Scored = { run: string; judge: string; passed: number; results: CaseResult[] };

// Score every case of a run from its traces, and write evals/runs/<run>/results.json.
export async function scoreRun(run: string, models: Models): Promise<Scored> {
  const byId = new Map(allChunks().map((chunk) => [chunk.id, chunk]));
  const results: CaseResult[] = [];
  for (const c of loadGolden()) {
    const path = `evals/runs/${run}/traces/${c.id}.json`;
    if (!existsSync(path)) results.push(notRun(c));
    else results.push(await scoreCase(c, JSON.parse(readFileSync(path, "utf8")), byId, models));
  }
  return saveResults(run, results);
}

export function saveResults(run: string, results: CaseResult[]): Scored {
  const passed = results.filter((r) => r.status === "pass").length;
  const scored = { run, judge: JUDGE_MODEL, passed, results };
  writeFileSync(`evals/runs/${run}/results.json`, JSON.stringify(scored, null, 2) + "\n");
  return scored;
}

export function notRun(c: Case): CaseResult {
  const retrieval = { rank: null, shown: false };
  return { id: c.id, expect: c.expect, status: "not run", why: "budget", retrieval, cost: 0 };
}

export async function scoreCase(
  c: Case,
  trace: Trace,
  byId: Map<number, StoredChunk>,
  models: Models,
): Promise<CaseResult> {
  const found = retrieval(c, trace, byId);
  const base = { id: c.id, expect: c.expect, retrieval: found, cost: trace.cost };
  if (saidIDontKnow(trace.answer)) {
    const passed = c.expect === "fallback";
    return { ...base, status: passed ? "pass" : "fail", why: passed ? "" : "said I don't know" };
  }
  if (c.expect === "fallback") {
    return { ...base, status: "fail", why: "answered; the corpus does not say" };
  }
  const checked = checkAnswer(c, trace, byId);
  const verdict = await judge(answerCall(trace), trace.answer, models);
  const why = firstFailure(checked, verdict);
  const cost = base.cost + verdict.cost;
  return { ...base, status: why ? "fail" : "pass", why, checked, verdict, cost };
}

// What the answering call was given: the last chat call's (a reranker's comes before it).
function answerCall(trace: Trace): { system?: string; prompt: string } {
  const chats = trace.calls.flatMap((call) => (call.kind === "chat" ? [call] : []));
  return chats[chats.length - 1] ?? { prompt: "" };
}

function firstFailure(checked: Checked, verdict: Verdict): string {
  const missing = checked.facts.find((f) => !f.met);
  if (missing) return `missing: ${missing.fact}`;
  if (checked.forbidden.length) return `forbidden: ${checked.forbidden[0]}`;
  if (checked.citations.count === 0) return "no citations";
  if (checked.citations.unresolved.length) return `cites [${checked.citations.unresolved[0]}]`;
  if (!verdict.grounded) return `judge: not grounded`;
  if (!verdict.cited) return `judge: citation does not support`;
  return "";
}
