// Hybrid retrieval. Vector search finds meaning; keyword search finds exact terms, the model
// numbers, part codes and names that embeddings blur. Reciprocal rank fusion merges the two
// lists by rank, not by score, because the scores are on different scales: a chunk earns
// 1 / (60 + rank) from each list it appears in, and the sums are the new order.
import type { Hit } from "./retrieve";

const RRF_K = 60;

export function fuse(byVector: Hit[], byKeyword: Hit[], k = 5): Hit[] {
  const fused = new Map<number, Hit>();
  for (const list of [byVector, byKeyword]) {
    list.forEach((hit, rank) => {
      const entry = fused.get(hit.id) ?? { ...hit, score: 0 };
      entry.score += 1 / (RRF_K + rank + 1);
      fused.set(hit.id, entry);
    });
  }
  return [...fused.values()].sort((a, b) => b.score - a.score).slice(0, k);
}
