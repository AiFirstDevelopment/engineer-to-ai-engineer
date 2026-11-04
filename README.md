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
- `cp .env.example .env` and put your key in `.env`. The file is gitignored. `ask.sh` reads it,
  and every `npx tsx` command below loads it with Node's own `--env-file=.env`, so there is no
  dotenv package.
- `npm install`. The first search (episode 5 on) downloads the embedding model, 97 MB, once.

## The model

The series uses one chat model, `claude-sonnet-5-5`, in one place (the request body in `ask.sh`,
and the constant `MODEL` in `src/claude.ts`). It costs $2 per million input tokens and
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

### 2. Calling a model from code (`s1e2`)

The same call from TypeScript, and the only client this repository will ever have.

Files: `src/claude.ts` is the client: `ask(messages, options)` is one `fetch` to the Messages
API that returns the answer's text, the token counts and the cost in dollars, computed from the
price list in one constant, with the model id in another; `countTokens(text)` asks the API's
count-tokens endpoint, which is free. `src/ask.ts` is a command line around `ask`, and
`src/tokens.ts` one around `countTokens`. There is no SDK: it is an HTTP API like any other, and
the whole client is shorter than most SDK quick-starts.

```sh
npx tsx --env-file=.env src/ask.ts "In one sentence: what does HTTP status 304 mean?"
npx tsx --env-file=.env src/ask.ts \
  "I bought a lantern from Lantern Supply Co. How many days do I have to return it?"
npx tsx --env-file=.env src/tokens.ts "The Firefly 220R charges in 3.5 hours over USB-C."
```

The transcript, `transcripts/s1e2-calling-a-model.txt`, shows three things. A general question
is answered well, in 79 output tokens, for a twelfth of a cent. The question about Lantern
Supply Co.'s return window is not answered: the model has never seen `docs/returns-policy.md`
(40 days from delivery), says it does not know the company, and sends the customer to their
receipt. It cannot know. That is the problem the rest of the series solves, and notice that a
model which guessed a number instead would sound exactly as sure. Last, a 49-character sentence
is 32 tokens: a token is a few characters, a short word is one, and numbers, model names and
punctuation split into several. Everything you pay for and every limit you will meet is counted
in tokens. Cost of the three runs together: under half a cent.

### 3. Prompts are code (`s1e3`)

Two ways to make the model's output something a program can use.

Files: `src/structured.ts` asks for JSON instead of prose. The shape is written twice, once as
a TypeScript type for the code and once as JSON Schema for the API, which holds the model to
it (`output_config.format`). The code still parses the text and checks the shape with a type
guard, because the model's output is input. `src/tools.ts` is tool use: one tool,
`lookup_order(order_id)`, read from `data/orders.json`, and the loop that runs it. The model
answers with a `tool_use` block instead of text; we run the function, append the model's whole
turn and a `tool_result` to the conversation, and call again; it repeats until the model
answers in text. The loop is ours, and it is a plain `while`. `src/claude.ts` grows two options,
`tools` and `format`, and returns the whole content of a turn, not only its text.

```sh
npx tsx --env-file=.env src/structured.ts
npx tsx --env-file=.env src/tools.ts "Has order LS-2026-012077 arrived yet?"
```

The transcript, `transcripts/s1e3-prompts-are-code.txt`, shows a customer's email turned into
an `OrderSummary` (the order id, the customer, two items with quantities, intent `return`) for
a fifth of a cent, and the tool loop: the model asks for `lookup_order(LS-2026-012077)`, gets
the order's JSON from the file, and answers that it was delivered on October 29 by UPS Ground,
with the tracking number and the email's two Fireflies and Northstar, in two round trips for
half a cent. The prompt, the schema and the tool's description are code: they live in the
repository, they are reviewed, and from episode 7 on they are tested.

### 4. Why it can't read your documents (`s1e4`)

The obvious fix, and why it is a dead end.

Files: `src/ask-with-doc.ts` pastes a document into the prompt and asks the question after it.
Given one Markdown file it pastes that file; given the folder it pastes every Markdown file in
it (the PDF waits for episode 6). Before calling the model it counts the prompt's tokens with
the free count-tokens endpoint and prints what that much input costs on every question.

```sh
npx tsx --env-file=.env src/ask-with-doc.ts docs/returns-policy.md \
  "In one sentence: how many days do I have to return a lantern?"
npx tsx --env-file=.env src/ask-with-doc.ts docs "What is the free shipping threshold?"
```

