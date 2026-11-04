// What is a token? Count some. Usage: npx tsx --env-file=.env src/tokens.ts "some text"
import { countTokens } from "./claude";

const text = process.argv[2];
if (!text) {
  console.error('usage: npx tsx --env-file=.env src/tokens.ts "some text"');
  process.exit(1);
}

const tokens = await countTokens(text);
const words = text.split(/\s+/).length;

console.log(`${text.length} characters, ${words} words, ${tokens} tokens`);
