// Files to text. A Markdown file is text already. A PDF is text per page, and the page number
// stays with it, because "page 4 of the repair manual" is how a person will want it cited.
import { readFileSync } from "node:fs";
import { extractText, getDocumentProxy } from "unpdf";

export type Page = { text: string; page: number | null };

export async function extract(path: string): Promise<Page[]> {
  if (path.endsWith(".pdf")) return extractPdf(path);
  return [{ text: readFileSync(path, "utf8"), page: null }];
}

async function extractPdf(path: string): Promise<Page[]> {
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(path)));
  const { text } = await extractText(pdf, { mergePages: false });
  return text.map((pageText, i) => ({ text: pageText, page: i + 1 }));
}
