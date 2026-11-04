// The top-k chunks for a question: embed it, score every chunk against it, keep the best.
import { cosine } from "./cosine";
import { allChunks, type StoredChunk } from "./db";
import { embed } from "./embed";

export type Hit = StoredChunk & { score: number };

export async function retrieve(question: string, k = 5): Promise<Hit[]> {
  const vector = await embed(question);
  return allChunks()
    .map((chunk) => ({ ...chunk, score: cosine(vector, chunk.embedding) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
