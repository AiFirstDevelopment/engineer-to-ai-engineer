// Cite check. Every [n] in the answer must point at a passage the model was shown. One that
// does not is removed and the answer is marked, because a citation nobody can follow is worse
// than none: it looks like evidence.
export type Checked = { answer: string; flagged: boolean };

export function checkCitations(answer: string, shown: number): Checked {
  let flagged = false;
  const checked = answer.replace(/ ?\[(\d+)\]/g, (citation, n: string) => {
    if (Number(n) >= 1 && Number(n) <= shown) return citation;
    flagged = true;
    return "";
  });
  return { answer: checked, flagged };
}
