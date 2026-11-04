# From engineer to AI engineer

The code for the YouTube series *From engineer to AI engineer*: eight episodes that take an
experienced software engineer with no generative-AI background from conventional software to a
first retrieval pipeline (RAG), built across the series one piece per episode.

Every episode is one commit and one tag (`s1e1` to `s1e8`). Check out a tag and you have the
repository exactly as that episode leaves it; this README describes only what exists so far.

## The premise

A model is a function. Text goes in, text comes out. It keeps no state between calls, so every
request carries the whole conversation. It is nondeterministic: the same input can give a
different output. And it is priced by the token, in and out.

That is what changed. Everything around it did not. You reach it over HTTP. Your data still
lives in a database. Your tests still have to prove the thing works. Deployment is what it was
last year. This series builds the one new piece, a retrieval pipeline, with tools you already
have: TypeScript, SQLite, `curl` and an HTTP server.

## Setup

- Node 20 or later (`node --version`) and `jq` (`brew install jq`).
- An Anthropic API key from <https://console.anthropic.com>. The runs in this series cost
  cents; each episode's section says what its commands cost.
- `cp .env.example .env` and put your key in `.env`. The file is gitignored.
- `npm install`.

## The model

The series uses one chat model, `claude-sonnet-5-5`, in one place (the request body in `ask.sh`
for now; one constant in the code from episode 2 on). It costs $2 per million input tokens and
$10 per million output tokens. A question through the finished pipeline is a few thousand
tokens in and a few hundred out, about a cent. Claude Opus 5.5 is the more capable model at
twice the price per token; Claude Haiku 5.5 is twenty times cheaper but we want answers we can
trust while we grade them. You pay for your own runs, so the cheaper of the two models we trust
is the default, and swapping the constant is the whole migration.

## The corpus: Lantern Supply Co.

`docs/` is the internal documentation of a fictional company, Lantern Supply Co., a Maryland
retailer of camping lanterns and lamps: twelve Markdown files and one PDF, about 26,000 words,
full of specific facts (prices, model numbers, dates, names, policies) that no model has seen.
That is the point: in the episodes to come the model has to answer from these files or admit it
cannot. The facts contain traps on purpose: two products with near-identical names (the Firefly
220 and the Firefly 220R), a policy that a later document changed (the free-shipping threshold
is $75 in `shipping.md` and `faq.md`, and `release-notes.md` lowers it to $60 in version 4.3),
and facts that exist only in the PDF (`repair-manual.pdf`, the Repair Center's bench manual).

| File | What it is |
| --- | --- |
| `about.md` | The company, its history, locations and leadership |
| `catalog.md` | Every product with model number, price and specifications |
| `returns-policy.md` | The returns policy (40 days from delivery, and the rest) |
| `shipping.md` | Rates, carriers, fuel shipping limits |
| `warranty.md` | Warranty terms by product line and the claim process |
| `faq.md` | Customer-facing questions and answers |
| `employee-handbook.md` | An excerpt: pay, time off, discount, safety |
| `customer-service-playbook.md` | The support team's procedures and reply templates |
| `release-notes.md` | Release notes of Hearth, the online store |
| `fuel-safety.md` | Approved fuels, storage, disposal |
| `lumen-rewards.md` | The loyalty program |
| `showrooms.md` | The Frederick and Annapolis showrooms |
| `repair-manual.pdf` | The Repair Center bench manual (PDF only, nine pages) |

The PDF was rendered once from a Markdown draft with headless Chrome; the draft is not in the
repository, on purpose, so its facts exist only in the PDF.

## Episodes

### 1. What actually changed, and what didn't (`s1e1`)

The skeleton and one HTTP call.

Files: `package.json`, `tsconfig.json`, `.gitignore`, `.env.example`, the corpus in `docs/`,
and `ask.sh`: one `curl` to the Messages API, the request body written out in the script, the
answer's text and the token counts printed with `jq`. Nothing reads `docs/` yet.

```sh
./ask.sh "In two sentences: what is a race condition?"
```

The transcript, `transcripts/s1e1-what-changed.txt`, shows the call and the answer: a request
body with a model name, a limit on the answer's length and a list of messages; a response with
the text and the number of tokens in and out. Nothing else is needed. Cost of the run: a
fraction of a cent.

## Tags

| Tag | Episode |
| --- | --- |
| `s1e1` | What actually changed, and what didn't |

## Dependencies

Every dependency, with its one-line reason. Development dependencies only so far.

- `typescript`: the type checker (`npm run typecheck`).
- `tsx`: runs a TypeScript file directly (`npx tsx file.ts`), no build step.
- `@types/node`: the types of Node's own modules (`fs`, `http`, `process`).

## Transcripts

`transcripts/` holds the real output of each episode's commands, recorded when the episode was
built: the command line first, then what it printed, long lines wrapped to fit a slide. Nothing
in them is edited or invented.
