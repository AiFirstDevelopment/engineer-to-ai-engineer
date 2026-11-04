# From engineer to AI engineer

The code for the YouTube series *From engineer to AI engineer*: eight episodes that take an
experienced software engineer with no generative-AI background from conventional software to a
first retrieval pipeline (RAG), built across the series one piece per episode. Its second series,
*Prove it works*, builds the evaluation harness that tells you whether that pipeline answers
right, on the same repository.

Every episode is one commit and one tag (`s1e1` to `s1e8` for the first series, `s2e1` on for the
second).
Check out a tag and you have the repository exactly as that episode leaves it; this README
describes only what exists so far.

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

The series answers with one chat model, `claude-sonnet-5-5`, set in one place (the request body
in `ask.sh`, and the constant `MODEL` in `src/claude.ts`). It costs $2 per million input tokens
and $10 per million output tokens. A question through the finished pipeline is a few thousand
tokens in and a few hundred out, about a cent. Claude Opus 5.5 is the more capable model at
twice the price per token; Claude Haiku 5.5 is twenty times cheaper. The answers stay on
Sonnet: an answer is what the customer reads, and we want answers we can trust while we grade
them. You pay for your own runs, so the cheaper of the two models we trust is the default, and
swapping the constant is the whole migration. One step uses Haiku: from episode 8 the reranker
(`RERANK_MODEL` in `src/rerank.ts`) scores twenty passages for each question, a narrower job
than writing a cited answer and four times the text, and Haiku does it well enough at a
twentieth of the price per token (episode 8 measures it).

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

### 8. Making it good, with numbers (`s1e8`)

Four changes that usually help, each behind an option, each measured against the ten questions.

Files: `src/keyword.ts` is BM25, the ranking function behind most search engines, in forty
lines and no library: it finds exact terms, the model numbers, part codes and names that
embeddings blur. `src/hybrid.ts` is reciprocal rank fusion: the vector list and the keyword
list merged by rank, not by score, since the scores are on different scales. `src/rerank.ts`
has a model read the twenty candidates and score each 0 to 10 for how well it answers the
question, in one call for all of them: the question and the instructions are paid for once,
and the model sees the candidates side by side, which is what ranking needs; a call per
candidate would be twenty prompts and twenty round trips for scores that were never compared.
The reranker is Claude Haiku 5.5, not the answering model (`RERANK_MODEL`; `src/claude.ts` now
takes a `model` option and prices each model it calls, and refuses one it has no price for).
`src/widen.ts` replaces each passage with itself and its neighbours from the same file, in
order, because a chunk boundary is arbitrary. `src/cite-check.ts` removes any [n] that points
at a passage the model was not shown and marks the answer, because a citation nobody can
follow looks like evidence. `src/pipeline.ts` switches each on with an option; the server
keeps the cite check on. `evals/suite.ts` runs the ten questions with a set of options,
`evals/run.ts` takes the options as flags, and `evals/ladder.ts` climbs the ladder, one
change at a time, and prints the table (it was `evals/compare.ts` at `s1e8`, and is renamed in
series 2, episode 5, which needs the name). One expectation was widened while building this: the
manual says "hand-tight plus a quarter turn, never more than 2.5 N·m", and an answer that
quotes the first half is right.

```sh
npx tsx --env-file=.env evals/run.ts --hybrid --rerank
npx tsx --env-file=.env evals/ladder.ts
```

The transcript, `transcripts/s1e8-making-it-good.txt`, is the table, and it is not the table
you would draw from the names of the techniques:

| Step | Passed | Cost of the ten | Failed |
| --- | --- | --- | --- |
| vector only | 9/10 | $0.035 | 8 |
| + hybrid | 6/10 | $0.037 | 4, 6, 7, 8 |
| + rerank | 8/10 | $0.045 | 6, 8 |
| + widen | 9/10 | $0.095 | 8 |
| + cite check | 9/10 | $0.093 | 8 |

