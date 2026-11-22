// End-to-end test: starts the server over stdio with a real MCP client, calls
// every tool and checks the numbers against the calculator module directly.
// Usage: npm test            (offline, bundled rates)
//        LIVE=1 npm test     (also lets the server fetch the live rates file)
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const calc = createRequire(import.meta.url)("../src/calculator.cjs");

const transport = new StdioClientTransport({
  command: process.execPath,
  args: [path.join(here, "..", "src", "index.js")],
  env: { ...process.env, AI_API_COST_MCP_OFFLINE: process.env.LIVE === "1" ? "0" : "1" },
  stderr: "pipe",
});
const client = new Client({ name: "smoke-test", version: "1.0.0" });
await client.connect(transport);

const { tools } = await client.listTools();
assert.deepEqual(tools.map((t) => t.name).sort(), ["compare_models", "estimate_cost", "list_models"]);
console.log(`tools: ${tools.map((t) => t.name).join(", ")}`);

// list_models
const list = await client.callTool({ name: "list_models", arguments: { provider: "Anthropic" } });
assert.ok(!list.isError);
assert.ok(list.structuredContent.models.length >= 1);
assert.ok(list.structuredContent.models.every((m) => m.provider === "Anthropic"));
console.log(`list_models: ${list.structuredContent.models.length} Anthropic models, rates from ${list.structuredContent.origin}`);

// estimate_cost must equal the calculator for the same inputs (chat preset + one override)
const est = await client.callTool({ name: "estimate_cost", arguments: { model: "claude sonnet 5.5", users: 2500 } });
assert.ok(!est.isError, est.content?.[0]?.text);
const model = calc.MODELS.find((m) => m.id === "claude-sonnet-5.5");
const expected = calc.calculateEstimate({ ...calc.PRESETS.chat, users: 2500, extraCostPerRequest: 0 }, model);
assert.equal(est.structuredContent.estimate.apiCost.toFixed(6), expected.apiCost.toFixed(6));
assert.equal(est.structuredContent.estimate.grossMarginPct.toFixed(6), expected.grossMarginPct.toFixed(6));
console.log(`estimate_cost: Claude Sonnet 5.5, 2,500 users -> API $${expected.apiCost.toFixed(2)}/month (matches calculator)`);

// custom rates
const custom = await client.callTool({
  name: "estimate_cost",
  arguments: { custom_rates: { input: 1, cached: 0.1, output: 4 }, use_case: "documents" },
});
assert.ok(!custom.isError);
const expectedCustom = calc.calculateEstimate({ ...calc.PRESETS.documents, extraCostPerRequest: 0 }, { input: 1, cached: 0.1, output: 4 });
assert.equal(custom.structuredContent.estimate.apiCost.toFixed(6), expectedCustom.apiCost.toFixed(6));
console.log(`estimate_cost (custom rates, documents preset): $${expectedCustom.apiCost.toFixed(2)}/month`);

// unknown model is a tool error, not a crash
const unknown = await client.callTool({ name: "estimate_cost", arguments: { model: "no-such-model" } });
assert.equal(unknown.isError, true);
console.log("estimate_cost: unknown model returns a clear tool error");

// compare_models is sorted by API cost and covers every model
const cmp = await client.callTool({ name: "compare_models", arguments: { use_case: "support", price_per_user: 49 } });
assert.ok(!cmp.isError);
const ranking = cmp.structuredContent.ranking;
assert.equal(ranking.length, calc.MODELS.length);
for (let i = 1; i < ranking.length; i += 1) assert.ok(ranking[i - 1].apiCost <= ranking[i].apiCost);
console.log(`compare_models: ${ranking.length} models ranked; cheapest ${ranking[0].name}, most expensive ${ranking.at(-1).name}`);

console.log("\n--- sample estimate_cost output ---\n" + est.content[0].text);
await client.close();
console.log("\nSmoke test passed.");
