// Paste a document into the prompt and the model can answer from it. Pass the whole folder and
// the whole corpus goes in; the token count says what that costs on every single question.
// Usage: npx tsx --env-file=.env src/ask-with-doc.ts docs/returns-policy.md "question"
//        npx tsx --env-file=.env src/ask-with-doc.ts docs "question"
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { ask, cost, countTokens } from "./claude";

const [path, question] = process.argv.slice(2);
if (!path || !question) {
  console.error('usage: npx tsx --env-file=.env src/ask-with-doc.ts <file or folder> "question"');
  process.exit(1);
}

const prompt = `Answer the question from the document below. If the document does not answer
it, say so.

<document>
${readMarkdown(path)}
</document>

Question: ${question}`;

const tokens = await countTokens(prompt);
const perQuestion = cost({ input_tokens: tokens, output_tokens: 0 });
console.log(`prompt: ${tokens.toLocaleString()} tokens, $${perQuestion.toFixed(4)} of input`);
console.log();

const answer = await ask([{ role: "user", content: prompt }]);
console.log(answer.text);
console.log();
console.log(
  `tokens in: ${answer.inputTokens}  out: ${answer.outputTokens}` +
    `  cost: $${answer.cost.toFixed(4)}`,
);

// One Markdown file, or every Markdown file in a folder. (The PDF waits for episode 6.)
function readMarkdown(path: string): string {
  if (!statSync(path).isDirectory()) return readFileSync(path, "utf8");
  return readdirSync(path)
    .filter((name) => name.endsWith(".md"))
    .map((name) => `# File: ${name}\n\n${readFileSync(join(path, name), "utf8")}`)
    .join("\n\n");
}
