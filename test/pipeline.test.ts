// The pipeline's rules, tested with fake models: no key, no network, no cost.
import assert from "node:assert/strict";
import { test } from "node:test";
import { answer } from "../src/pipeline";
import { corpus, fakeModels } from "./fake-models";

const returns = "Returns: an unused lantern may be returned within 40 days of delivery.";

test("answers from the passage that holds the answer, and cites it", async () => {
  const chunks = await corpus([
    `${returns} <<say: You have 40 days from delivery.>>`,
    "Shipping: standard shipping takes 3 to 6 business days.",
  ]);
  const result = await answer("How many days to return a lantern?", {}, deps(chunks));
  assert.equal(result.answer, "You have 40 days from delivery. [1]");
  assert.deepEqual(result.citations, [{ n: 1, where: "doc1.md > Section 1" }]);
});

test("says I don't know, citing nothing, when no passage answers", async () => {
  const chunks = await corpus([returns, "Shipping: standard shipping takes 3 to 6 days."]);
  const result = await answer("How many days to return a lantern?", {}, deps(chunks));
  assert.equal(result.answer, "I don't know.");
  assert.deepEqual(result.citations, []);
});

test("does not ask the model when nothing retrieved is about the question", async () => {
  const models = fakeModels();
  const chunks = await corpus([returns]);
  const result = await answer("Who painted the Mona Lisa?", {}, { models, chunks });
  assert.equal(result.answer, "I don't know.");
  assert.equal(models.calls.length, 0);
});

test("the cite check removes a citation to a passage that was not shown", async () => {
  const chunks = await corpus([`${returns} <<say: 40 days [1], or 60 for members [7].>>`]);
  const question = "How many days to return a lantern?";
  const result = await answer(question, { citeCheck: true }, deps(chunks));
  assert.equal(result.answer, "40 days [1], or 60 for members.");
  assert.equal(result.flagged, true);
});

test("the reranker brings an answer from outside the top five into view", async () => {
  const lookalikes = Array.from({ length: 6 }, (_, i) => `Return a lantern, days, form ${i}.`);
  const chunks = await corpus([...lookalikes, `${returns} <<say: 40 days.>>`]);
  const question = "How many days to return a lantern?";
  const plain = await answer(question, {}, deps(chunks));
  const reranked = await answer(question, { rerank: true }, deps(chunks));
  assert.equal(plain.answer, "I don't know.");
  assert.match(reranked.answer, /^40 days\. \[\d\]$/);
});

function deps(chunks: Awaited<ReturnType<typeof corpus>>) {
  return { models: fakeModels(), chunks };
}
