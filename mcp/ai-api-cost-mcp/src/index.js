#!/usr/bin/env node
// AI API Cost MCP server: estimate and compare OpenAI, Claude and Gemini API
// costs, gross margin and break-even price from inside any MCP client.
// Same rates and formulas as https://aisaaswithmustafa.com/tools/ai-api-cost-calculator.html
import { createRequire } from "node:module";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { CALCULATOR_PAGE, PRESETS, calculateEstimate, currentModels, findModel, getRateTable } from "./pricing.js";

const { version } = createRequire(import.meta.url)("../package.json");

const USE_CASES = ["chat", "support", "summarizer", "documents"];
const PROVIDERS = ["OpenAI", "Anthropic", "Google"];

const money = (value, digits = 2) =>
  value === null || value === undefined
    ? "n/a"
    : new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);
const perRequest = (value) => (value === null ? "n/a" : money(value, value < 0.01 ? 4 : 2));
const count = (value) => Math.round(value).toLocaleString("en-US");
const pct = (value) => (value === null ? "n/a" : `${value.toFixed(1)}%`);

const workloadShape = {
  use_case: z
    .enum(USE_CASES)
    .optional()
    .describe("Preset workload to start from: chat (AI chat assistant), support (support bot), summarizer, documents (document processing). Any number you pass overrides the preset. Default: chat."),
  users: z.number().min(0).optional().describe("Monthly active users."),
  requests_per_user: z.number().min(0).optional().describe("AI requests per user per month."),
  input_tokens: z.number().min(0).optional().describe("Average input (prompt) tokens per request."),
  output_tokens: z.number().min(0).optional().describe("Average output tokens per request."),
  cached_input_pct: z.number().min(0).max(100).optional().describe("Share of input tokens served from the prompt cache, 0 to 100."),
  extra_cost_per_request: z.number().min(0).optional().describe("Other metered cost per request in USD, such as search, tool calls or storage. Default 0."),
  price_per_user: z.number().min(0).optional().describe("Subscription price per user per month in USD, used for revenue and margin."),
  variable_cost_per_user: z.number().min(0).optional().describe("Other variable cost per user per month in USD."),
  fixed_monthly_cost: z.number().min(0).optional().describe("Fixed monthly cost in USD, such as hosting and team tools."),
};

const FIELD_MAP = [
  ["users", "users"],
  ["requests_per_user", "requestsPerUser"],
  ["input_tokens", "inputTokens"],
  ["output_tokens", "outputTokens"],
  ["cached_input_pct", "cachePct"],
  ["price_per_user", "pricePerUser"],
  ["variable_cost_per_user", "variableCostPerUser"],
  ["fixed_monthly_cost", "fixedCost"],
];

function resolveWorkload(args) {
  const useCase = args.use_case || "chat";
  const preset = PRESETS[useCase];
  const values = { extraCostPerRequest: args.extra_cost_per_request ?? 0 };
  const fromPreset = [];
  for (const [arg, key] of FIELD_MAP) {
    if (args[arg] === undefined) {
      values[key] = preset[key];
      fromPreset.push(`${arg}=${preset[key]}`);
    } else {
      values[key] = args[arg];
    }
  }
  return { values, useCase, fromPreset };
}

function workloadLine(values) {
  return (
    `${count(values.users)} users x ${count(values.requestsPerUser)} requests = ${count(values.users * values.requestsPerUser)} requests/month; ` +
    `${count(values.inputTokens)} input + ${count(values.outputTokens)} output tokens per request; ${values.cachePct}% of input cached.`
  );
}

function rateFooter(table, extra = []) {
  return [
    ...extra,
    `Rates verified ${table.verifiedAt} against official provider pricing pages (source: ${table.origin}).`,
    `Planning estimate, not a billing guarantee. Web version: ${CALCULATOR_PAGE}`,
  ].join("\n");
}

const textResult = (text, structuredContent) => ({ content: [{ type: "text", text }], structuredContent });
const errorResult = (text) => ({ content: [{ type: "text", text }], isError: true });

const server = new McpServer({ name: "ai-api-cost-mcp", version });

