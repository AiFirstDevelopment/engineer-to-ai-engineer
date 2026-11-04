// The checks a rule can decide: where retrieval put the case's sources, which required facts the
// answer states, which forbidden claims it makes, and whether its citations point at passages
// the model was shown.
import type { StoredChunk } from "../src/db";
import type { Passage } from "../src/pipeline";
import { flat, mentions, type Case, type Source } from "./golden";
import type { Trace } from "./tracer";

export type Retrieval = { rank: number | null; shown: boolean }; // rank in the top 20, from 1
export type Citations = { count: number; unresolved: number[]; sourceCited: boolean };
export type Checked = {
  facts: { fact: string; met: boolean }[];
  forbidden: string[]; // the forbidden claims the answer makes
  citations: Citations;
};

export function saidIDontKnow(answer: string): boolean {
  return answer.trim().startsWith("I don't know");
}

// Where the first chunk holding one of the case's sources came in the search, and whether a
// chunk holding one was among the passages shown.
export function retrieval(c: Case, trace: Trace, byId: Map<number, StoredChunk>): Retrieval {
  const has = (p: Passage) => c.sources.some((s) => holds(byId.get(p.id), s));
  const index = trace.retrieved.findIndex(has);
  return { rank: index < 0 ? null : index + 1, shown: trace.shown.some(has) };
}

export function checkAnswer(c: Case, trace: Trace, byId: Map<number, StoredChunk>): Checked {
  const facts = c.facts.map((f) => ({ fact: f.fact, met: mentions(trace.answer, f.match) }));
  const forbidden = c.forbidden.filter((f) => mentions(trace.answer, f.match)).map((f) => f.claim);
  const numbers = [...new Set([...trace.answer.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])))];
  const unresolved = numbers.filter((n) => n < 1 || n > trace.shown.length);
  const cited = numbers.filter((n) => !unresolved.includes(n)).map((n) => trace.shown[n - 1]);
  const sourceCited = cited.some((p) => c.sources.some((s) => holds(byId.get(p.id), s)));
  return { facts, forbidden, citations: { count: numbers.length, unresolved, sourceCited } };
}

// A chunk holds a source when it is from the same file (and page) and contains the quote, or
// one half of it: a chunk boundary can cut a quote in two. A half under 30 characters could
// match by chance, so it does not count.
export function holds(chunk: StoredChunk | undefined, source: Source): boolean {
  if (!chunk || chunk.source !== source.file) return false;
  if (source.page !== undefined && chunk.page !== source.page) return false;
  const words = flat(source.quote).split(" ");
  const middle = Math.floor(words.length / 2);
  const halves = [words.slice(0, middle).join(" "), words.slice(middle).join(" ")];
  const parts = [flat(source.quote), ...halves.filter((half) => half.length >= 30)];
  return parts.some((part) => flat(chunk.text).includes(part));
}
