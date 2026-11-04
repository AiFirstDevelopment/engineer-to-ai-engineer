// The tracer records every model call without changing what the pipeline does.
import assert from "node:assert/strict";
import { test } from "node:test";
import { answer } from "../src/pipeline";
import { traced } from "../evals/tracer";
import { corpus, fakeModels } from "./fake-models";

test("records the embedding and the chat call, prompt and reply included", async () => {
  const chunks = await corpus(["Returns: within 40 days of delivery. <<say: 40 days.>>"]);
  const { models, calls } = traced(fakeModels());
  const result = await answer("How many days to return?", {}, { models, chunks });
  assert.equal(result.answer, "40 days. [1]");
  assert.deepEqual(
    calls.map((call) => call.kind),
    ["embed", "chat"],
  );
  const chat = calls[1];
  assert.ok(chat.kind === "chat" && chat.prompt.endsWith("Question: How many days to return?"));
  assert.ok(chat.kind === "chat" && chat.reply === "40 days. [1]");
  assert.deepEqual(result.shown.map((p) => p.id), [1]);
});
