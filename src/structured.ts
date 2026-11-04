// Ask for JSON instead of prose, then treat it like any other input: parse it, check its shape.
// Usage: npx tsx --env-file=.env src/structured.ts
import { ask } from "./claude";

// What we want back, as a TypeScript type for the code...
type OrderSummary = {
  order_id: string | null;
  customer_name: string | null;
  items: { product: string; quantity: number }[];
  intent: "return" | "question" | "complaint" | "other";
};

// ...and as JSON Schema for the API, which holds the model to it.
const schema = {
  type: "object",
  properties: {
    order_id: { type: ["string", "null"] },
    customer_name: { type: ["string", "null"] },
    items: {
      type: "array",
      items: {
        type: "object",
        properties: { product: { type: "string" }, quantity: { type: "integer" } },
        required: ["product", "quantity"],
        additionalProperties: false,
      },
    },
    intent: { type: "string", enum: ["return", "question", "complaint", "other"] },
  },
  required: ["order_id", "customer_name", "items", "intent"],
  additionalProperties: false,
};

const email = `Hi, this is Sam Okoye. Last week I ordered two Firefly 220s and a Northstar
Dual-Fuel (order LS-2026-012077). The Northstar is still in its box and I would like to send
it back. The Fireflies are great.`;

const answer = await ask([{ role: "user", content: `Summarize this message:\n\n${email}` }], {
  system: "You extract order details from customer messages.",
  format: schema,
});

const parsed: unknown = JSON.parse(answer.text);
if (!isOrderSummary(parsed)) throw new Error(`unexpected shape: ${answer.text}`);

console.log(parsed);
console.log(`cost: $${answer.cost.toFixed(4)}`);

function isOrderSummary(value: unknown): value is OrderSummary {
  const v = value as OrderSummary;
  return (
    typeof v === "object" &&
    v !== null &&
    Array.isArray(v.items) &&
    ["return", "question", "complaint", "other"].includes(v.intent)
  );
}