Read it row by row. Hybrid, on its own, made things worse, and the eval is why we know: the
keyword list is full of FAQ entries that say "Firefly" and "rechargeable" often, and after
fusion the catalog chunk that holds the 220R's weight fell from fourth to ninth, out of the five
the model sees; the chunk with the torque figure went the same way, and the model, shown the
wrong half of the page, said it did not know, which is the right failure. Shipped without
numbers, that change would have cost two questions. Reranking from the wider pool recovers
them, for a fifth more per question than hybrid alone, because the twenty passages are read by
Haiku at a twentieth of the answering model's price per token. Question 6, the bench fee, is the
noise: the model is nondeterministic, so on ten questions one run is worth plus or minus one.
The transcript runs the reranking step twice more, and it passes 9/10 and 8/10; the reranker
puts the repair manual's bench-fee page first, and it is the answering model, reading that page,
that sometimes says it does not know. Run it three times, or write fifty questions, before you
believe a difference of one. Then the transcript switches the reranker to Sonnet for one run:
9/10, the same as Haiku's best, for $0.165 instead of about $0.046, three and a half times the
cost of the ten. The model that writes the answer has to be good; the model that sorts passages
only has to be good enough, and the eval is how you know it is. Widening costs twice as much
for context these answers did not need, which makes it the most expensive change on the ladder,
and the cite check found nothing to remove, which is what you want from a guard. Question 8
never passes. The handbook's employee discount section ranks 88th by vector and 38th by
keyword for "Can staff buy a Second Light lantern for less?", because the question says staff
and the handbook says employee; no reranker can promote a passage that never reached it. The fix
for that is to rewrite the question before searching, which is a different change, and the ten
questions would measure it the same way.

That is the method: a change is a flag, the flag is measured, the number decides, and the
failures that remain tell you what to build next.

## Series 2: Prove it works

Series 1 ended with a pipeline and ten questions. Ten questions measured the four changes of
episode 8, and they also showed their limit: one run of the same settings scored 9 and the
next 8, so a difference of one question is noise, and a change that helps one kind of question
and hurts another cannot be seen at all. This series builds what a team needs before it trusts
a retrieval pipeline with customers: a set of cases with known answers, a pipeline that can be
tested without a model, a record of every step of every run, a score that says which stage
failed, a budget, a comparison between runs, and a gate in CI.

### 1. The golden set (`s2e1`)

Thirty cases with known answers, each one checked against the corpus.

Files: `evals/golden.jsonl` is the golden set, one case per line: an `id`; the `question`,
phrased the way a customer or a new employee asks it; `expect`, `answer` or `fallback`; the
required `facts`, each with the `match` terms that count as stating it ("40 days", "40-day",
"forty days"); the `forbidden` claims, each with terms that would mean the answer made it (the
Firefly 220's 310 g given for the 220R); and the `sources`: the file, the page for the PDF, and
a `quote` copied from the extracted text that proves the answer. 22 cases expect an answer and 8
expect "I don't know": the CEO's salary, last year's unit sales, a Sentinel 2000 that does not
exist, the dental plan's deductible (the plan is named, its deductible is not), the UPS account
number (the shipping policy says it exists and does not give it), the showroom Wi-Fi, the
Firefly's price in euros, the name of the Baltimore brass spinner. A fallback case may carry the
nearest source, to show what the corpus does say. The answer cases cover eleven of the thirteen
files and every trap in the corpus: the 220 against the 220R, the $60 threshold in the release
notes against the $75 in two older pages, four facts found only in the PDF, and series 1's
unsolved staff discount. `evals/golden.ts` loads the set and holds the two matching helpers
every later script uses: `flat` (whitespace collapsed) and `mentions` (any of the terms,
ignoring case).

`evals/check-golden.ts` checks the set before anything is scored against it: ids unique, every
answer case with facts and sources, every fact and claim with terms, and every quote found in
the text that `src/extract.ts` produces for its file and page, the same text the index is built
from. The comparison is character for character once runs of whitespace are collapsed, because
the Markdown is wrapped at 100 columns and the PDF's text comes out a line at a time: the line
breaks are layout, the characters are the content. A quote typed from memory is the commonest
error in a golden set, and a case whose quote is not in the corpus can be scored as a retrieval
miss forever while the pipeline is right.

```sh
npx tsx evals/check-golden.ts
```

No key, no model. The transcript, `transcripts/s2e1-the-golden-set.txt`, shows the thirty cases
passing (22 answer, 8 fallback, 26 quotes in 11 files), then the bench-fee quote changed from
the manual's "$25.00" to "$25", the way a person remembers it, and the check failing on it with
exit code 1, then the quote restored and the check passing. Why thirty: enough that one case is
three points and not ten, few enough that a person can read every answer of a run, and each one
written from the document, not from memory. A golden set grows: episode 7 adds a way to turn
real questions into new cases.

### 2. Models as a parameter (`s2e2`)

Dependency injection, so the pipeline can be tested without a model.

Until now the pipeline imported its models: `pipeline.ts` called `ask` from `claude.ts`,
`retrieve.ts` called `embed`, and the database opened itself when any of them was imported. A
test of the pipeline's rules (cite the passage, say "I don't know" when nothing answers, do not
even ask when nothing retrieved is about the question) would have needed a key, a network, a 97
MB embedding model and money, and it would have answered differently each time. So the models
become a parameter, the way a database connection is one.