The transcript, `transcripts/s1e4-why-it-cant-read-your-documents.txt`, shows the return-window
question answered right, 40 days from delivery, once `returns-policy.md` is in the prompt:
3,720 tokens, three quarters of a cent of input per question. Then the whole corpus goes in,
45,331 tokens, and the model answers the free-shipping question right too, $60, and even
notices that the release notes are newer than the policy pages that still say $75. It can do
that because it sees everything. The price is nine cents of input per question, before the
answer, and it is paid again on every question because the model keeps nothing between calls.

That is the dead end. A thousand questions a day is $90 a day for 26,000 words of
documentation; ten times the documentation is ninety cents a question and a long wait for each
answer; thirty times does not fit at all, because this model's context window, the most it can
read in one call, is a million tokens. The window is the limit; the price is the wall you hit
first. The way out is to send only the few paragraphs that matter to the question, which means
finding them first. Finding them is retrieval, and it is the next four episodes.

### 5. Embeddings, for people who know SQL (`s1e5`)

Search by meaning, with a table, a blob column and a loop.

Files: `src/embed.ts` turns a text into a vector, a `Float32Array` of 384 numbers, with a small
open embedding model, `all-MiniLM-L6-v2`, running on your machine through
`@huggingface/transformers`. Texts that mean similar things get vectors that point the same
way. The model downloads once, 97 MB into `node_modules/@huggingface/transformers/.cache`, and
nothing is sent anywhere: there is no second vendor and no second key, and the only paid call
in this repository is still Claude. `src/cosine.ts` is cosine similarity in ten lines: how alike
two vectors point, 1 for the same direction, 0 for unrelated. `src/db.ts` is SQLite through
`better-sqlite3`, one table, `chunks(id, source, text, embedding)`, where the embedding is the
vector's bytes in a blob column like any other column. `src/search.ts` is the search: on its
first run it splits every Markdown file in `docs/` into paragraphs (a quick split on blank
lines, for now), embeds each and inserts it; on every run it embeds the query, scores every row
with cosine in TypeScript, a full scan, and prints the top five.

```sh
npx tsx src/search.ts "what happens if the courier loses my parcel"
```

No `--env-file`: nothing here calls Claude. The transcript, `transcripts/s1e5-embeddings.txt`,
shows the first run indexing 414 paragraphs in three seconds, then the top five. The best
match, at 0.627, is the playbook's "A package counts as lost when it has not arrived 10
business days after the expected delivery date", and it shares not one word with the query:
courier against carrier and package, parcel against package, loses against lost. A keyword
search finds none of that. Meaning beats words, and that is the whole reason for embeddings.
Notice also that a bare heading line made the top five: paragraphs are a poor unit, which is
episode 6.

When does the full scan stop being fine? 414 rows of 384 floats is nothing; a hundred thousand
rows is still a few tens of milliseconds in a loop like this one. When you have millions of
rows, or many searches a second, you add a vector index (`sqlite-vec`, `pgvector`, or a vector
database), which is the same decision as adding an index to any other table, made for the same
reason, and not before.

### 6. Chunking and indexing is ETL (`s1e6`)

Extract, transform, load. You have written this job before.

