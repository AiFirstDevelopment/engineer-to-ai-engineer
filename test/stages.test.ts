// Each kind of failure gets the stage that caused it.
import assert from "node:assert/strict";
import { test } from "node:test";
import type { CaseResult } from "../evals/scoring";
import { stage } from "../evals/stages";

const shown = { rank: 2, shown: true };
const base = { id: "x", why: "", cost: 0, status: "fail" as const, expect: "answer" as const };
const checked = (met: boolean) => ({
  facts: [{ fact: "40 days", met }],
  forbidden: [],
  citations: { count: 1, unresolved: [], sourceCited: true },
});
const verdict = (cited: boolean) => ({ reason: "", grounded: true, citations: [], cited });

test("labels each failure by the stage that failed", () => {
  const cases: [Partial<CaseResult>, string | null][] = [
    [{ status: "pass", retrieval: shown }, null],
    [{ expect: "fallback", retrieval: shown }, "wrong fallback"],
    [{ retrieval: { rank: null, shown: false }, checked: checked(false) }, "retrieval miss"],
    [{ retrieval: shown }, "wrong fallback"],
    [{ retrieval: shown, checked: checked(false), verdict: verdict(true) }, "answer miss"],
    [{ retrieval: shown, checked: checked(true), verdict: verdict(false) }, "citation miss"],
  ];
  for (const [result, label] of cases) {
    assert.equal(stage({ ...base, ...result } as CaseResult), label);
  }
});
