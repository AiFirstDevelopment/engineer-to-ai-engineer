// The pipeline: retrieve, prompt, answer. Two rules on top: every fact cites its passage, and
// when there is nothing to cite, the answer is "I don't know." Four improvements sit behind
// options, so the evals can measure each one on its own. The models and the chunks are
// parameters: the pipeline imports no model, so a test can hand it fakes.
import { where } from "./chunk";
import { checkCitations } from "./cite-check";
import { fuse } from "./hybrid";
import { keywordSearch } from "./keyword";
import type { Deps } from "./models";
import { layout, SYSTEM } from "./prompt";
import { rerank } from "./rerank";
import { retrieve, type Hit } from "./retrieve";
import { widen } from "./widen";

export type Options = {
  hybrid?: boolean; // merge keyword search into the candidates
  rerank?: boolean; // let the model put the candidates in order
  widen?: boolean; // show each passage with its neighbours
  citeCheck?: boolean; // remove citations that point at nothing
};

export type Citation = { n: number; where: string };
export type Result = { answer: string; citations: Citation[]; cost: number; flagged?: boolean };

// Below this, the best passage is not about the question, and the model is not even asked.
const MIN_SCORE = 0.25;
const SHOWN = 5; // passages the model is shown
const POOL = 20; // candidates to choose them from, when something does the choosing

export async function answer(question: string, options: Options, deps: Deps): Promise<Result> {
  const pool = options.hybrid || options.rerank ? POOL : SHOWN;
  let hits = await retrieve(question, pool, deps);
  if (hits.length === 0 || hits[0].score < MIN_SCORE) return dontKnow(0);

  let cost = 0;
  if (options.hybrid) hits = fuse(hits, keywordSearch(question, deps.chunks, pool), pool);
  if (options.rerank) {
    const ranked = await rerank(question, hits, SHOWN, deps.models);
    hits = ranked.hits;
    cost += ranked.cost;
  }
  hits = hits.slice(0, SHOWN);
  if (options.widen) hits = widen(hits, deps.chunks);

  const reply = await deps.models.chat([{ role: "user", content: layout(question, hits) }], {
    system: SYSTEM,
  });
  cost += reply.cost;
  if (reply.text.trim().startsWith("I don't know")) return dontKnow(cost);

  let text = reply.text.trim();
  let flagged = false;
  if (options.citeCheck) ({ answer: text, flagged } = checkCitations(text, hits.length));
  return { answer: text, citations: cited(text, hits), cost, flagged };
}

function dontKnow(cost: number): Result {
  return { answer: "I don't know.", citations: [], cost };
}

// Every [n] in the answer, resolved to the passage it points at.
function cited(text: string, hits: Hit[]): Citation[] {
  const numbers = [...text.matchAll(/\[(\d+)\]/g)].map((match) => Number(match[1]));
  return [...new Set(numbers)]
    .filter((n) => hits[n - 1] !== undefined)
    .map((n) => ({ n, where: where(hits[n - 1]) }));
}
