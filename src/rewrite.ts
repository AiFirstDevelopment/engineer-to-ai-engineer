// Query rewriting. People ask in their words; documents are written in the company's. "Can
// staff buy..." finds nothing in a handbook that says "employee". The model rewrites the
// question into the vocabulary a company's documents would use, and the rewrite is what is
// searched. (Searching both and fusing the two lists was tried: the question's list, full of
// Second Light, outvoted the one passage the rewrite found.)
import type { Models } from "./models";

const SYSTEM = `You turn a question into a search query for a company's internal documents:
its policies, handbook, catalog and manuals. Reply with the query only, one line. Use the
words such documents use: formal terms for informal ones, the name of the policy or the
document section the question is about. Keep every product name, number and code as given.`;

export async function rewrite(question: string, models: Models) {
  const reply = await models.chat([{ role: "user", content: question }], {
    system: SYSTEM,
    maxTokens: 200,
  });
  return { query: reply.text.trim(), cost: reply.cost };
}
