#!/bin/sh
# One HTTP call to a model, from the terminal.  Usage: ./ask.sh "What is a mutex?"
# The API key comes from .env (see README).

if [ -f .env ]; then . ./.env; export ANTHROPIC_API_KEY; fi

QUESTION="$1"

# The whole request: which model, how long an answer may be, and the conversation so far.
BODY=$(jq -n --arg q "$QUESTION" '{
  model: "claude-sonnet-5-5",
  max_tokens: 1024,
  messages: [{ role: "user", content: $q }]
}')

curl -s https://api.anthropic.com/v1/messages \
  -H "content-type: application/json" \
  -H "anthropic-version: 2026-10-21" \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -d "$BODY" \
  | jq -r '(.content[] | select(.type == "text") | .text),
           "",
           "input tokens: \(.usage.input_tokens)  output tokens: \(.usage.output_tokens)"'
