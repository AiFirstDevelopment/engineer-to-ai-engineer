// The ten questions, run through the pipeline with a given set of options.
// A question passes when the answer contains one of the strings it expects.
import { readFileSync } from "node:fs";
import { answer, type Options } from "../src/pipeline";

export type Case = { question: string; expect: string[] };
export type Outcome = Case & { passed: boolean; answer: string; flagged: boolean };
export type Run = { outcomes: Outcome[]; passed: number; cost: number };

export const cases: Case[] = readFileSync("evals/questions.jsonl", "utf8")
  .trim()
  .split("\n")
  .map((line) => JSON.parse(line) as Case);

export async function run(options: Options): Promise<Run> {
  const outcomes: Outcome[] = [];
  let cost = 0;
  for (const c of cases) {
    const result = await answer(c.question, options);
    const got = result.answer.toLowerCase();
    const passed = c.expect.some((expected) => got.includes(expected.toLowerCase()));
    outcomes.push({ ...c, passed, answer: result.answer, flagged: result.flagged ?? false });
    cost += result.cost;
  }
  return { outcomes, passed: outcomes.filter((o) => o.passed).length, cost };
}

// --hybrid --rerank --widen --cite-check on the command line, in any combination.
export function optionsFromArgs(args: string[]): Options {
  return {
    hybrid: args.includes("--hybrid"),
    rerank: args.includes("--rerank"),
    widen: args.includes("--widen"),
    citeCheck: args.includes("--cite-check"),
  };
}
