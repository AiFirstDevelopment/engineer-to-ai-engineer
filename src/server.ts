// POST /ask on Node's own http module: a question in, an answer with citations out.
// Usage: npx tsx --env-file=.env src/server.ts
//        curl -s localhost:3000/ask -d '{"question": "How long is the warranty?"}'
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { answer } from "./pipeline";

const PORT = 3000;

createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/ask") {
    return reply(response, 404, { error: "POST /ask" });
  }
  try {
    const { question } = JSON.parse(await body(request)) as { question?: string };
    if (!question) return reply(response, 400, { error: "a question is required" });
    // Switch on what your numbers justify (evals/compare.ts). The cite check is always cheap.
    reply(response, 200, await answer(question, { citeCheck: true }));
  } catch (error) {
    reply(response, 500, { error: String(error) });
  }
}).listen(PORT, () => console.log(`listening on http://localhost:${PORT}/ask`));

function reply(response: ServerResponse, status: number, json: unknown): void {
  response.writeHead(status, { "content-type": "application/json" });
  response.end(JSON.stringify(json));
}

async function body(request: IncomingMessage): Promise<string> {
  let text = "";
  for await (const chunk of request) text += chunk;
  return text;
}
