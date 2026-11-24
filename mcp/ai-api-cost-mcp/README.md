# AI API Cost MCP Server

An MCP server that estimates and compares **OpenAI, Anthropic Claude and Google Gemini API costs** for a SaaS feature: monthly token cost, cost per request, gross margin, break-even price per user and break-even users.

Ask your AI assistant things like:

- "If 2,500 users each send 30 chat messages a month, what does Claude Sonnet 5.5 cost us?"
- "Compare every model for a support bot with 80 requests per user, priced at $49 a month."
- "At $1 input and $4 output per million tokens, what's our margin on the documents workload?"

It uses the same rates, presets and formulas as the free web calculator at [aisaaswithmustafa.com/tools/ai-api-cost-calculator.html](https://aisaaswithmustafa.com/tools/ai-api-cost-calculator.html), so the two always agree.

## Tools

| Tool | What it does |
|---|---|
| `list_models` | Current rates per 1M input, cached input and output tokens for each model, with promotional end dates and official pricing sources. Optional `provider` filter. |
| `estimate_cost` | Full monthly estimate for one model (or your own `custom_rates`): token cost breakdown, cost per request, total cost, revenue, gross profit and margin, break-even price and users. |
| `compare_models` | Runs one workload against every model (or one provider) and ranks them by monthly API cost, with total cost and margin. |

Every workload can start from a preset (`chat`, `support`, `summarizer`, `documents`) and override any number: `users`, `requests_per_user`, `input_tokens`, `output_tokens`, `cached_input_pct`, `extra_cost_per_request`, `price_per_user`, `variable_cost_per_user`, `fixed_monthly_cost`. The answer always says which values came from the preset.

All tools are read-only calculations. Results are planning estimates, not billing guarantees, and cover token cost only, not output quality or latency.

## Install

Requires Node.js 18.17 or newer.

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "ai-api-cost": {
      "command": "npx",
      "args": ["-y", "ai-api-cost-mcp"]
    }
  }
}
```

On Windows, if `npx` is not found, use `"command": "cmd"` with `"args": ["/c", "npx", "-y", "ai-api-cost-mcp"]`.

**Claude Code:**

```bash
claude mcp add ai-api-cost -- npx -y ai-api-cost-mcp
```

**Cursor** (`.cursor/mcp.json`): the same `mcpServers` block as Claude Desktop.

## Where the rates come from

- The package bundles the rate table, verified against the official OpenAI, Anthropic and Google pricing pages (the verified date is shown in every answer).
- On start, the server also tries the public rates file at `https://aisaaswithmustafa.com/tools/ai-api-pricing.json` and uses it if it is newer, so price updates arrive without a new release. It is a plain GET of a static JSON file; nothing you type is sent anywhere.
- Set `AI_API_COST_MCP_OFFLINE=1` to skip that request and use only the bundled rates.
- Promotional prices switch to the standard rate automatically after their end date.

## Development

```bash
npm install
npm test        # starts the server over stdio with a real MCP client and checks every tool
npm run sync    # inside the website repo only: re-copy the calculator module
```

`src/calculator.cjs` is a copy of the calculator that runs on the website, so the rates and formulas stay identical. This repository is published from the `mcp/ai-api-cost-mcp` folder of the website's repository; in a standalone clone, `npm run sync` keeps the bundled copy.

## Author

Built by [Muhammad Mustafa](https://aisaaswithmustafa.com), full-stack SaaS and AI developer. Issues and suggestions are welcome.

## License

MIT