Files: `src/models.ts` is the `Models` interface, two functions, `chat(messages, options)` (the
Messages API) and `embed(text)`, with `realModels`, the real pair, and `Deps`, everything the
pipeline needs from outside: its models and the chunks it searches. `answer(question, options,
deps)` in `src/pipeline.ts` imports no model any more; `retrieve`, `rerank` and `widen` take
what they use as arguments; `src/server.ts` and `evals/suite.ts` pass `realModels` and the
stored chunks. `src/db.ts` opens `lantern.db` on first use instead of on import.
`test/fake-models.ts` is the fake pair: an embedder that hashes each word into one of the 384
dimensions, so texts that share words point the same way, and a chat model that answers from
markers in the prompt: a passage containing `<<say: ...>>` is the answer, cited with that
passage's number, no marker means "I don't know", and asked to score passages it gives 10 to the
one with a marker. Every behaviour a test needs is written into the test's own corpus, so a test
reads as its own explanation. `test/pipeline.test.ts` has five tests on Node's built-in runner,
`node:test` and `node:assert`, run through `tsx`: the answer cites its passage and the citation
resolves to where it came from; no marker gives "I don't know" and no citations; a question
about nothing in the corpus never reaches the model (the fake counts its calls: zero); the cite
check removes a citation to a passage that was not shown and flags the answer; and the reranker
brings an answer from seventh place into the five shown, where without it the answer is "I don't
know". `npm test` runs them. `.github/workflows/test.yml` runs the type check, the tests and the
golden-set check on every push and pull request, with no secret: none of the three calls a
model.

```sh
npm test
```

The transcript, `transcripts/s2e2-models-as-a-parameter.txt`, shows `ANTHROPIC_API_KEY` unset
and the five tests passing in about a tenth of a second. What these tests prove is the code
around the model: the plumbing, the rules and the guards. They say nothing about whether the
real model answers right; that is what the golden set is for, and the next three episodes build
the harness that runs it. The two are different questions and need both: a fast test that runs
on every change, and an eval that runs when the answers may have moved. The pipeline's behaviour
with the real models did not change: the ten questions of series 1 still score 9/10 for four
cents.

### 3. The tracer (`s2e3`)

Every step of every case, written down, so a failure can be read instead of guessed at.

A pass or a fail says nothing about why. When the staff-discount question fails, did the search
miss the handbook, did the model see it and not use it, or did it answer and the check misread
the answer? Each has a different fix, and only a record of what happened tells them apart. The
record is the trace: for one case, the query, what retrieval returned and with what scores, what
the model was shown, the prompt, the answer, the tokens, the cost and the time.

