// Print one case of a run, step by step, from its trace.
// Usage: npx tsx evals/trace.ts <run> <case>
import { readFileSync } from "node:fs";
import type { Passage } from "../src/pipeline";
import type { Trace } from "./tracer";

const [run, id] = process.argv.slice(2);
const trace = JSON.parse(
  readFileSync(`evals/runs/${run}/traces/${id}.json`, "utf8"),
) as Trace;

console.log(`${trace.case} (run ${trace.run})`);
console.log(`question   ${trace.question}`);
console.log("retrieved  rank  score  chunk  where");
trace.retrieved.slice(0, 8).forEach((p, i) => console.log(row(String(i + 1), p)));
if (trace.retrieved.length > 8) console.log(`           ... ${trace.retrieved.length - 8} more`);
console.log("shown");
trace.shown.forEach((p, i) => console.log(row(`[${i + 1}]`, p)));
console.log("calls");
for (const call of trace.calls) {
  if (call.kind === "embed") console.log(`  embed    ${call.ms} ms`);
  else
    console.log(
      `  chat     ${call.model}, ${call.inputTokens} in, ${call.outputTokens} out, ` +
        `$${call.cost.toFixed(4)}, ${call.ms} ms, ${call.stopReason}`,
    );
}
const prompt = trace.calls.find((c) => c.kind === "chat");
if (prompt?.kind === "chat") {
  console.log(`prompt     ${prompt.prompt.length} characters; the question last:`);
  console.log(`           ${wrap(prompt.prompt.split("\n").at(-1) ?? "")}`);
}
console.log(`answer     ${wrap(trace.answer)}`);
const cites = trace.citations.map((c) => `[${c.n}] ${c.where}`);
console.log(`citations  ${cites.join("\n           ") || "none"}`);
console.log(`total      $${trace.cost.toFixed(4)}, ${trace.ms} ms`);

function row(rank: string, p: Passage): string {
  const chunk = String(p.id).padStart(5);
  return `           ${rank.padStart(3)}  ${p.score.toFixed(3)}  ${chunk}  ${p.where}`;
}

function wrap(text: string): string {
  const words = text.replace(/\s+/g, " ").split(" ");
  const lines = [""];
  for (const word of words) {
    if ((lines.at(-1) + " " + word).length > 86) lines.push("");
    lines[lines.length - 1] = `${lines.at(-1)} ${word}`.trim();
  }
  return lines.join("\n           ");
}
