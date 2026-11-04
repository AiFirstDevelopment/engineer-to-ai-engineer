// Run the ten questions at each step of the ladder, one improvement switched on at a time,
// and print the table. Usage: npx tsx --env-file=.env evals/ladder.ts
import type { Options } from "../src/pipeline";
import { cases, run } from "./suite";

const ladder: [string, Options][] = [
  ["vector only", {}],
  ["+ hybrid", { hybrid: true }],
  ["+ rerank", { hybrid: true, rerank: true }],
  ["+ widen", { hybrid: true, rerank: true, widen: true }],
  ["+ cite check", { hybrid: true, rerank: true, widen: true, citeCheck: true }],
];

cases.forEach((c, i) => console.log(`${String(i + 1).padStart(2)}. ${c.question}`));
console.log();
console.log("step            passed   cost     failed");

for (const [name, options] of ladder) {
  const result = await run(options);
  const failed = result.outcomes.flatMap((o, i) => (o.passed ? [] : [i + 1]));
  console.log(
    `${name.padEnd(15)} ${String(result.passed).padStart(2)}/10    ` +
      `$${result.cost.toFixed(3)}   ${failed.join(", ") || "-"}`,
  );
}
