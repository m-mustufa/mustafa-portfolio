// Tests for netlify/lib/devto.js with a mocked Forem API. Nothing is sent to DEV.
const assert = require("assert");
const { MAX_ATTEMPTS, buildArticle, describe, dueEntries, runDevto, scheduleClashes, siteDay, toMarkdown, validateEntry } = require("../netlify/lib/devto");
const { pickPublishAt, pickSeries, pickTags, planDevtoEntry } = require("./devto-plan");
const { unanswered } = require("./devto-comments");

const ORIGIN = "https://aisaaswithmustafa.com";
const KEY = "devto-secret-key-123";
const at = "2026-11-18T23:00:00+05:00"; // 18:00 UTC
const entry = { tags: ["javascript", "webdev"], publishAt: at };

assert.deepStrictEqual(validateEntry("/blog/a.html", entry), []);
assert.ok(validateEntry("/blog/a.html", { ...entry, tags: ["Java Script"] })[0].includes("tags"));
assert.ok(validateEntry("/blog/a.html", { ...entry, tags: ["a", "b", "c", "d", "e"] })[0].includes("tags"));
assert.ok(validateEntry("/blog/a.html", { tags: ["js"] })[0].includes("publishAt"), "a time is required");
assert.ok(validateEntry("/tools/x.html", entry)[0].includes("blog path"));
assert.deepStrictEqual(validateEntry("/blog/a.html", { ...entry, series: "MCP and AI Agents" }), []);
assert.ok(validateEntry("/blog/a.html", { ...entry, series: "" })[0].includes("series"));
assert.ok(validateEntry("/blog/a.html", { ...entry, series: "x".repeat(61) })[0].includes("series"));

// One DEV article a day: upcoming entries on the same Pakistan day clash.
assert.strictEqual(siteDay(new Date("2026-12-07T20:00:00Z")), "2026-12-08", "01:00 PKT is the next day");
const sameDay = { "/blog/a.html": { ...entry, publishAt: "2026-12-08T10:00:00+05:00" }, "/blog/b.html": { ...entry, publishAt: "2026-12-08T22:00:00+05:00" }, "/blog/c.html": { ...entry, publishAt: "2026-12-09T15:00:00+05:00" } };
assert.deepStrictEqual(scheduleClashes(sameDay, new Date("2026-12-01T00:00:00Z")), [{ day: "2026-12-08", keys: ["/blog/a.html", "/blog/b.html"] }]);
assert.deepStrictEqual(scheduleClashes(sameDay, new Date("2026-12-10T00:00:00Z")), [], "past entries never clash");

// Weekly comment check: only comments by others with no reply from the account.
const me = { name: "M", username: "aisaaswithmustafa" };
const tree = [
  { id_code: "a1", user: { name: "A", username: "a" }, body_html: "<p>Answered</p>", children: [{ id_code: "a2", user: me, body_html: "<p>Thanks</p>", children: [] }] },
  { id_code: "b1", user: { name: "B", username: "b" }, body_html: "<p>Open &amp; new</p>", children: [{ id_code: "b2", user: { name: "C", username: "c" }, body_html: "<p>Follow-up</p>", children: [] }] },
  { id_code: "s1", user: { name: "S", username: "spam" }, body_html: "<p>Promo</p>", children: [] },
];
const open = unanswered(tree, { title: "T", url: "https://dev.to/x" }, new Set(["s1"]));
assert.deepStrictEqual(open.map((c) => c.id), ["b1", "b2"]);
assert.strictEqual(open[0].body, "Open & new");
assert.strictEqual(open[1].replyTo, "Open & new");

