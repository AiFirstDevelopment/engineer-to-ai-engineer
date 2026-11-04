// The ETL: extract, chunk, embed, store. Run it again and unchanged files are skipped, changed
// ones replaced and deleted ones removed; a hash of each file's bytes tells which is which.
// Usage: npx tsx src/index.ts
import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { chunk } from "./chunk";
import { countChunks, forgetFile, insertChunk, rememberFile } from "./db";
import { storedFiles, storedHash } from "./db";
import { embed } from "./embed";
import { extract } from "./extract";

const folder = "docs";
const started = Date.now();
const names = readdirSync(folder).sort();
let indexed = 0;

for (const name of names) {
  const hash = createHash("sha256").update(readFileSync(`${folder}/${name}`)).digest("hex");
  if (storedHash(name) === hash) continue;

  forgetFile(name);
  const chunks = chunk(name, await extract(`${folder}/${name}`));
  for (const [position, piece] of chunks.entries()) {
    insertChunk(piece, position, await embed(piece.text));
  }
  rememberFile(name, hash);
  indexed++;
  console.log(`${name}: ${chunks.length} chunks`);
}

for (const name of storedFiles()) if (!names.includes(name)) forgetFile(name);

const seconds = ((Date.now() - started) / 1000).toFixed(1);
console.log(
  `${indexed} of ${names.length} files indexed, ${names.length - indexed} unchanged, ` +
    `${countChunks()} chunks in the store, ${seconds}s`,
);
