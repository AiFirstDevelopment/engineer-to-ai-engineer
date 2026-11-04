// The results table of a scored run, one line per case. source: the rank, in the top 20 the
// search returned, of the first chunk holding one of the case's quotes, * when it was shown.
import type { Scored } from "./scoring";

export function printResults(scored: Scored): void {
  console.log("case                     status  source  facts  judge     why");
  for (const r of scored.results) {
    const { rank, shown } = r.retrieval;
    const source = rank === null ? "-" : `#${rank}${shown ? " *" : ""}`;
    const facts = r.checked
      ? `${r.checked.facts.filter((f) => f.met).length}/${r.checked.facts.length}`
      : "";
    const verdict = r.verdict;
    const judged = !verdict ? "" : verdict.grounded && verdict.cited ? "ok" : "no";
    const status = r.status === "pass" ? "pass" : "FAIL";
    const line = `${r.id.padEnd(24)} ${status.padEnd(7)} ${source.padEnd(7)} ${facts.padEnd(6)} `;
    console.log(`${line}${judged.padEnd(9)} ${r.why}`.trimEnd());
  }
  const of = (expect: string) => scored.results.filter((r) => r.expect === expect);
  const passed = (rs: Scored["results"]) => rs.filter((r) => r.status === "pass").length;
  const cost = scored.results.reduce((sum, r) => sum + r.cost, 0);
  console.log(
    `passed ${scored.passed}/${scored.results.length}: answer ${passed(of("answer"))}/` +
      `${of("answer").length}, fallback ${passed(of("fallback"))}/${of("fallback").length}; ` +
      `$${cost.toFixed(4)} with the judge (${scored.judge})`,
  );
}
