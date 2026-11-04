// The pipeline: retrieve, prompt, answer. Two rules on top: every fact cites its passage, and
// when there is nothing to cite, the answer is "I don't know."
import { ask } from "./claude";
import { where } from "./chunk";
import { layout, SYSTEM } from "./prompt";
import { retrieve, type Hit } from "./retrieve";

export type Citation = { n: number; where: string };
export type Result = { answer: string; citations: Citation[]; cost: number };

// Below this, the best passage is not about the question, and the model is not even asked.
const MIN_SCORE = 0.25;

export async function answer(question: string): Promise<Result> {
  const hits = await retrieve(question, 5);
  if (hits.length === 0 || hits[0].score < MIN_SCORE) return dontKnow(0);

  const reply = await ask([{ role: "user", content: layout(question, hits) }], {
    system: SYSTEM,
  });
  if (reply.text.trim().startsWith("I don't know")) return dontKnow(reply.cost);

  return { answer: reply.text.trim(), citations: cited(reply.text, hits), cost: reply.cost };
}

function dontKnow(cost: number): Result {
  return { answer: "I don't know.", citations: [], cost };
}

// Every [n] in the answer, resolved to the passage it points at.
function cited(text: string, hits: Hit[]): Citation[] {
  const numbers = [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  return [...new Set(numbers)]
    .filter((n) => hits[n - 1] !== undefined)
    .map((n) => ({ n, where: where(hits[n - 1]) }));
}