Files: `evals/tracer.ts` wraps a `Models` (the parameter of episode 2 pays off again):
`traced(models)` returns models that behave exactly like the ones given and a list, `calls`,
that each embedding and each chat call appends to, with the text in, the reply out, the stop
reason, the tokens, the cost and the milliseconds. The pipeline does not know it is traced.
Retrieval is not a model call, so `answer` now reports it in its result: `retrieved`, the vector
search's top 20 in order with chunk id, where and score, and `shown`, the passages the model
saw, in the order it saw them, so `[2]` in an answer is `shown[1]`. The search always fetches 20
for this record; the vector-only pipeline still shows the model the first five, so its answers
are unchanged. `src/config.ts` holds `SERVED`, the options the server runs with (the cite
check), so the evals measure what is served unless told otherwise. `evals/eval.ts <run>` runs
the golden set through the traced pipeline, with the served options or the flags of series 1,
and writes `evals/runs/<run>/traces/<case>.json`, one file per case, refusing a run name that
exists. `evals/trace.ts <run> <case>` prints one trace readably: the question, the top eight
retrieved with rank, score and chunk, the passages shown, each call, the prompt's size and its
last line, the answer wrapped, the citations resolved, the total. `test/tracer.test.ts` checks,
with the fakes, that the tracer records the embedding and the chat call with the prompt and the
reply.

```sh
npx tsx --env-file=.env evals/eval.ts baseline
npx tsx evals/trace.ts baseline staff-discount
```

The first run, `evals/runs/baseline/`, is committed: thirty traces, $0.1001 for the thirty
questions, between one and two and a half seconds each. The transcript,
`transcripts/s2e3-the-tracer.txt`, lists the traces and reads one, series 1's failure, and it
answers the question episode 8 could only state: the handbook is not among the top eight
retrieved at all; the five passages shown are the Second Light program in `about.md`, the Base
Camp Bundle, the FAQ on refurbished lanterns, Lights for Scouts and the company's beliefs; the
model read 1,017 tokens of them, wrote 52 and said "I don't know." for a quarter of a cent. That
is a retrieval miss, read from the record in ten seconds, and the model's answer was the right
one for what it was shown. The rest of the run, read the same way, has its own surprises: the
bench-fee answer quotes the $25.00 fee and then says it does not know what an inspection alone
costs, a hedge a string match would count as a pass. Telling those apart is scoring, the next
episode.

### 4. Scoring (`s2e4`)

A pass or a fail per case, and for every fail the stage that failed: retrieval, the rules, the
judge.

Files: `evals/checks.ts` is what rules can decide. `retrieval` finds where the first chunk
holding one of the case's quotes came in the search's top 20, and whether one was shown; a chunk
holds a quote when it is from the same file and page and contains the quote, or either half of
it, because a chunk boundary can cut a quote in two (a half under 30 characters could match by
chance and does not count). `checkAnswer` finds which required facts the answer states, by their
match terms; which forbidden claims it makes, by theirs; and its citations: how many, any number
that points past the passages shown, and whether a cited passage holds a source.
`evals/judge.ts` is what rules cannot decide: whether every statement in the answer is backed by
the passages, and whether each `[n]` points at the passage that says it. A string match can find
"340" in an answer; it cannot tell "the 220R weighs 340 g, 30 g more than the 220's 310 g" from
"the 220R weighs 310 g". The judge is Claude Haiku 5.5, twenty times cheaper than the answering
model and the same model the reranker has used since series 1, episode 8 (`JUDGE_MODEL`, through
the `model` option of `ask`, which prices each model it calls and refuses one it has no price
for, so no call can escape the cost). It reads what the answering model read, its system prompt and its prompt, and the answer,
and returns `{ reason, grounded, cited }` through structured output, reason first so the verdict
follows from it. One call per answered case, about two hundredths of a cent each.
`evals/scoring.ts` puts them in order. A case that said "I don't know" passes if it is a
fallback case and fails if not; a fallback case that answered fails, however good the answer
sounds, because the corpus does not say. An answer case is checked by the rules and then judged,
and its result names the first thing that failed: a missing fact, a forbidden claim, no
citations, a citation to a passage not shown, ungrounded, miscited. It writes
`evals/runs/<run>/results.json`; `evals/report.ts` prints the table; `evals/eval.ts` now scores
the run it traced, and `evals/score.ts <run>` scores a run again, after the cases or the checks
change, without running the pipeline. `test/checks.test.ts` tests the rules on hand-made traces.

