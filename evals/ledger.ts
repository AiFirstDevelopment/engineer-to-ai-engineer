// The ledger: every run, what it ran with, what it scored and what it cost, in
// evals/runs/ledger.json. It is also where the caps are enforced: a run may spend at most
// RUN_CAP (or less, with --budget), and all runs together at most TOTAL_CAP. Raise a cap on
// purpose, in a reviewed commit, never to make a run finish.
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

export const RUN_CAP = 1.0; // dollars, one run
export const TOTAL_CAP = 5.0; // dollars, every run in this ledger

export type Entry = {
  run: string;
  at: string; // when it started
  git: string; // the commit, "+changes" when src/, docs/ or the cases had uncommitted edits
  config: object; // the pipeline's options and settings, and the models
  passed: number;
  failed: number;
  notRun: number;
  cost: number; // dollars, the pipeline's and the judge's
};
export type Ledger = { total: number; runs: Entry[] };

const PATH = "evals/runs/ledger.json";

export function loadLedger(): Ledger {
  if (!existsSync(PATH)) return { total: 0, runs: [] };
  return JSON.parse(readFileSync(PATH, "utf8")) as Ledger;
}

export function saveLedger(ledger: Ledger): void {
  ledger.total = Number(ledger.runs.reduce((sum, run) => sum + run.cost, 0).toFixed(4));
  writeFileSync(PATH, JSON.stringify(ledger, null, 2) + "\n");
}

export function commit(): string {
  const git = (...args: string[]) => execFileSync("git", args).toString().trim();
  const changed = git("status", "--porcelain", "--", "src", "docs", "evals/golden.jsonl");
  return git("rev-parse", "--short", "HEAD") + (changed ? "+changes" : "");
}
