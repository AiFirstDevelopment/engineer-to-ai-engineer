// Check the golden set before trusting any score built on it: every case well formed, and every
// quote found in the text src/extract.ts produces for its file (and page), character for
// character once line wrapping is set aside. A quote that is not in the corpus proves nothing.
// Usage: npx tsx evals/check-golden.ts
import { extract, type Page } from "../src/extract";
import { flat, loadGolden, type Case } from "./golden";

const cases = loadGolden();
const pages = new Map<string, Page[]>();
const problems: string[] = [];

for (const c of cases) {
  for (const problem of shape(c, cases)) problems.push(`${c.id}: ${problem}`);
  for (const source of c.sources) {
    const where = source.page ? `${source.file} p.${source.page}` : source.file;
    if (!pages.has(source.file)) pages.set(source.file, await extract(`docs/${source.file}`));
    const text = pages
      .get(source.file)!
      .filter((p) => source.page === undefined || p.page === source.page)
      .map((p) => flat(p.text))
      .join(" ");
    if (!text.includes(flat(source.quote))) {
      problems.push(`${c.id}: not in ${where}: "${source.quote.slice(0, 40)}..."`);
    }
  }
}

const answers = cases.filter((c) => c.expect === "answer").length;
const quotes = cases.reduce((n, c) => n + c.sources.length, 0);
console.log(`${cases.length} cases: ${answers} answer, ${cases.length - answers} fallback`);
console.log(`${quotes} quotes checked against ${pages.size} files`);
for (const problem of problems) console.log(`FAIL  ${problem}`);
const n = problems.length;
console.log(n ? `${n} problem${n === 1 ? "" : "s"}` : "all quotes verbatim");
process.exit(n ? 1 : 0);

function shape(c: Case, all: Case[]): string[] {
  const out: string[] = [];
  if (all.filter((other) => other.id === c.id).length > 1) out.push("duplicate id");
  if (c.expect !== "answer" && c.expect !== "fallback") out.push(`expect is "${c.expect}"`);
  if (c.expect === "answer" && c.facts.length === 0) out.push("an answer case needs facts");
  if (c.expect === "answer" && c.sources.length === 0) out.push("an answer case needs sources");
  if (c.expect === "fallback" && c.facts.length > 0) out.push("a fallback case has no facts");
  for (const f of [...c.facts, ...c.forbidden]) {
    if (f.match.length === 0) out.push("a fact or claim with no match terms");
  }
  return out;
}
