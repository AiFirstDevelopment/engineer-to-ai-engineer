// The one place this repository talks to the model: a POST to the Messages API, over fetch.

export const MODEL = "claude-sonnet-5-5";

// Dollars per million tokens, from the price list, for each model this repository calls.
// Change a model, change its line too: a model missing here is an error, never free.
const PRICES: Record<string, { input: number; output: number }> = {
  "claude-sonnet-5-5": { input: 2.0, output: 10.0 },
  // the reranker (src/rerank.ts) and the eval's judge (evals/judge.ts)
  "claude-haiku-5-5": { input: 0.1, output: 0.5 },
};

const API = "https://api.anthropic.com/v1/messages";

// A message is text, or a list of blocks. Thinking blocks come back from the model and are
// passed back to it untouched.
export type ContentBlock =
  | { type: "text"; text: string }
  | { type: "thinking"; thinking: string; signature: string }
  | { type: "tool_use"; id: string; name: string; input: unknown }
  | { type: "tool_result"; tool_use_id: string; content: string };

export type Message = { role: "user" | "assistant"; content: string | ContentBlock[] };

export type Tool = { name: string; description: string; input_schema: object };

export type Options = {
  model?: string; // MODEL unless a caller has a reason for another
  system?: string; // instructions that sit above the conversation
  maxTokens?: number; // the most the answer may be, in tokens
  tools?: Tool[]; // functions the model may ask us to run
  format?: object; // a JSON Schema the answer must follow
};

export type Answer = {
  text: string;
  content: ContentBlock[]; // the whole turn, tool calls included
  stopReason: string; // "end_turn", "tool_use", or "max_tokens" when we cut it off
  inputTokens: number;
  outputTokens: number;
  cost: number; // dollars
};

export async function ask(messages: Message[], options: Options = {}): Promise<Answer> {
  const model = options.model ?? MODEL;
  const body = {
    model,
    max_tokens: options.maxTokens ?? 1024,
    system: options.system,
    messages,
    tools: options.tools,
    output_config: {
      // Hidden reasoning is billed as output. These are lookups, not proofs: keep it short.
      effort: "low",
      format: options.format && { type: "json_schema", schema: options.format },
    },
  };
  const data = await post(API, body);
  return {
    text: data.content.filter((b) => b.type === "text").map((b) => b.text).join(""),
    content: data.content,
    stopReason: data.stop_reason,
    inputTokens: data.usage.input_tokens,
    outputTokens: data.usage.output_tokens,
    cost: cost(data.usage, model),
  };
}

// How many tokens a piece of text is, counted by the API without running the model. Free.
export async function countTokens(text: string): Promise<number> {
  const body = { model: MODEL, messages: [{ role: "user", content: text }] };
  const data = await post(`${API}/count_tokens`, body);
  return data.input_tokens;
}

export function cost(
  usage: { input_tokens: number; output_tokens: number },
  model = MODEL,
): number {
  const price = PRICES[model];
  if (!price) throw new Error(`no price for ${model}; add it to PRICES in src/claude.ts`);
  return (usage.input_tokens * price.input + usage.output_tokens * price.output) / 1_000_000;
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
  content: ContentBlock[];
  stop_reason: string;
  usage: { input_tokens: number; output_tokens: number };
  input_tokens: number; // count_tokens answers with this alone
};
