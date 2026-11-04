// Ask the model one question from the command line.
// Usage: npx tsx --env-file=.env src/ask.ts "your question"
import { ask } from "./claude";

const question = process.argv[2];
if (!question) {
  console.error('usage: npx tsx --env-file=.env src/ask.ts "your question"');
  process.exit(1);
}

const answer = await ask([{ role: "user", content: question }]);

console.log(answer.text);
console.log();
console.log(
  `tokens in: ${answer.inputTokens}  out: ${answer.outputTokens}` +
    `  cost: $${answer.cost.toFixed(4)}`,
);
