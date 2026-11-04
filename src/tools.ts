// Tool use: the model asks our code to run a function, we run it and send back the result,
// and the model answers once it has what it needs. We write the loop; it is a loop.
// Usage: npx tsx --env-file=.env src/tools.ts "Has order LS-2026-012077 arrived yet?"
import { readFileSync } from "node:fs";
import { ask, type ContentBlock, type Message, type Tool } from "./claude";

const tools: Tool[] = [
  {
    name: "lookup_order",
    description: "Look up one order by its id, such as LS-2026-004871. Returns the order as JSON.",
    input_schema: {
      type: "object",
      properties: { order_id: { type: "string", description: "The order id" } },
      required: ["order_id"],
    },
  },
];

function lookupOrder(orderId: string): string {
  const orders = JSON.parse(readFileSync("data/orders.json", "utf8")) as { order_id: string }[];
  const order = orders.find((o) => o.order_id === orderId);
  return order ? JSON.stringify(order) : `No order with id ${orderId}`;
}

const question = process.argv[2] ?? "Has order LS-2026-012077 arrived yet?";
const messages: Message[] = [{ role: "user", content: question }];
let cost = 0;

while (true) {
  const answer = await ask(messages, { tools });
  cost += answer.cost;

  const calls = answer.content.filter((block) => block.type === "tool_use");
  if (answer.stopReason !== "tool_use" || calls.length === 0) {
    console.log(answer.text);
    break;
  }

  // Keep the model's whole turn, then answer each call in one user message.
  messages.push({ role: "assistant", content: answer.content });
  const results: ContentBlock[] = calls.map((call) => {
    const { order_id } = call.input as { order_id: string };
    console.log(`> lookup_order(${order_id})`);
    return { type: "tool_result", tool_use_id: call.id, content: lookupOrder(order_id) };
  });
  messages.push({ role: "user", content: results });
}

console.log(`cost: $${cost.toFixed(4)}`);
