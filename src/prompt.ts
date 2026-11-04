// The system prompt, and the passages laid out with numbers so the model can cite them.
import { where } from "./chunk";
import type { Hit } from "./retrieve";

export const SYSTEM = `You answer questions for the staff of Lantern Supply Co. from the
passages provided, and from nothing else. Cite every fact with the number of the passage it
comes from, like [2]. If passages disagree, prefer the one from the more recent document.
When the passages do not answer the question, reply exactly: I don't know.
Be brief: a sentence or two.`;

export function layout(question: string, hits: Hit[]): string {
  const passages = hits.map((hit, i) => `[${i + 1}] ${where(hit)}\n${hit.text}`);
  return `Passages:\n\n${passages.join("\n\n")}\n\nQuestion: ${question}`;
}
