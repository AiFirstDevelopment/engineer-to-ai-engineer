// The one place this repository talks to the model: a POST to the Messages API, over fetch.

export const MODEL = "claude-sonnet-5-5";

// Dollars per million tokens, from the price list. Change the model, change these too.
const PRICE = { input: 2.0, output: 10.0 };

const API = "https://api.anthropic.com/v1/messages";

export type Message = { role: "user" | "assistant"; content: string };

export type Options = {
  system?: string; // instructions that sit above the conversation
  maxTokens?: number; // the most the answer may be, in tokens
};

export type Answer = {
  text: string;
  stopReason: string; // "end_turn" when the model finished; "max_tokens" when we cut it off
  inputTokens: number;
  outputTokens: number;
  cost: number; // dollars
};

export async function ask(messages: Message[], options: Options = {}): Promise<Answer> {
  const body = {
    model: MODEL,
    max_tokens: options.maxTokens ?? 1024,
    system: options.system,
    messages,
    // Hidden reasoning is billed as output. These are lookups, not proofs: keep it short.
    output_config: { effort: "low" },
  };
  const data = await post(API, body);
  return {
    text: data.content.filter((b) => b.type === "text").map((b) => b.text).join(""),
    stopReason: data.stop_reason,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    cost: cost(data.usage),
  };
}

// How many tokens a piece of text is, counted by the API without running the model. Free.
export async function countTokens(text: string): Promise<number> {
  const body = { model: MODEL, messages: [{ role: "user", content: text }] };
  const data = await post(`${API}/count_tokens`, body);
  return data.input_tokens;
}

export function cost(usage: { input_tokens: number; output_tokens: number }): number {
  return (usage.input_tokens * PRICE.input + usage.output_tokens * PRICE.output) / 1_000_000;
}

async function post(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "anthropic-version": "2026-10-21",
      "x-api-key": apiKey(),
    },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`${response.status} ${await response.text()}`);
  return (await response.json()) as ApiResponse;
}

function apiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) throw new Error("ANTHROPIC_API_KEY is not set; see README.md, Setup");
  return key;
}

// The parts of the API's responses that we read.
type ApiResponse = {
  content: { type: string; text: string }[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  input_tokens: number; // count_tokens answers with this alone
};
