// Which stage of the pipeline a failing case failed in, read from its scores. The order matters:
// a model that never saw a source cannot be blamed for the answer, and an answer that is wrong
// cannot be blamed on its citations.
import type { CaseResult } from "./scoring";

export type Stage = "retrieval miss" | "wrong fallback" | "answer miss" | "citation miss";

export function stage(r: CaseResult): Stage | null {
  if (r.status !== "fail") return null;
  if (r.expect === "fallback") return "wrong fallback"; // answered what the corpus does not say
  if (!r.retrieval.shown) return "retrieval miss"; // no passage holding a source was shown
  if (!r.checked) return "wrong fallback"; // a source was shown and it said "I don't know"
  const { facts, forbidden } = r.checked;
  if (facts.some((f) => !f.met) || forbidden.length || r.verdict?.grounded === false) {
    return "answer miss"; // shown the source, answered, and got it wrong
  }
  return "citation miss"; // the facts are right; the citations are missing or point elsewhere
}

// What to look at first for each stage.
export const NEXT: Record<Stage, string> = {
  "retrieval miss": "the query and the chunks: why the source did not rank",
  "wrong fallback": "the prompt and the passage: why the model would not answer from it",
  "answer miss": "the answer against the passage, and the case's own terms",
  "citation miss": "the [n] in the answer against the passages shown",
};