// Planning the entry for a new post.
assert.deepStrictEqual(pickTags("Build an MCP Server in Node.js"), ["mcp", "node", "webdev"]);
assert.strictEqual(pickTags("Stripe Next.js React Node.js TypeScript SaaS").length, 4, "never more than 4 tags");
assert.strictEqual(pickSeries("Stripe Per-Seat Billing"), "SaaS Billing with Stripe");
assert.strictEqual(pickSeries("Offline-First React PWA"), "");
// 2 days later at 15:00 PKT; a taken day moves it to the next free one.
assert.strictEqual(pickPublishAt("2026-12-01T20:30:00.000Z", {}), "2026-12-04T15:00:00+05:00", "published Dec 2 PKT");
assert.strictEqual(pickPublishAt("2026-12-01T10:00:00.000Z", { "/blog/x.html": { publishAt: "2026-12-03T15:00:00+05:00" } }), "2026-12-04T15:00:00+05:00");
const newPost = { slug: "mcp-tools-guide", title: "MCP Tools Guide for Node.js", tags: ["MCP"], publishDateIso: "2026-12-01T10:00:00.000Z" };
assert.deepStrictEqual(planDevtoEntry(newPost, undefined, {}), { key: "/blog/mcp-tools-guide.html", entry: { tags: ["mcp", "node", "webdev"], publishAt: "2026-12-03T15:00:00+05:00", series: "MCP and AI Agents" } });
assert.ok(planDevtoEntry(newPost, false, {}).skipped.includes("false"));
assert.ok(planDevtoEntry({ ...newPost, title: "UAE PASS Login Guide", slug: "uae-pass-login" }, undefined, {}).skipped.includes("UAE"));
assert.deepStrictEqual(planDevtoEntry({ ...newPost, title: "UAE PASS Login Guide", slug: "uae-pass-login" }, { tags: ["node"] }, {}).entry.tags, ["node"], "a devto field overrides the UAE skip");
assert.ok(planDevtoEntry(newPost, undefined, { "/blog/mcp-tools-guide.html": entry }).skipped.includes("already"));
assert.throws(() => planDevtoEntry(newPost, { tags: ["Bad Tag"] }, {}), /invalid/);

const entries = { "/blog/a.html": entry, "/blog/b.html": { ...entry, publishAt: "2026-12-01T10:00:00Z" } };
assert.deepStrictEqual(dueEntries(entries, new Date("2026-11-18T17:59:00Z")), []);
assert.deepStrictEqual(dueEntries(entries, new Date("2026-11-18T18:00:00Z")).map((d) => d.key), ["/blog/a.html"]);
assert.deepStrictEqual(dueEntries(entries, new Date("2026-11-21T18:00:01Z")), [], "never more than 3 days late");

assert.strictEqual(
  toMarkdown('<figure><img src="https://x/y.jpg" alt="Alt"><figcaption>Cap</figcaption></figure><pre><code>a &lt; b</code></pre>'),
  "![Alt](https://x/y.jpg)\n\n*Cap*\n\n```\na < b\n```",
);

const pageHtml = `<html><head><title>Fallback</title>
<meta name="description" content="Desc &amp; more">
<meta property="og:title" content="Post &amp; Title">
</head><body>
<img src="images/a-hero.jpg" alt="Hero" width="1200" height="675" loading="eager" />
<!-- ARTICLE_CONTENT_START -->
<p>Read <a href="/tools/x.html">the tool</a>.</p>
<h2 class="scroll-mt-28" id="part">Part</h2>
<p><img src="images/b.jpg" alt="B" loading="lazy"></p>
<!-- ARTICLE_CONTENT_END --></body></html>`;
const article = buildArticle(pageHtml, `${ORIGIN}/blog/a.html`, entry);
assert.strictEqual(article.title, "Post & Title");
assert.strictEqual(article.description, "Desc & more");
assert.strictEqual(article.canonical_url, `${ORIGIN}/blog/a.html`);
assert.strictEqual(article.main_image, `${ORIGIN}/blog/images/a-hero.jpg`);
assert.strictEqual(article.tags, "javascript,webdev");
assert.strictEqual(article.published, true);
assert.ok(article.body_markdown.includes(`[the tool](${ORIGIN}/tools/x.html)`), "links are absolute");
assert.ok(article.body_markdown.includes("## Part"));
assert.ok(article.body_markdown.includes(`![B](${ORIGIN}/blog/images/b.jpg)`));
assert.strictEqual(article.series, undefined, "no series unless the entry has one");
assert.strictEqual(buildArticle(pageHtml, `${ORIGIN}/blog/a.html`, { ...entry, series: "MCP and AI Agents" }).series, "MCP and AI Agents");
assert.ok(article.body_markdown.trim().endsWith(`*I first published this on my blog: [Post & Title](${ORIGIN}/blog/a.html).*`));

function memoryStore() {
  const data = new Map();
  return {
    data,
    async getWithMetadata(key) {
      return data.has(key) ? { data: data.get(key) } : null;
    },
    async setJSON(key, value) {
      // Same rule as the real store: a key starting with "/" cannot be saved.
      if (key.startsWith("/")) throw new Error("Blob key must not start with forward slash (/).");
      data.set(key, value);
      return { modified: true };
    },
  };
}
function site(calls, { mine = [], create = () => ({ ok: true, status: 201, json: async () => ({ url: "https://dev.to/me/a-1" }), text: async () => "" }) } = {}) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    const ok = (body) => ({ ok: true, status: 200, json: async () => body, text: async () => (typeof body === "string" ? body : JSON.stringify(body)) });
    if (url.startsWith(`${ORIGIN}/social/devto.json`)) return ok(entries);
    if (url === `${ORIGIN}/blog/a.html`) return ok(pageHtml);
    if (url === "https://dev.to/api/articles/me/all?per_page=1000") return ok(mine);
    if (url === "https://dev.to/api/users/me") return ok({ username: "mustafa" });
    if (url === "https://dev.to/api/articles") return create();
    throw new Error(`Unexpected URL ${url}`);
  };
}
const due = new Date("2026-11-18T18:05:00Z");
const env = { DEVTO_AUTO_POST: "true", DEVTO_API_KEY: KEY };

