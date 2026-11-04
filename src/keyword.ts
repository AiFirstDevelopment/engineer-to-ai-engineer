// Keyword search with BM25, the ranking function behind most search engines, in forty lines.
// A term counts for more when it is rare across the chunks and when it appears often in a
// chunk; long chunks are held back so they do not win just by having more words.
import type { StoredChunk } from "./db";

const K1 = 1.2; // how quickly repeated terms stop adding to the score
const B = 0.75; // how much a chunk's length counts against it

export type Scored = StoredChunk & { score: number };

export function keywordSearch(query: string, chunks: StoredChunk[], k = 5): Scored[] {
  const docs = chunks.map((chunk) => tokens(chunk.text));
  const averageLength = docs.reduce((sum, doc) => sum + doc.length, 0) / docs.length;

  // In how many chunks each term appears.
  const chunksWith = new Map<string, number>();
  for (const doc of docs) {
    for (const term of new Set(doc)) chunksWith.set(term, (chunksWith.get(term) ?? 0) + 1);
  }

  const queryTerms = [...new Set(tokens(query))];
  return chunks
    .map((chunk, i) => ({ ...chunk, score: bm25(queryTerms, docs[i]) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k);

  function bm25(terms: string[], doc: string[]): number {
    let score = 0;
    for (const term of terms) {
      const count = doc.filter((t) => t === term).length;
      if (count === 0) continue;
      const n = chunksWith.get(term) ?? 0;
      const rarity = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      const lengthPenalty = 1 - B + (B * doc.length) / averageLength;
      score += (rarity * (count * (K1 + 1))) / (count + K1 * lengthPenalty);
    }
    return score;
  }
}

// Lower-case words and codes; "LS-220R" and "W-78" stay whole, which is the point.
function tokens(text: string): string[] {
  const words = text.toLowerCase().match(/[a-z0-9][a-z0-9.-]*/g) ?? [];
  return words.map((word) => word.replace(/[.-]+$/, ""));
}