Files: `src/extract.ts` turns a file into text: a Markdown file as it is, a PDF page by page
through `unpdf`, with the page number kept, because "page 3 of the repair manual" is how a
person wants it cited. `src/chunk.ts` turns text into chunks, the unit we embed, store, search
and show the model: it splits at headings first, because a heading is where the author changed
the subject, then packs long sections paragraph by paragraph into pieces of about 1,200
characters (300 tokens or so), each starting with the last paragraph of the one before, the
overlap, so a fact on a boundary is whole in one of them. A PDF comes out as lines, not
paragraphs, so there a line is the unit, and it has no headings, so its chunks carry a page
instead. Every chunk keeps its source, heading and page. `src/db.ts` grows those columns, a
`position` (the chunk's place in its file, for episode 8), a `files` table with a SHA-256 hash
of each file, and a schema version: the store is a cache of `docs/`, and when its shape changes
it is thrown away and rebuilt. `src/index.ts` is the job: for each file in `docs/`, hash it;
if the hash is the one stored, skip it; otherwise delete its old chunks, extract, chunk, embed,
insert, and remember the hash; files that disappeared are removed. `src/search.ts` now only
searches, and shows where each hit came from.

```sh
npx tsx src/index.ts
npx tsx src/index.ts
npx tsx src/search.ts "what is the bench fee for an out-of-warranty repair"
```

The transcript, `transcripts/s1e6-chunking-and-indexing.txt`, shows the first run indexing
13 files into 287 chunks in 3.5 seconds (the 414 bare paragraphs of episode 5 are gone;
headings travel with their text now, and the FAQ's 54 question-and-answer pairs are the largest
share), the second run skipping all 13 in no time, and a search for the bench fee landing on
page 1 of the repair manual at 0.685: a fact that exists nowhere else in the corpus, found in a
PDF, with its page number. Nothing here calls Claude.

Why `unpdf` and not `pdf-parse`, the usual answer: it is plain JavaScript (pdf.js underneath),
an ES module, with no native build, and it gives the text page by page in one call; `pdf-parse`
is CommonJS and returns one blob for the whole file unless you hook into its page renderer.

### 7. Your first pipeline (`s1e7`)

Retrieve, prompt, answer: with a server in front and a test behind.

Files: `src/retrieve.ts` returns the top five chunks for a question (episode 5's search as a
function). `src/prompt.ts` is the system prompt and the layout: answer from the passages and
nothing else, cite every fact with the passage's number like [2], prefer the more recent
document when passages disagree, and when they do not answer, reply exactly "I don't know";
the passages are numbered and labelled with where they came from. `src/pipeline.ts` is
`answer(question)`: retrieve; if the best score is under 0.25 the model is not even asked (a
question about nothing in this corpus scores 0.17 to 0.24 here; measure yours); otherwise ask,
and if the model says it does not know, cite nothing; otherwise resolve every [n] in the answer
to the passage it points at. `src/server.ts` is `POST /ask` on Node's own `http` module, JSON
in, answer and citations out, thirty lines. `evals/questions.jsonl` is ten questions, each with
the strings its answer must contain, phrased the way people ask and aimed at the traps: the
rechargeable Firefly, a $65 order, the bench fee, the torque, and the CEO's salary, whose only
right answer is "I don't know". `evals/run.ts` runs them through the pipeline and prints pass
or fail and the total cost.

```sh
npx tsx --env-file=.env src/server.ts &
curl -s localhost:3000/ask -d '{"question": "How many days do I have to return a lantern?"}'
curl -s localhost:3000/ask -d '{"question": "How much is the CEO paid?"}'
npx tsx --env-file=.env evals/run.ts
```

The transcript, `transcripts/s1e7-your-first-pipeline.txt`, shows the return-window question
answered right over HTTP, 40 days from delivery, citing [2] and [4], which resolve to
`warranty.md > Relationship to the returns policy` and `returns-policy.md > Common situations`,
for a third of a cent: twenty-five times cheaper than pasting the corpus in episode 4, and
faster. The question about the CEO's pay gets "I don't know." and no citations. The ten
questions score 9/10 for less than four cents. The failure is "Can staff buy a Second Light
lantern for less?": the pipeline answered "I don't know", because the handbook's employee
discount section was not among the five passages retrieved (the question says staff and
Second Light; the five nearest passages are all about Second Light itself). It is an honest
failure, which is the second rule working, and it is a number. Episode 8 is about that number.

## Tags

| Tag | Episode |
| --- | --- |
| `s1e1` | What actually changed, and what didn't |
| `s1e2` | Calling a model from code |
| `s1e3` | Prompts are code |
| `s1e4` | Why it can't read your documents |
| `s1e5` | Embeddings, for people who know SQL |
| `s1e6` | Chunking and indexing is ETL |
| `s1e7` | Your first pipeline |

## Dependencies

Every dependency, with its one-line reason.

- `@huggingface/transformers`: runs the embedding model on your machine (ONNX Runtime
  underneath); no embedding API, no key.
- `better-sqlite3`: SQLite in-process and synchronous, the simplest database there is; npm
  installs a prebuilt binary.
- `unpdf`: text out of a PDF, page by page; plain JavaScript on top of pdf.js, no native build.

Development dependencies:

- `typescript`: the type checker (`npm run typecheck`).
- `tsx`: runs a TypeScript file directly (`npx tsx file.ts`), no build step.
- `@types/node`: the types of Node's own modules (`fs`, `http`, `process`).
- `@types/better-sqlite3`: the types of `better-sqlite3`.

## Transcripts

`transcripts/` holds the real output of each episode's commands, recorded when the episode was
built: the command line first, then what it printed, long lines wrapped to fit a slide. Nothing
in them is edited or invented.
