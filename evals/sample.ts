// Turn questions people really asked into draft golden cases. Reads logs/questions.jsonl, drops
// questions the golden set already has and repeats, takes a random sample, and writes them to
// evals/drafts.jsonl with what the pipeline answered. A draft is not a case: a person reads each
// one against the documents, writes its facts, forbidden claims and quotes (or marks it a
// fallback), moves it into golden.jsonl and runs check-golden.ts.
// Usage: npx tsx evals/sample.ts [how many, default 5]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { flat, loadGolden } from "./golden";

type Logged = { at: string; question: string; answer: string; cited: string[] };

const wanted = Number(process.argv[2] ?? 5);
if (!existsSync("logs/questions.jsonl")) throw new Error("no logs/questions.jsonl yet");
const key = (question: string) => flat(question).toLowerCase().replace(/[?.!]+$/, "");
const known = new Set(loadGolden().map((c) => key(c.question)));

const fresh = new Map<string, Logged>();
for (const line of readFileSync("logs/questions.jsonl", "utf8").split("\n")) {
  if (!line.trim()) continue;
  const logged = JSON.parse(line) as Logged;
  if (!known.has(key(logged.question))) fresh.set(key(logged.question), logged);
}

const sample = [...fresh.values()].sort(() => Math.random() - 0.5).slice(0, wanted);
const drafts = sample.map((logged, i) => ({
  id: `draft-${i + 1}`,
  question: logged.question,
  expect: "TODO: answer or fallback",
  facts: [],
  forbidden: [],
  sources: [],
  notes: `asked ${logged.at.slice(0, 10)}; the pipeline said: ${logged.answer} [${logged.cited}]`,
}));
writeFileSync("evals/drafts.jsonl", drafts.map((d) => JSON.stringify(d)).join("\n") + "\n");
const counts = `${fresh.size}; drafted in evals/drafts.jsonl: ${drafts.length}`;
console.log(`new questions in the log: ${counts}`);
for (const d of drafts) console.log(`  ${d.id}: ${d.question}`);
