// SQLite holds the chunks and their vectors. A vector is a Float32Array stored as a blob.
import Database from "better-sqlite3";

export type Chunk = { id: number; source: string; text: string; embedding: Float32Array };

const db = new Database("lantern.db");

db.exec(`CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  text TEXT NOT NULL,
  embedding BLOB NOT NULL
)`);

export function insertChunk(source: string, text: string, embedding: Float32Array): void {
  const blob = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  db.prepare("INSERT INTO chunks (source, text, embedding) VALUES (?, ?, ?)")
    .run(source, text, blob);
}

export function allChunks(): Chunk[] {
  const rows = db.prepare("SELECT id, source, text, embedding FROM chunks").all() as Row[];
  return rows.map((row) => ({ ...row, embedding: toFloat32(row.embedding) }));
}

export function countChunks(): number {
  const row = db.prepare("SELECT count(*) AS n FROM chunks").get() as { n: number };
  return row.n;
}

type Row = { id: number; source: string; text: string; embedding: Buffer };

// A Float32Array must start on a 4-byte boundary and a Buffer's bytes may not, so copy them.
function toFloat32(blob: Buffer): Float32Array {
  const start = blob.byteOffset;
  return new Float32Array(blob.buffer.slice(start, start + blob.byteLength));
}
