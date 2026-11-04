// Rerank. The embedding ranked the candidates by how alike they look; now the model reads each
// one and scores how well it answers the question, 0 to 10. One call for all of them: the
// question and the instructions are paid for once, and the model sees the candidates side by
// side, which is what ranking needs. One call per candidate would cost twenty prompts and
// twenty round trips for scores that were never compared with each other.
//
// The reranker runs on Claude Haiku 5.5, not the answering model. Scoring passages 0 to 10 is a
// narrower job than writing a cited answer, it reads four times the text the answer does, and
// Haiku does it well enough at a twentieth of the price per token. The answer stays on MODEL.
import type { Models } from "./models";
import type { Hit } from "./retrieve";

export const RERANK_MODEL = "claude-haiku-5-5";

const schema = {
  type: "object",
  properties: {
    scores: {
      type: "array",
      items: {
        type: "object",
        properties: { n: { type: "integer" }, score: { type: "integer" } },
        required: ["n", "score"],
        additionalProperties: false,
      },
    },
  },
  required: ["scores"],
  additionalProperties: false,
};

type Scores = { scores: { n: number; score: number }[] };

export async function rerank(
  question: string,
  candidates: Hit[],
  k: number,
  models: Models,
): Promise<{ hits: Hit[]; cost: number }> {
  const passages = candidates.map((c, i) => `[${i + 1}] ${c.text}`);
  const prompt = `Question: ${question}\n\nScore each passage from 0 to 10 for how well it
answers the question: 10 answers it outright, 0 is unrelated.\n\n${passages.join("\n\n")}`;

  const reply = await models.chat([{ role: "user", content: prompt }], {
    model: RERANK_MODEL,
    system: "You score passages for how well they answer a question.",
    format: schema,
    maxTokens: 2048,
  });

  const byNumber = new Map((JSON.parse(reply.text) as Scores).scores.map((s) => [s.n, s.score]));
  const hits = candidates
    .map((c, i) => ({ ...c, score: byNumber.get(i + 1) ?? 0 }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
  return { hits, cost: reply.cost };
}
