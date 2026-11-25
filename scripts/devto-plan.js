// Plans the social/devto.json entry for a newly published blog post, so every
// suitable technical post reaches DEV Community about two days after the blog
// (Google sees the original first). scripts/new-post.js calls this; the entry
// lands in the same draft commit, so it is reviewed with the post preview.
//
// A draft can steer it with an optional "devto" field:
//   "devto": false                                      never cross-post this post
//   "devto": { "tags": ["node", "api"], "series": "..." } use these tags / series
// Without it, UAE-only posts are skipped (DEV readers are global developers)
// and the tags and series are picked from the post's title, slug and tags.
const fs = require("fs");
const path = require("path");
const { DEVTO_FILE, SITE_TIMEZONE_OFFSET, siteDay, validateEntry } = require("../netlify/lib/devto");

const ROOT = path.join(__dirname, "..");
const DELAY_DAYS = 2;
const PUBLISH_TIME = "15:00:00";
const REGIONAL = /\b(uae|dubai|abu[ -]?dhabi|emirates|sharjah)\b/i;

// First match wins for each tag; at most four tags, "webdev" fills the rest.
const TAG_RULES = [
  [/\bmcp\b|model context protocol/i, "mcp"],
  [/\bagents?\b|agentic/i, "agents"],
  [/\bstripe\b/i, "stripe"],
  [/\bsupabase\b/i, "supabase"],
  [/firebase|firestore/i, "firebase"],
  [/next\.?js/i, "nextjs"],
  [/\bangular/i, "angular"],
  [/\breact\b/i, "react"],
  [/node\.?js|\bnode\b/i, "node"],
  [/typescript/i, "typescript"],
  [/postgres/i, "postgres"],
  [/shopify/i, "shopify"],
  [/openai|gemini|groq|claude|\bllm\b|\bai\b/i, "ai"],
  [/security|fraud|\brls\b|csp/i, "security"],
  [/\bsaas\b/i, "saas"],
  [/\bapis?\b/i, "api"],
  [/javascript/i, "javascript"],
];

// Related posts are grouped in a DEV series. A post joins the first series
// whose rule matches; the name must stay identical across posts.
const SERIES_RULES = [
  [/\bmcp\b|\bagents?\b|agentic/i, "MCP and AI Agents"],
  [/\bstripe\b|billing/i, "SaaS Billing with Stripe"],
];

function pickTags(text) {
  const tags = [];
  for (const [pattern, tag] of TAG_RULES) {
    if (tags.length === 4) break;
    if (pattern.test(text) && !tags.includes(tag)) tags.push(tag);
  }
  if (tags.length < 4 && !tags.includes("webdev")) tags.push("webdev");
  return tags;
}

function pickSeries(text) {
  const match = SERIES_RULES.find(([pattern]) => pattern.test(text));
  return match ? match[1] : "";
}

// Blog date + DELAY_DAYS at 15:00 Pakistan time, moved to the next free day if
// another upcoming entry already has that day (DEV gets one article a day).
function pickPublishAt(publishDateIso, entries) {
  const taken = new Set(
    Object.values(entries)
      .map((entry) => new Date(entry && entry.publishAt))
      .filter((date) => !Number.isNaN(date.getTime()))
      .map(siteDay),
  );
  const start = new Date(`${siteDay(new Date(publishDateIso))}T12:00:00Z`);
  for (let offset = DELAY_DAYS; offset < DELAY_DAYS + 60; offset += 1) {
    const day = new Date(start.getTime() + offset * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    if (!taken.has(day)) return `${day}T${PUBLISH_TIME}${SITE_TIMEZONE_OFFSET}`;
  }
  throw new Error("No free DEV day in the next 60 days");
}

// Returns { key, entry } to add, or { skipped: reason }.
function planDevtoEntry(post, draftDevto, entries) {
  const key = `/blog/${post.slug}.html`;
  if (draftDevto === false) return { skipped: "the draft sets devto to false" };
  if (entries[key]) return { skipped: `${key} already has a DEV entry` };
  const custom = draftDevto && typeof draftDevto === "object" ? draftDevto : null;
  const text = [post.title, post.slug.replace(/-/g, " "), ...(post.tags || [])].join(" ");
  if (!custom && REGIONAL.test(`${post.title} ${post.slug.replace(/-/g, " ")}`)) {
    return { skipped: "UAE-focused post (add a devto field to the draft to cross-post it anyway)" };
  }
  const entry = {
    tags: custom && Array.isArray(custom.tags) ? custom.tags : pickTags(text),
    publishAt: (custom && custom.publishAt) || pickPublishAt(post.publishDateIso, entries),
  };
  const series = custom && custom.series !== undefined ? custom.series : pickSeries(text);
  if (series) entry.series = series;
  const problems = validateEntry(key, entry);
  if (problems.length) throw new Error(`DEV entry for ${key} is invalid: ${problems.join("; ")}`);
  return { key, entry };
}

// Adds the planned entry to social/devto.json and reports what happened.
function addDevtoEntry(post, draftDevto, file = path.join(ROOT, DEVTO_FILE)) {
  const entries = JSON.parse(fs.readFileSync(file, "utf8"));
  const plan = planDevtoEntry(post, draftDevto, entries);
  if (plan.skipped) return `DEV: not scheduled (${plan.skipped}).`;
  entries[plan.key] = plan.entry;
  fs.writeFileSync(file, `${JSON.stringify(entries, null, 2)}\n`);
  return `DEV: scheduled ${plan.key} for ${plan.entry.publishAt}, tags ${plan.entry.tags.join(", ")}${plan.entry.series ? `, series "${plan.entry.series}"` : ""}. Check it with the preview before approving.`;
}

module.exports = { addDevtoEntry, pickPublishAt, pickSeries, pickTags, planDevtoEntry };
