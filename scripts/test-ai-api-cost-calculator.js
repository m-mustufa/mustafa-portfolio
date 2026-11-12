#!/usr/bin/env node
const assert = require("assert");
const { MODELS, RATE_TABLE, calculateEstimate, compareModels, formatMaskedNumber, withCurrentRates } = require("../assets/js/ai-api-cost-calculator.js");

// Promotional rates switch to the standard rate the day after they end.
const carbon = RATE_TABLE.find((model) => model.id === "gemini-4-carbon");
const promo = withCurrentRates(carbon, new Date("2026-11-30T23:00:00Z"));
assert.deepStrictEqual([promo.input, promo.cached, promo.output], [2, 0.1, 10]);
assert.strictEqual(promo.name, "Gemini 4 Carbon (promo through Nov 30, 2026)");
assert.strictEqual(promo.note, "Promotional rate ends Nov 30, 2026. After that: $4.00 input, $0.20 cached, $20.00 output per 1M tokens.");
const standard = withCurrentRates(carbon, new Date("2026-12-01T00:30:00Z"));
assert.deepStrictEqual([standard.input, standard.cached, standard.output, standard.name], [4, 0.2, 20, "Gemini 4 Carbon"]);
assert.strictEqual(standard.note, undefined);
assert.strictEqual(standard.promo, undefined);
const flashAfter = withCurrentRates(RATE_TABLE.find((model) => model.id === "gemini-3.8-flash-promo"), new Date("2027-01-01T12:00:00Z"));
assert.deepStrictEqual([flashAfter.input, flashAfter.cached, flashAfter.output], [1.5, 0.15, 7.5]);
assert.ok(!MODELS.some((model) => model.name === "Gemini 3.5 Flash"), "Gemini 3.5 Flash is not on Google's price list");
assert.ok(MODELS.every((model) => !model.promo), "the page only sees current rates");

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
