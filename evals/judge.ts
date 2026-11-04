// The judge: what a rule cannot decide. A string match can say "340" is in the answer; it
// cannot say whether every statement is backed by the passages, or whether [2] points at the
// passage that says it. A cheap model reads what the answering model read (its instructions and
// its prompt) and the answer it wrote, once per case, and returns a verdict in a fixed shape.
import type { Models } from "../src/models";

export const JUDGE_MODEL = "claude-haiku-5-5";

const SYSTEM = `You check an answer that was written from numbered passages, under the
instructions shown. Judge only against the passages, never against what you know, and judge
the facts, not the style: wording, caution and hedging do not matter. Decide two things.
grounded: every statement of fact in the answer is supported by the passages, directly or by
a plain reading of them under the instructions. Saying the passages do not state something is
grounded when they indeed do not state it.
cited: every citation [n] points at a passage that supports the statement it is attached to.
A statement without a citation is not a citation error. An answer with no citations at all is
not cited. Give the reason first, in one sentence.`;

const schema = {
  type: "object",
  properties: {
    reason: { type: "string" },
    grounded: { type: "boolean" },
    cited: { type: "boolean" },
  },
  required: ["reason", "grounded", "cited"],
  additionalProperties: false,
};

export type Verdict = { reason: string; grounded: boolean; cited: boolean };

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
  return { ...(JSON.parse(reply.text) as Verdict), cost: reply.cost };
}
