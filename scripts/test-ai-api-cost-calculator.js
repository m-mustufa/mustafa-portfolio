#!/usr/bin/env node
const assert = require("assert");
const { MODELS, calculateEstimate, compareModels, formatMaskedNumber } = require("../assets/js/ai-api-cost-calculator.js");

const estimate = calculateEstimate({
  users: "1,000", requestsPerUser: 30, inputTokens: "1,200", outputTokens: 400,
  cachePct: 20, pricePerUser: 19, variableCostPerUser: 1.25, fixedCost: 300,
  extraCostPerRequest: 0
}, { input: 2, cached: 0.1, output: 10 });

assert.strictEqual(estimate.monthlyRequests, 30000);
assert.strictEqual(estimate.uncachedInputTokens, 28800000);
assert.strictEqual(estimate.cachedInputTokens, 7200000);
assert.strictEqual(estimate.totalOutputTokens, 12000000);
assert.strictEqual(estimate.apiCost, 178.32);
assert.strictEqual(estimate.totalCost, 1728.32);
assert.strictEqual(estimate.revenue, 19000);
assert.ok(Math.abs(estimate.grossMarginPct - 90.9035789474) < 0.0001);
assert.strictEqual(estimate.breakEvenUsers, 18);
assert.strictEqual(formatMaskedNumber("1000000", 0), "1,000,000");
assert.strictEqual(formatMaskedNumber("1234.567", 2), "1,234.56");

const comparison = compareModels({ users: 1, requestsPerUser: 1, inputTokens: 1000000, outputTokens: 0, cachePct: 0 }, MODELS.slice(0, 3));
assert.strictEqual(comparison[0].model.id, "gpt-6-luna");
assert.ok(comparison[0].result.apiCost <= comparison[1].result.apiCost);

const zero = calculateEstimate({}, { input: 1, cached: 1, output: 1 });
assert.strictEqual(zero.apiCost, 0);
assert.strictEqual(zero.grossMarginPct, null);
assert.strictEqual(zero.totalCostPerUser, null);
console.log("AI API Cost Calculator tests passed.");
