// Every question the server answers, appended to logs/questions.jsonl (gitignored): the raw
// material for new golden cases (evals/sample.ts). Questions can hold personal details; keep
// the file where your other production logs live, under the same retention rules.
import { appendFileSync, mkdirSync } from "node:fs";
import type { Result } from "./pipeline";

const PATH = "logs/questions.jsonl";

export function logQuestion(question: string, result: Result): void {
  mkdirSync("logs", { recursive: true });
  const cited = result.citations.map((c) => c.where);
  const line = { at: new Date().toISOString(), question, answer: result.answer, cited };
  appendFileSync(PATH, JSON.stringify(line) + "\n");
}