The judge is a model, so it is evaluated before it is trusted. `evals/judge-cases.jsonl` holds
fifteen answers labelled by hand, each a real prompt from the baseline run with either the
pipeline's own answer or a wrong one made from it: a changed number, a citation to the wrong
passage, a claim no passage makes, the 220's weight given for the 220R, the wrong approver for a
$700 refund. `evals/judge-eval.ts` runs the judge on them and reports its agreement with the
labels. It started as twelve. Scoring the baseline found the judge wrong three ways, and each
became a labelled case: it failed the $65 free-shipping answer because it had not been shown the
system prompt that says to prefer the more recent document (now it is); and it failed the
bench-fee answer for being cautious and the torque answer for a sentence without a citation,
neither of which is what it was asked to judge, so its instructions now say to judge the facts
and not the style, and that a missing citation is not a wrong one. With those changes it agreed
with all fifteen labels on two runs.

```sh
npx tsx --env-file=.env evals/judge-eval.ts
npx tsx --env-file=.env evals/eval.ts scored
```

The transcript, `transcripts/s2e4-scoring.txt`, shows the judge's evaluation, then a scored run.
The judge agreed on 15 of 15 for grounded and 14 of 15 for cited: on this run it called the
"every 20 fills" answer correctly cited, though it said in the same breath that the manual says
10. The judge is nondeterministic too, which is why it is measured on every change to it and
never trusted on one verdict. The run, `evals/runs/scored/`, passed 29 of 30 for $0.1057, judge
included: all eight fallback cases said "I don't know", and the one failure is the staff
discount, with no source in the top 20, a retrieval miss. The same scorer gave the baseline run
of episode 3 (`evals/score.ts baseline`) 27 of 30: besides the staff discount, the two Firefly
runtime and weight answers failed on a forbidden claim, because those answers mentioned the
other model's figure as a contrast ("30 grams more than the 220's 310 g"), and this run's
answers did not. Same code, same cases, two points apart, and whether the case or the answer is
wrong there is episode 6's question. The source column says more than the score. `return-window`
passed with its source nowhere in the top 20: the FAQ says 40 days too, and the case lists only
the policy. `holiday-return` passed with its source 16th: the answer came from the FAQ and a
worked example. A passing case with a missing source is a case that lists too few sources, or a
lucky answer; either is worth knowing before it fails.

### 5. Caps, the ledger and comparing runs (`s2e5`)

A budget the harness enforces, a record of every run, and a comparison that says which cases
moved.

An eval spends money on every run, and a harness that runs in CI or in a loop can spend a great
deal of it without anyone deciding to. So the harness has caps, and a run that reaches one
stops: the cases it did not reach are "not run", counted and shown, never passes. And a score on
its own says little; what decides a change is the same cases scored before and after, side by
side.

Files: `evals/ledger.ts` holds the caps, `RUN_CAP` ($1 a run) and `TOTAL_CAP` ($5 across every
run in the ledger), and the ledger itself, `evals/runs/ledger.json`: one line per run with when
it started, the commit (marked `+changes` when `src/`, `docs/` or the cases had uncommitted
edits, as a deliberate regression does), the configuration (the pipeline's options, its numbers
`MIN_SCORE`, `SHOWN` and `POOL`, now exported by `src/pipeline.ts` as `SETTINGS`, the model, the
judge and the budget), passed, failed, not run and the cost. `evals/eval.ts` now scores each
case as soon as it has run it and rewrites the run's ledger line after every case, so a run that
dies still counts what it spent; before each case it checks the run's spend against its budget
(`--budget` may lower it, never raise it above `RUN_CAP`) and the ledger's total against
`TOTAL_CAP`, and once either is reached every remaining case is recorded as not run. The check
is made between cases, so a run can pass its budget by at most one case. The results table and
its summary show the not-run count. `evals/compare.ts <runA> <runB>` lists every case whose
status changed, with the reason it failed and where its source was retrieved in each run, then
the unchanged count, the passed totals and the cost change. Series 1's ladder, which had that
name, is now `evals/ladder.ts`. The ledger starts with this episode: the `baseline` and `scored`
runs of episodes 3 and 4, $0.21 between them, came before it.

