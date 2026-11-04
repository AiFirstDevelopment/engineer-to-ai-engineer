// The judge: what a rule cannot decide. A string match can say "340" is in the answer; it
// cannot say whether every statement is backed by the passages, or whether [2] points at the
// passage that says it. A cheap model reads what the answering model read (its instructions and
// its prompt) and the answer it wrote, once per case, and returns a verdict in a fixed shape:
// grounded or not, and a verdict per citation, from which the code decides "cited".
import type { Models } from "../src/models";

export const JUDGE_MODEL = "claude-haiku-5-5";

const SYSTEM = `You check an answer that was written from numbered passages, under the
instructions shown. Judge only against the passages, never against what you know, and judge
the facts, not the style: wording, caution and hedging do not matter. Decide two things.
grounded: every statement of fact in the answer is supported by the passages, directly or by
a plain reading of them under the instructions. Saying the passages do not state something is
grounded when they indeed do not state it.
citations: for each citation [n] in the answer, the statement it is attached to (the sentence
or clause just before it, not a later one) and whether passage n supports that statement. A
statement without a citation is not a citation error. Give the reason first, in one sentence.`;

const schema = {
  type: "object",
  properties: {
    reason: { type: "string" },
    grounded: { type: "boolean" },
    citations: {
      type: "array",
      items: {
        type: "object",
        properties: {
          n: { type: "integer" },
          statement: { type: "string" },
          supports: { type: "boolean" },
        },
        required: ["n", "statement", "supports"],
        additionalProperties: false,
      },
    },
  },
  required: ["reason", "grounded", "citations"],
  additionalProperties: false,
};

type Reply = { reason: string; grounded: boolean; citations: { n: number; supports: boolean }[] };
// cited: the answer has citations and the judge found every one supports its statement.
export type Verdict = Reply & { cited: boolean };

export async function judge(
  read: { system?: string; prompt: string }, // what the answering model was given
  answer: string,
  models: Models,
): Promise<Verdict & { cost: number }> {
  const given = `The instructions the answer was written under:\n${read.system ?? "(none)"}`;
  const content = `${given}\n\n${read.prompt}\n\nThe answer to check:\n${answer}`;
  const reply = await models.chat(
    [{ role: "user", content }],
    { model: JUDGE_MODEL, system: SYSTEM, format: schema, maxTokens: 1024 },
  );
  const verdict = JSON.parse(reply.text) as Reply;
  const cited = verdict.citations.length > 0 && verdict.citations.every((c) => c.supports);
  return { ...verdict, cited, cost: reply.cost };
}
