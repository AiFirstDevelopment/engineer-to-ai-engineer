// Documents to chunks. A chunk is the unit we embed, store, search and show the model: small
// enough to be about one thing, big enough to answer a question on its own. Split at headings
// first, because a heading is where the author changed the subject; then split long sections
// by size, with an overlap so nothing is cut in half; and keep where each chunk came from.
import type { Page } from "./extract";

export type Chunk = {
  source: string; // the file name
  heading: string | null; // the heading the text sits under, if the file has headings
  page: number | null; // the page number, for a PDF
  text: string;
};

const MAX_CHARS = 1200; // about 300 tokens

export function chunk(source: string, pages: Page[]): Chunk[] {
  const chunks: Chunk[] = [];
  for (const { text, page } of pages) {
    for (const section of splitAtHeadings(text)) {
      for (const piece of splitBySize(section.text)) {
        chunks.push({ source, heading: section.heading, page, text: piece });
      }
    }
  }
  return chunks;
}

// Where a chunk came from, for a person: "catalog.md > Firefly 220R (LS-220R) — $54.99".
export function where(chunk: Chunk): string {
  if (chunk.page) return `${chunk.source} p.${chunk.page}`;
  return chunk.heading ? `${chunk.source} > ${chunk.heading}` : chunk.source;
}

type Section = { heading: string | null; text: string };

// A Markdown heading starts a new section. The heading line stays in the text, because it
// usually names the thing the section is about.
function splitAtHeadings(text: string): Section[] {
  const sections: Section[] = [];
  let heading: string | null = null;
  let lines: string[] = [];
  const close = () => {
    if (lines.join("\n").trim()) sections.push({ heading, text: lines.join("\n").trim() });
    lines = [];
  };
  for (const line of text.split("\n")) {
    const match = /^#{1,6} (.+)/.exec(line);
    if (match) {
      close();
      heading = match[1].trim();
    }
    lines.push(line);
  }
  close();
  return sections;
}

// A long section is packed, paragraph by paragraph, into pieces of about MAX_CHARS. Each piece
// starts with the last paragraph of the one before (the overlap), so a fact that sits on a
// boundary is whole in one of them. A PDF comes out as lines, not paragraphs, so there a line
// is the unit.
function splitBySize(text: string): string[] {
  if (text.length <= MAX_CHARS) return [text];
  const separator = /\n\s*\n/.test(text) ? "\n\n" : "\n";
  const pieces: string[] = [];
  let current: string[] = [];
  for (const unit of text.split(separator === "\n\n" ? /\n\s*\n/ : "\n")) {
    if (current.join(separator).length + unit.length > MAX_CHARS && current.length > 0) {
      pieces.push(current.join(separator));
      current = [current[current.length - 1]];
    }
    current.push(unit);
  }
  pieces.push(current.join(separator));
  return pieces;
}
