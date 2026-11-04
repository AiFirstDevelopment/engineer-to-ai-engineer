// Widen. A chunk boundary is arbitrary, and the sentence that completes a fact is often in the
// chunk before or after. Each hit is replaced by itself with its neighbours from the same file,
// in order, as one longer passage.
import type { StoredChunk } from "./db";
import type { Hit } from "./retrieve";

export function widen(hits: Hit[], chunks: StoredChunk[]): Hit[] {
  return hits.map((hit) => {
    const around = chunks
      .filter((c) => c.source === hit.source && Math.abs(c.position - hit.position) <= 1)
      .sort((a, b) => a.position - b.position);
    return { ...hit, text: around.map((c) => c.text).join("\n\n") };
  });
}
