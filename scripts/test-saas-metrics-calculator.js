#!/usr/bin/env node

const assert = require("assert");
const { calculateMetrics } = require("../assets/js/saas-metrics-calculator.js");

function closeTo(actual, expected, tolerance = 0.001) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `Expected ${actual} to be close to ${expected}`);
}

const sample = calculateMetrics({
  mrr: 24000,
  customers: 120,
  grossMarginPct: 82,
  customerChurnPct: 2.5,
  newMrr: 4200,
  expansionMrr: 1800,
  contractionMrr: 500,
  churnedMrr: 1200,
  salesMarketingSpend: 18000,
  newCustomers: 18
});

assert.strictEqual(sample.arr, 288000);
assert.strictEqual(sample.arpa, 200);
assert.strictEqual(sample.netNewMrr, 4300);
closeTo(sample.mrrGrowthPct, 17.9166667);
closeTo(sample.nrrPct, 100.4166667);
assert.strictEqual(sample.cac, 1000);
assert.strictEqual(sample.ltv, 6560);
closeTo(sample.cacPaybackMonths, 6.0975609);
closeTo(sample.ltvToCac, 6.56);
assert.strictEqual(sample.projectedMrr12, 75600);

const guarded = calculateMetrics({
  mrr: 0,
  customers: 0,
  grossMarginPct: 80,
  customerChurnPct: 0,
  salesMarketingSpend: 1000,
  newCustomers: 0
});

assert.strictEqual(guarded.arpa, null);
assert.strictEqual(guarded.mrrGrowthPct, null);
assert.strictEqual(guarded.nrrPct, null);
assert.strictEqual(guarded.cac, null);
assert.strictEqual(guarded.ltv, null);
assert.strictEqual(guarded.cacPaybackMonths, null);
assert.strictEqual(guarded.ltvToCac, null);

const sanitized = calculateMetrics({ mrr: -100, customers: "not-a-number", grossMarginPct: 150 });
assert.strictEqual(sanitized.input.mrr, 0);
assert.strictEqual(sanitized.input.customers, 0);
assert.strictEqual(sanitized.input.grossMarginPct, 100);

console.log("SaaS Metrics Calculator tests passed.");
