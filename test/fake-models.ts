// Fake models for tests: deterministic, instant, free, and no network.
//
// The fake embedder hashes each word into one of 384 dimensions, so texts that share words point
// the same way. The fake chat model answers from markers: a passage containing <<say: ...>> is
// the answer, cited with that passage's number; with no marker it says "I don't know". Asked to
// score passages (the reranker), it gives 10 to a passage with a marker and 1 to the rest.
import type { Answer, Message, Options } from "../src/claude";
import type { StoredChunk } from "../src/db";
import type { Models } from "../src/models";

export function fakeEmbed(text: string): Promise<Float32Array> {
  const vector = new Float32Array(384);
  for (const word of text.toLowerCase().match(/[a-z0-9]{3,}/g) ?? []) {
    let hash = 0;
    for (const char of word) hash = (hash * 31 + char.charCodeAt(0)) % 384;
    vector[hash] += 1;
  }
  const length = Math.hypot(...vector) || 1;
  return Promise.resolve(vector.map((x) => x / length));
}

export function fakeModels(): Models & { calls: Message[][] } {
  const calls: Message[][] = [];
  return {
    calls,
    embed: fakeEmbed,
    async chat(messages: Message[], options: Options = {}): Promise<Answer> {
      calls.push(messages);
      const prompt = String(messages[0].content);
      const passages = prompt
        .split(/\n\n(?=\[\d+\] )/)
        .map((block) => /^\[(\d+)\] ([^]*)/.exec(block))
        .filter((match) => match !== null);
      if (options.format) {
        const scores = passages.map(([, n, text]) => ({
          n: Number(n),
          score: text.includes("<<say:") ? 10 : 1,
        }));
        return reply(JSON.stringify({ scores }));
      }
      for (const [, n, text] of passages) {
        const said = /<<say: (.+?)>>/.exec(text);
        if (said) return reply(said[1].includes("[") ? said[1] : `${said[1]} [${n}]`);
      }
      return reply("I don't know.");
    },
  };
}

function reply(text: string): Answer {
  const content = [{ type: "text" as const, text }];
  return { text, content, stopReason: "end_turn", inputTokens: 0, outputTokens: 0, cost: 0 };
}

// A tiny corpus: one chunk per text, embedded with the fake embedder.
export async function corpus(texts: string[]): Promise<StoredChunk[]> {
  return Promise.all(
    texts.map(async (text, i) => ({
      id: i + 1,
      source: `doc${i + 1}.md`,
      heading: `Section ${i + 1}`,
      page: null,
      position: 0,
      text,
      embedding: await fakeEmbed(text),
    })),
  );
}
