// SQLite holds the chunks and their vectors, and remembers which version of each file they
// came from. A vector is a Float32Array stored as a blob.
import Database from "better-sqlite3";
import type { Chunk } from "./chunk";

export type StoredChunk = Chunk & { id: number; position: number; embedding: Float32Array };

// The store is a cache of docs/. When its shape changes, throw it away and index again.
const SCHEMA_VERSION = 2;

// Opened on first use, so a test that imports the pipeline never creates lantern.db.
let database: Database.Database | undefined;
function db(): Database.Database {
  if (database) return database;
  database = new Database("lantern.db");
  if (database.pragma("user_version", { simple: true }) !== SCHEMA_VERSION) {
    database.exec("DROP TABLE IF EXISTS chunks; DROP TABLE IF EXISTS files");
    database.pragma(`user_version = ${SCHEMA_VERSION}`);
  }
  database.exec(SCHEMA);
  return database;
}

const SCHEMA = `CREATE TABLE IF NOT EXISTS chunks (
  id INTEGER PRIMARY KEY,
  source TEXT NOT NULL,
  heading TEXT,
  page INTEGER,
  position INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding BLOB NOT NULL
);
CREATE TABLE IF NOT EXISTS files (source TEXT PRIMARY KEY, hash TEXT NOT NULL)`;

export function insertChunk(chunk: Chunk, position: number, embedding: Float32Array): void {
  const blob = Buffer.from(embedding.buffer, embedding.byteOffset, embedding.byteLength);
  db().prepare(
    `INSERT INTO chunks (source, heading, page, position, text, embedding)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(chunk.source, chunk.heading, chunk.page, position, chunk.text, blob);
}

export function allChunks(): StoredChunk[] {
  const rows = db().prepare("SELECT * FROM chunks").all() as Row[];
  return rows.map((row) => ({ ...row, embedding: toFloat32(row.embedding) }));
}

export function countChunks(): number {
  const row = db().prepare("SELECT count(*) AS n FROM chunks").get() as { n: number };
  return row.n;
}

export function storedHash(source: string): string | undefined {
  const row = db().prepare("SELECT hash FROM files WHERE source = ?").get(source) as
    | { hash: string }
    | undefined;
  return row?.hash;
}

export function storedFiles(): string[] {
  const rows = db().prepare("SELECT source FROM files").all() as { source: string }[];
  return rows.map((row) => row.source);
}

export function rememberFile(source: string, hash: string): void {
  db().prepare("INSERT OR REPLACE INTO files (source, hash) VALUES (?, ?)").run(source, hash);
}

export function forgetFile(source: string): void {
  db().prepare("DELETE FROM chunks WHERE source = ?").run(source);
  db().prepare("DELETE FROM files WHERE source = ?").run(source);
}

type Row = Omit<StoredChunk, "embedding"> & { embedding: Buffer };

// A Float32Array must start on a 4-byte boundary and a Buffer's bytes may not, so copy them.
function toFloat32(blob: Buffer): Float32Array {
  const start = blob.byteOffset;
  return new Float32Array(blob.buffer.slice(start, start + blob.byteLength));
}