server.registerTool(
  "list_models",
  {
    title: "List AI API models and rates",
    description:
      "List the OpenAI, Anthropic Claude and Google Gemini models this server knows, with current standard rates in USD per 1 million input, cached input and output tokens, promotional end dates and official pricing sources.",
    inputSchema: { provider: z.enum(PROVIDERS).optional().describe("Only list models from this provider.") },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async ({ provider }) => {
    const table = await getRateTable();
    const models = currentModels(table).filter((m) => !provider || m.provider === provider);
    const rows = models.map((m) => `| ${m.id} | ${m.name} | ${m.provider} | ${money(m.input)} | ${money(m.cached, 3)} | ${money(m.output)} |`);
    const notes = models.filter((m) => m.note).map((m) => `- ${m.name}: ${m.note}`);
    const text = [
      "| Model id | Name | Provider | Input / 1M | Cached input / 1M | Output / 1M |",
      "|---|---|---|---|---|---|",
      ...rows,
      "",
      rateFooter(table, notes.length ? ["Promotions:", ...notes] : []),
    ].join("\n");
    return textResult(text, { verifiedAt: table.verifiedAt, origin: table.origin, models });
  }
);

server.registerTool(
  "estimate_cost",
  {
    title: "Estimate monthly AI API cost and margin",
    description:
      "Estimate the monthly AI API bill for one model and a SaaS workload: token costs (uncached input, cached input, output), cost per request, total cost with other variable and fixed costs, revenue, gross profit, gross margin, break-even price per user and break-even users. Start from a use_case preset and override any number.",
    inputSchema: {
      model: z.string().optional().describe("Model id or name from list_models, e.g. gpt-6.1-sol or Claude Sonnet 5.5. Default: gpt-6.1-sol."),
      custom_rates: z
        .object({
          input: z.number().min(0).describe("USD per 1M uncached input tokens."),
          cached: z.number().min(0).describe("USD per 1M cached input tokens."),
          output: z.number().min(0).describe("USD per 1M output tokens."),
        })
        .optional()
        .describe("Use your own rates instead of a listed model, for example a negotiated price or a model not in the list."),
      ...workloadShape,
    },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    const table = await getRateTable();
    const models = currentModels(table);
    let rates;
    let label;
    if (args.custom_rates) {
      rates = args.custom_rates;
      label = args.model ? `${args.model} (custom rates)` : "Custom rates";
    } else {
      const model = findModel(models, args.model || "gpt-6.1-sol");
      if (!model) {
        return errorResult(`Unknown model "${args.model}". Known model ids: ${models.map((m) => m.id).join(", ")}. Or pass custom_rates.`);
      }
      rates = model;
      label = `${model.name} (${model.provider})`;
    }
    const { values, useCase, fromPreset } = resolveWorkload(args);
    const r = calculateEstimate(values, rates);
    const lines = [
      `Estimate for ${label}`,
      `Workload: ${workloadLine(values)}`,
      "",
      `AI API cost: ${money(r.apiCost)} per month`,
      `- Uncached input: ${count(r.uncachedInputTokens)} tokens, ${money(r.inputCost)}`,
      `- Cached input: ${count(r.cachedInputTokens)} tokens, ${money(r.cachedInputCost)}`,
      `- Output: ${count(r.totalOutputTokens)} tokens, ${money(r.outputCost)}`,
      `- Extra per-request costs: ${money(r.extraUsageCost)}`,
      `API cost per request: ${perRequest(r.apiCostPerRequest)}`,
      "",
      `Total monthly cost (API + other variable + fixed): ${money(r.totalCost)}`,
      `Revenue: ${money(r.revenue)} | Gross profit: ${money(r.grossProfit)} | Gross margin: ${pct(r.grossMarginPct)}`,
      `Total cost per user: ${money(r.totalCostPerUser)} | Break-even price per user: ${money(r.breakEvenPrice)} | Break-even users: ${r.breakEvenUsers === null ? "n/a (price does not cover variable cost)" : count(r.breakEvenUsers)}`,
      "",
      `Rates used: ${money(rates.input)} input, ${money(rates.cached, 3)} cached input, ${money(rates.output)} output per 1M tokens.${rates.source ? ` Source: ${rates.source}` : ""}`,
    ];
    if (rates.note) lines.push(rates.note);
    if (fromPreset.length) lines.push(`Taken from the "${useCase}" preset because you did not set them: ${fromPreset.join(", ")}.`);
    lines.push(rateFooter(table));
    return textResult(lines.join("\n"), { model: label, rates: { input: rates.input, cached: rates.cached, output: rates.output }, workload: values, useCase, estimate: r, verifiedAt: table.verifiedAt });
  }
);

server.registerTool(
  "compare_models",
  {
    title: "Compare AI API cost across models",
    description:
      "Run the same SaaS workload against every known OpenAI, Claude and Gemini model (or one provider) and rank them by monthly AI API cost, with cost per request, total monthly cost and gross margin. Token cost only: it does not judge output quality or latency.",
    inputSchema: { provider: z.enum(PROVIDERS).optional().describe("Only compare models from this provider."), ...workloadShape },
    annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  },
  async (args) => {
    const table = await getRateTable();
    const models = currentModels(table).filter((m) => !args.provider || m.provider === args.provider);
    const { values, useCase, fromPreset } = resolveWorkload(args);
    const ranked = models
      .map((model) => ({ model, result: calculateEstimate(values, model) }))
      .sort((a, b) => a.result.apiCost - b.result.apiCost);
    const rows = ranked.map(
      ({ model, result }, i) =>
        `| ${i + 1} | ${model.name} | ${model.provider} | ${money(result.apiCost)} | ${perRequest(result.apiCostPerRequest)} | ${money(result.totalCost)} | ${pct(result.grossMarginPct)} |`
    );
    const notes = models.filter((m) => m.note).map((m) => `- ${m.name}: ${m.note}`);
    const text = [
      `Workload: ${workloadLine(values)}`,
      "",
      "| # | Model | Provider | Monthly API cost | Per request | Total monthly cost | Gross margin |",
      "|---|---|---|---|---|---|---|",
      ...rows,
      "",
      "Token cost only; it does not reflect output quality, latency, context limits or provider features.",
      ...(fromPreset.length ? [`Taken from the "${useCase}" preset because you did not set them: ${fromPreset.join(", ")}.`] : []),
      rateFooter(table, notes.length ? ["Promotions:", ...notes] : []),
    ].join("\n");
    return textResult(text, {
      workload: values,
      useCase,
      verifiedAt: table.verifiedAt,
      ranking: ranked.map(({ model, result }) => ({ id: model.id, name: model.name, provider: model.provider, apiCost: result.apiCost, apiCostPerRequest: result.apiCostPerRequest, totalCost: result.totalCost, grossMarginPct: result.grossMarginPct })),
    });
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
console.error(`ai-api-cost-mcp ${version} running on stdio`);
// Load rates in the background so the first tool call does not wait for the network.
getRateTable()
  .then((table) => console.error(`ai-api-cost-mcp: rates verified ${table.verifiedAt} (${table.origin})`))
  .catch(() => {});
