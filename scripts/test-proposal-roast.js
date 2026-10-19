#!/usr/bin/env node

const assert = require("assert");
const { analyzeProposal, countWords, extractKeywords } = require("../assets/js/proposal-roast.js");

const jobPost = "We need a Next.js developer to finish a subscription SaaS dashboard. The work includes Stripe webhooks, Supabase row level security, an admin view and deployment checks. You should have production experience with TypeScript, payment idempotency and multi-tenant permissions. Please explain a similar project and how you would reduce launch risk.";

const strongProposal = "Your launch risk is mainly in the Stripe and tenant-permission boundaries. I recently implemented a multi-tenant SaaS billing flow with Next.js, TypeScript and verified Stripe webhooks, including idempotent processing and reconciliation checks.\n\nI would first review the current subscription states and Supabase RLS policies, then finish the admin workflow behind explicit role checks. After that I would test retries, duplicate events and failed payments before deployment.\n\nIs the Stripe webhook endpoint already receiving production events, or should the first milestone include the full payment-event setup?";

const weakProposal = "Dear hiring manager, I hope you are doing well. I am writing to say I am an expert and the perfect fit. I can do this job with 100% satisfaction. Please give me a chance. Thank you.";

const strong = analyzeProposal(jobPost, strongProposal);
const weak = analyzeProposal(jobPost, weakProposal);

assert.ok(strong.score >= 70, `Expected the tailored proposal to score at least 70, received ${strong.score}`);
assert.ok(weak.score < strong.score, "Expected the generic proposal to score below the tailored proposal");
assert.ok(weak.cliches.length >= 4, "Expected the generic proposal to trigger multiple cliché warnings");
assert.ok(strong.matchedKeywords.includes("stripe"), "Expected Stripe to count as a relevant matched term");
assert.ok(strong.hook.includes("Your brief centers on"), "Expected a deterministic, non-fabricated opening direction");
assert.strictEqual(
  Object.values(strong.categories).reduce((total, value) => total + value, 0),
  strong.score,
  "Category scores must add up to the overall score"
);
assert.strictEqual(countWords("one two three"), 3, "Word counting should be deterministic");
assert.ok(extractKeywords(jobPost, 10).length > 0, "Keyword extraction should return useful job terms");

console.log(`Proposal Roast tests passed. Tailored=${strong.score}, generic=${weak.score}.`);