```sh
npx tsx --env-file=.env evals/eval.ts five
npx tsx --env-file=.env evals/eval.ts three        # with SHOWN = 3 in src/pipeline.ts
npx tsx evals/compare.ts five three
npx tsx --env-file=.env evals/eval.ts capped --budget 0.02
```

The transcript, `transcripts/s2e5-caps-ledger-compare.txt`, is a change proposed and refused by
its numbers. The served pipeline scores 26 of 30 for $0.1046 (run `five`; `scored`, the same
code, scored 29 an episode earlier: the bench fee said "I don't know" this time, and the two
Firefly answers mentioned the other model's figure again). Then the change: show the model three
passages instead of five, which makes every prompt shorter. It is 31% cheaper, $0.0724, and
scores 25: one point down, inside the noise, and on the score alone it would ship. The
comparison says otherwise. Two cases went from pass to "I don't know", the generator torque and
the Sentinel 1000's runtime on low, and in both the source chunk came 4th in the search: shown
with five passages, not with three. Those are not noise; they are the change, and the trace says
why. A third case went the other way, the Firefly 220's runtime, for no reason the change
explains: its source was 4th as well, not shown, and it answered from the FAQ without the
contrast that trips the case. The change is reverted (`git checkout src/pipeline.ts`). Last, a
run with a two-cent budget: it ran six cases, spent $0.0224, one case past the budget as the
check allows, and recorded the other 24 as not run, so its 5 passes cannot be read as a score.
The ledger then reads back all three runs, with the setting that differed: $0.1994 of the $5.

### 6. Diagnosing a failure (`s2e6`)

Four ways a case fails, told apart from the record, and each fixed where it was actually wrong.

A failing case is a question for the engineer: what broke? There are four answers, and each
points somewhere different. A retrieval miss: no passage holding the answer was shown, so the
model could not have answered; look at the query and the chunks. A wrong fallback: the model
said "I don't know" with the source in front of it, or answered a question the corpus does not
answer; look at the prompt and the passage. An answer miss: the model saw the source, answered,
and got it wrong; look at the answer against the passage, and at the case's own terms. A
citation miss: the facts are right and the citations are missing or point at a passage that does
not say it; look at the `[n]` against the passages. And the fix is not always in the code: the
code, the corpus, the case or the harness can each be the thing that is wrong, and the trace
says which.

Files: `evals/stages.ts` is the labelling, in an order that matters: a fallback case that
answered is a wrong fallback; then, for an answer case, a source never shown is a retrieval
miss, whatever the answer; a source shown and "I don't know" is a wrong fallback; a wrong fact,
a forbidden claim or an ungrounded answer is an answer miss; what is left is a citation miss.
`evals/diagnose.ts <run>` groups a run's failures by stage, with the reason and where the source
ranked, and says where to look first. `test/stages.test.ts` checks each label. `src/rewrite.ts`
and the pipeline's `rewrite` option (`--rewrite` on the command line) are the fix for the
retrieval miss, below; `src/config.ts` now serves it.

The four, found in the runs of episode 5 and this one, and fixed:

- **Retrieval miss, fixed in the code.** `staff-discount` in run `five`: source not in the top
  20, as in every run since series 1. The question says staff, the handbook says employee, and
  an embedding of the question lands among the Second Light passages. The fix is query
  rewriting: one call to the model turns the question into a search query in the words company
  documents use ("Second Light lantern employee discount staff purchase policy"), and the
  rewrite is what is searched. That query alone puts the handbook's employee discount 4th.
  Searching both the question and the rewrite and fusing the lists was tried first and lost it
  again: the question's list, all Second Light, outvoted the one passage the rewrite found.
  Measured (run `rewrite`, `--cite-check --rewrite`, against run `corpus`, the same without the
  rewrite): the staff discount passes with its source 4th and shown, no other case changed, 30
  of 30, for 21% more ($0.1257 against $0.1042, the rewrite call costs about $0.0004). It is now
  served.

- **Answer miss, fixed in the case.** `firefly-220r-weight` and `firefly-220-low-runtime` in run
  `five`: source 4th and shown, the right figure in the answer, and a forbidden claim matched.
  The answers were right ("340 g, 30 grams more than the Firefly 220's 310 g"); the case's
  forbidden term, "310", was wrong, because it matched the contrast as well as the mistake. The
  terms are now the mistake itself ("220R weighs 310", "220 runs 48"). Measured by scoring run
  `five` again under the new cases without running the pipeline (`evals/runs/five-recased/`,
  `evals/score.ts`): both pass, nothing else moved, 26 to 28.

- **Wrong fallback, fixed in the corpus.** `bench-fee` in run `five`: source 1st and shown, and
  the answer was "I don't know. The passages give the paid-repair bench fee of $25.00 plus parts
  [1], but none of them mentions a charge just for inspecting". The pipeline keeps only "I don't
  know." of such a reply, as it should. The model was right: the manual gives the fee for a
  repair, the warranty policy says a customer can decline the quote, and nothing says what
  declining costs. That is a gap in the documentation, the question customers will ask, and the
  eval found it. `docs/warranty.md` now says it: "The bench fee of $25.00 pays for the
  inspection and the quote, and is charged whether or not the customer goes ahead with the
  repair." The policy is the fictional company's to decide; deciding it is the fix. The case
  lists the new sentence as a second source. Measured (run `corpus` against `five-recased`):
  bench-fee passes, citing the new sentence, nothing else moved, 28 to 29.

- **Citation miss, fixed in the harness.** No run of the served pipeline produced one; run
  `widen` (`--cite-check --rewrite --widen`, each passage shown with its neighbours) did:
  `refund-approval` failed as miscited. Read from the trace, the answer was right and so were
  its citations: "[1][2][4]" follow "Tomas Reyes must approve it", and passage 4, the handbook,
  says exactly that. The judge had attached [4] to the next sentence. The judge was wrong, so
  the judge is what changed: it now returns a verdict per citation, each with the statement it
  is attached to ("the sentence or clause just before it, not a later one"), and the code
  decides "cited" from those. The answer joined the judge's labelled cases (now sixteen); the
  judge agreed with all sixteen on two runs. Measured by scoring `widen` again with the new
  judge (`widen-rejudged`): refund-approval passes. So did `staff-discount`, which `widen` had
  failed as an answer miss for saying the employee discount applies "on top of" the Second Light
  price; that is a reading of the handbook, not a quote, and the judge called it ungrounded once
  and grounded once. A borderline verdict that flips on a rerun is noise in the judge, and the
  right response is to read it, not to tune for it.

```sh
npx tsx evals/diagnose.ts five
npx tsx --env-file=.env evals/eval.ts rewrite --cite-check --rewrite
npx tsx evals/compare.ts five rewrite
```

The transcript, `transcripts/s2e6-diagnosing-a-failure.txt`, shows run `five` diagnosed (two
answer misses, a wrong fallback, a retrieval miss), run `widen` diagnosed (an answer miss and
the citation miss), then the comparisons: `five` to `rewrite`, all three fixes together, 26 to
30 of 30, for 20% more; and `widen` to `widen-rejudged`, 28 to 30. Two lessons from the four.
Half the fixes were not in the pipeline: a case that was wrong and a document that was missing a
sentence are as common as a bad prompt, and a harness that is only ever used to change the code
will make the code worse to satisfy a bad case. And widening, measured again here, costs twice
as much ($0.2547) for nothing these thirty cases need.

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
| `s1e8` | Making it good, with numbers |
| `s2e1` | The golden set |
| `s2e2` | Models as a parameter |
| `s2e3` | The tracer |
| `s2e4` | Scoring |
| `s2e5` | Caps, the ledger and comparing runs |
| `s2e6` | Diagnosing a failure |

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
