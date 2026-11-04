// The tracer: a wrapper around the models that records every call the pipeline makes through
// them (what went in, what came out, tokens, cost, time) without the pipeline knowing. With
// the retrieval the pipeline reports in its result, that is every step of a case.
import { MODEL } from "../src/claude";
import type { Models } from "../src/models";
import type { Options, Result } from "../src/pipeline";

export type Call =
  | { kind: "embed"; text: string; ms: number }
  | {
      kind: "chat";
      model: string;
      system?: string;
      prompt: string;
      reply: string;
      stopReason: string;
      inputTokens: number;
      outputTokens: number;
      cost: number;
      ms: number;
    };

// One case of a run, as evals/eval.ts writes it to evals/runs/<run>/traces/<case>.json.
export type Trace = Result & {
  run: string;
  case: string;
  question: string;
  options: Options;
  calls: Call[];
  tokens: { input: number; output: number };
  ms: number;
};

export function traced(models: Models): { models: Models; calls: Call[] } {
  const calls: Call[] = [];
  const wrapped: Models = {
    async embed(text) {
      const started = performance.now();
      const vector = await models.embed(text);
      calls.push({ kind: "embed", text, ms: since(started) });
      return vector;
    },
    async chat(messages, options = {}) {
      const started = performance.now();
      const reply = await models.chat(messages, options);
      calls.push({
        kind: "chat",
        model: options.model ?? MODEL,
        system: options.system,
        prompt: messages.map((m) => String(m.content)).join("\n\n"),
        reply: reply.text,
        stopReason: reply.stopReason,
        inputTokens: reply.inputTokens,
        outputTokens: reply.outputTokens,
        cost: reply.cost,
        ms: since(started),
      });
      return reply;
    },
  };
  return { models: wrapped, calls };
}

function since(started: number): number {
  return Math.round(performance.now() - started);
}
