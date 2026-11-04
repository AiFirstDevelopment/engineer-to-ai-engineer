// The two models the pipeline uses, handed to it as one parameter instead of imported by it.
// Production passes the real ones; a test passes fakes that never leave the process.
import { ask, type Answer, type Message, type Options } from "./claude";
import type { StoredChunk } from "./db";
import { embed } from "./embed";

export interface Models {
  chat(messages: Message[], options?: Options): Promise<Answer>; // the Messages API
  embed(text: string): Promise<Float32Array>; // text to vector
}

export const realModels: Models = { chat: ask, embed };

// Everything the pipeline needs from outside: its models and the chunks it searches.
export type Deps = { models: Models; chunks: StoredChunk[] };