(async () => {
  // Guard rails.
  assert.ok((await runDevto({ env: {}, fetchImpl: site([]), store: memoryStore(), now: due })).skipped.includes("DEVTO_AUTO_POST"));
  const early = await runDevto({ env, fetchImpl: site([]), store: memoryStore(), now: new Date("2026-11-18T17:00:00Z") });
  assert.strictEqual(early.skipped, "nothing is due");
  assert.strictEqual(early.next, `${ORIGIN}/blog/a.html at ${at}`);
  assert.ok((await runDevto({ env: { DEVTO_AUTO_POST: "true" }, fetchImpl: site([]), store: memoryStore(), now: due })).skipped.includes("DEVTO_API_KEY"));

  // Dry run: shows the article, posts nothing.
  const dryCalls = [];
  const dry = await runDevto({ env: { ...env, DEVTO_DRY_RUN: "true" }, fetchImpl: site(dryCalls), store: memoryStore(), now: due });
  assert.strictEqual(dry.dryRun, true);
  assert.strictEqual(dry.keyStatus, "key check: OK, connected as mustafa");
  assert.ok(!dryCalls.some((c) => c.url === "https://dev.to/api/articles"), "no article created in dry run");
  assert.ok(describe(dry).summary.startsWith("Dry run"));

  // Live: one POST with the canonical URL and the key header.
  const calls = [];
  const store = memoryStore();
  const live = await runDevto({ env, fetchImpl: site(calls), store, now: due });
  assert.deepStrictEqual(live.posted, { url: `${ORIGIN}/blog/a.html`, devUrl: "https://dev.to/me/a-1" });
  const post = calls.find((c) => c.url === "https://dev.to/api/articles");
  assert.strictEqual(post.options.headers["api-key"], KEY);
  assert.strictEqual(JSON.parse(post.options.body).article.canonical_url, `${ORIGIN}/blog/a.html`);
  assert.ok(describe(live).lines.includes("DEV post: https://dev.to/me/a-1"));

  // Already on DEV (found by canonical URL): never published twice.
  const againCalls = [];
  const again = await runDevto({ env, fetchImpl: site(againCalls, { mine: [{ canonical_url: `${ORIGIN}/blog/a.html`, url: "https://dev.to/me/a-1" }] }), store: memoryStore(), now: due });
  assert.strictEqual(again.skipped, "every due post was already handled");
  assert.ok(!againCalls.some((c) => c.url === "https://dev.to/api/articles"));

  // One article a day: a due post waits while the newest DEV article is under 20 hours old.
  const waitCalls = [];
  const wait = await runDevto({ env, fetchImpl: site(waitCalls, { mine: [{ canonical_url: `${ORIGIN}/blog/z.html`, url: "https://dev.to/me/z", published_at: "2026-11-18T08:00:00Z" }] }), store: memoryStore(), now: due });
  assert.ok(wait.skipped.startsWith("one DEV article a day"), wait.skipped);
  assert.ok(!waitCalls.some((c) => c.url === "https://dev.to/api/articles"), "nothing created while waiting");
  const later = await runDevto({ env, fetchImpl: site([], { mine: [{ canonical_url: `${ORIGIN}/blog/z.html`, published_at: "2026-11-17T20:00:00Z" }] }), store: memoryStore(), now: due });
  assert.ok(later.posted, "22 hours later it goes out");

  // Failures are retried up to the limit and never echo the key.
  const failStore = memoryStore();
  const reject = () => ({ ok: false, status: 422, json: async () => ({}), text: async () => `bad ${KEY}` });
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const failed = await runDevto({ env, fetchImpl: site([], { create: reject }), store: failStore, now: due });
    assert.ok(failed.failed.includes("HTTP 422"));
    assert.ok(!failed.failed.includes(KEY), "the key is never echoed");
    assert.strictEqual(failed.retry, attempt < MAX_ATTEMPTS);
  }
  const gaveUp = await runDevto({ env, fetchImpl: site([], { create: reject }), store: failStore, now: due });
  assert.strictEqual(gaveUp.skipped, "every due post was already handled");

  console.log("DEV cross-post tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
