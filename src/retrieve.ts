// The top-k chunks for a question: embed it, score every chunk against it, keep the best.
import { cosine } from "./cosine";
import type { StoredChunk } from "./db";
import type { Deps } from "./models";

export type Hit = StoredChunk & { score: number };

export async function retrieve(question: string, k: number, deps: Deps): Promise<Hit[]> {
  const vector = await deps.models.embed(question);
  return deps.chunks
    .map((chunk) => ({ ...chunk, score: cosine(vector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
