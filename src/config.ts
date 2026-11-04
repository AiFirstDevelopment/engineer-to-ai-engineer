// The pipeline options the server runs with. The evals run these too unless told otherwise,
// so what is measured is what is served. Change them only with numbers (evals/compare.ts).
import type { Options } from "./pipeline";

export const SERVED: Options = { citeCheck: true, rewrite: true };
