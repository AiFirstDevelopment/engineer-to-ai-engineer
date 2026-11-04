// Search docs/ by meaning. Usage: npx tsx src/search.ts "your query"
// The first run embeds every paragraph of docs/ and stores it in lantern.db; later runs reuse it.
import { readdirSync, readFileSync } from "node:fs";
import { cosine } from "./cosine";
import { allChunks, countChunks, insertChunk } from "./db";
import { embed } from "./embed";

const query = process.argv[2];
if (!query) {
  console.error('usage: npx tsx src/search.ts "your query"');
  process.exit(1);
}

if (countChunks() === 0) await indexParagraphs("docs");

// The whole search: embed the query, score every stored vector against it, keep the best five.
const queryVector = await embed(query);
const top = allChunks()
  .map((chunk) => ({ ...chunk, score: cosine(queryVector, chunk.embedding) }))
  .sort((a, b) => b.score - a.score)
  .slice(0, 5);

for (const hit of top) {
  const snippet = hit.text.replace(/\s+/g, " ").slice(0, 80);
  console.log(`${hit.score.toFixed(3)}  ${hit.source}`);
  console.log(`       ${snippet}...`);
}

// A quick split for now: a paragraph is a block of text between blank lines.
async function indexParagraphs(folder: string): Promise<void> {
  const started = Date.now();
  for (const name of readdirSync(folder).filter((n) => n.endsWith(".md"))) {
    const paragraphs = readFileSync(`${folder}/${name}`, "utf8")
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter((p) => p.length > 40);
    for (const paragraph of paragraphs) insertChunk(name, paragraph, await embed(paragraph));
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`indexed ${countChunks()} paragraphs in ${seconds}s\n`);
}
