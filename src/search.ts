// Search the store by meaning. Usage: npx tsx src/search.ts "your query"
// Run npx tsx src/index.ts first to fill the store.
import { where } from "./chunk";
import { cosine } from "./cosine";
import { allChunks } from "./db";
import { embed } from "./embed";

const query = process.argv[2];
if (!query) {
  console.error('usage: npx tsx src/search.ts "your query"');
  process.exit(1);
}

const chunks = allChunks();
if (chunks.length === 0) {
  console.error("the store is empty; run: npx tsx src/index.ts");
  process.exit(1);
}

// The whole search: embed the query, score every stored vector against it, keep the best five.
const queryVector = await embed(query);
const top = chunks
  .map((chunk) => ({ ...chunk, score: cosine(queryVector, chunk.embedding) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

for (const hit of top) {
  const snippet = hit.text.replace(/\s+/g, " ").slice(0, 80);
  console.log(`${hit.score.toFixed(3)}  ${where(hit)}`);
  console.log(`       ${snippet}...`);
}
