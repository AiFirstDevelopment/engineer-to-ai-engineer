// The golden set: thirty questions, each with what a right answer must say, what it must not
// say, and where in the corpus the answer is written down.
import { readFileSync } from "node:fs";

export type Fact = { fact: string; match: string[] }; // any one match term counts
export type Claim = { claim: string; match: string[] }; // any one match term is the claim
export type Source = { file: string; page?: number; quote: string }; // quote: verbatim

export type Case = {
  id: string;
  question: string;
  expect: "answer" | "fallback"; // fallback: the corpus does not say, "I don't know" is right
  facts: Fact[];
  forbidden: Claim[];
  sources: Source[];
  notes?: string;
};

export function loadGolden(path = "evals/golden.jsonl"): Case[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .filter((line) => line.trim())
    .map((line) => JSON.parse(line) as Case);
}

// Text compared for matching: line wrapping and runs of spaces are layout, not content.
export function flat(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

// A fact or a claim is in an answer when one of its terms is, ignoring case and quote style.
export function mentions(answer: string, terms: string[]): boolean {
  const norm = (s: string) => flat(s).toLowerCase().replace(/[’‘]/g, "'");
  return terms.some((term) => norm(answer).includes(norm(term)));
}
