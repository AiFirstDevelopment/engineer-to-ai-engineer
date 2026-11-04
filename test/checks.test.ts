// The scorer's rules, on hand-made traces: no model, no store.
import assert from "node:assert/strict";
import { test } from "node:test";
import { checkAnswer, holds, retrieval } from "../evals/checks";
import type { Case } from "../evals/golden";
import type { Trace } from "../evals/tracer";
import { corpus } from "./fake-models";

const quote = "A customer may return an eligible item within 40 days of the delivery date.";
const golden: Case = {
  id: "return-window",
  question: "Can I still send it back?",
  expect: "answer",
  facts: [{ fact: "40 days", match: ["40 days", "forty days"] }],
  forbidden: [{ claim: "30 days", match: ["30 days"] }],
  sources: [{ file: "doc2.md", quote }],
};

test("a chunk holds a source when it has the quote, even wrapped or cut in half", async () => {
  const wrapped = quote.replace("within ", "within\n");
  const [, whole, cut] = await corpus(["other", wrapped, quote.slice(0, 45)]);
  assert.equal(holds(whole, golden.sources[0]), true);
  assert.equal(holds({ ...cut, source: "doc2.md" }, golden.sources[0]), true);
  assert.equal(holds({ ...whole, source: "doc9.md" }, golden.sources[0]), false);
});

test("rank and shown from the trace; facts, claims, citations from the answer", async () => {
  const chunks = await corpus(["Shipping is 3 to 6 days.", quote]);
  const byId = new Map(chunks.map((chunk) => [chunk.id, chunk]));
  const passages = chunks.map((chunk) => ({ id: chunk.id, where: chunk.source, score: 0.5 }));
  const trace = {
    answer: "Yes, within 40 days [2], not 30 days [3].",
    retrieved: passages,
    shown: passages,
  } as Trace;
  assert.deepEqual(retrieval(golden, trace, byId), { rank: 2, shown: true });
  const checked = checkAnswer(golden, trace, byId);
  assert.deepEqual(checked.facts, [{ fact: "40 days", met: true }]);
  assert.deepEqual(checked.forbidden, ["30 days"]);
  assert.deepEqual(checked.citations, { count: 2, unresolved: [3], sourceCited: true });
});
