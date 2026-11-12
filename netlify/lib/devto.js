// Cross-posts selected blog posts to DEV Community (dev.to) through the Forem
// API, with canonical_url pointing back to the original post, so search engines
// keep crediting this site. Runs from netlify/functions/devto-scheduled.mjs.
//
// Only posts listed in social/devto.json are cross-posted (opt-in), each at its
// publishAt time and only within SCHEDULE_WINDOW_MS of it. Before creating an
// article it lists the account's articles and skips any whose canonical_url is
// already this post, so a post is never published twice. A Netlify Blobs store
// limits retries after a failure.
//
// Netlify environment variables: DEVTO_API_KEY (secret, needs the Functions
// scope), DEVTO_AUTO_POST=true (master switch), DEVTO_DRY_RUN=true (log only).
// Netlify's function bundler only ships packages that the function file itself
// imports, so devto-scheduled.mjs imports turndown and passes it in as
// `markdown`. Local scripts and tests fall back to require().
function loadMarkdownLib() {
  return { TurndownService: require("turndown"), gfm: require("turndown-plugin-gfm").gfm };
}
const { absolutizeHtml, cleanArticleHtml } = require("../../scripts/blog-feed");
const { extractArticleContent } = require("../../scripts/blog-seo");

const SITE_ORIGIN = "https://aisaaswithmustafa.com";
const API_BASE = "https://dev.to/api";
const DEVTO_FILE = "social/devto.json";
const DEVTO_STORE = "devto-syndicated";
const SCHEDULE_WINDOW_MS = 3 * 24 * 60 * 60 * 1000;
const MAX_ATTEMPTS = 3;

// --- Entries --------------------------------------------------------------------
// social/devto.json:
// { "/blog/<slug>.html": {
//     "tags": ["javascript", "webdev"],            // 1 to 4, lowercase letters and digits
//     "publishAt": "2026-11-18T23:00:00+05:00"     // ISO time with a timezone
// } }
function parsePublishAt(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?(Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function validateEntry(key, entry) {
  const problems = [];
  if (!/^\/blog\/[a-z0-9-]+\.html$/.test(key)) problems.push("key must be a blog path such as /blog/my-post.html");
  if (!entry || typeof entry !== "object") return [...problems, "entry is missing"];
  if (!Array.isArray(entry.tags) || entry.tags.length < 1 || entry.tags.length > 4 || !entry.tags.every((t) => /^[a-z0-9]+$/.test(String(t)))) {
    problems.push("tags must be 1 to 4 lowercase words with letters and digits only, such as javascript or webdev");
  }
  if (!parsePublishAt(entry.publishAt)) problems.push("publishAt must be a date and time with a timezone, such as 2026-11-18T23:00:00+05:00");
  return problems;
}

function dueEntries(entries, now = new Date()) {
  return Object.entries(entries)
    .map(([key, entry]) => ({ key, entry, at: parsePublishAt(entry && entry.publishAt) }))
    .filter(({ at }) => at && at <= now && now - at < SCHEDULE_WINDOW_MS)
    .sort((a, b) => a.at - b.at);
}

function nextEntry(entries, now = new Date()) {
  const upcoming = Object.entries(entries)
    .map(([key, entry]) => ({ key, at: parsePublishAt(entry && entry.publishAt), publishAt: entry && entry.publishAt }))
    .filter(({ at }) => at && at > now)
    .sort((a, b) => a.at - b.at);
  return upcoming.length ? `${SITE_ORIGIN}${upcoming[0].key} at ${upcoming[0].publishAt}` : "";
}

// --- Article --------------------------------------------------------------------
function metaContent(html, attr, name) {
  const match = String(html).match(new RegExp(`<meta[^>]+${attr}="${name}"[^>]*content="([^"]*)"`, "i"));
  return match ? match[1].replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">") : "";
}

function heroImage(html, pageUrl) {
  // The hero photo is the eagerly loaded image above the article.
  const match = String(html).match(/<img[^>]+src="((?:\.\.\/)?(?:blog\/)?images\/[^"]+)"[^>]*loading="eager"/);
  return match ? new URL(match[1], pageUrl).href : "";
}

function toMarkdown(articleHtml, markdown = loadMarkdownLib()) {
  const { TurndownService, gfm } = markdown;
  const turndown = new TurndownService({ headingStyle: "atx", codeBlockStyle: "fenced", bulletListMarker: "-", emDelimiter: "*" });
  turndown.use(gfm);
  turndown.addRule("figcaption", {
    filter: "figcaption",
    replacement: (content) => `\n\n*${content.trim()}*\n\n`,
  });
  return turndown.turndown(articleHtml).replace(/\n{3,}/g, "\n\n").trim();
}

// Builds the Forem article from the published page, so Dev.to gets exactly
// what readers see on the site.
function buildArticle(pageHtml, pageUrl, entry, markdown) {
  const html = String(pageHtml).replace(/\r\n/g, "\n");
  const article = absolutizeHtml(cleanArticleHtml(extractArticleContent(html)), pageUrl);
  const title = metaContent(html, "property", "og:title") || (html.match(/<title>([^<]*)<\/title>/) || [])[1] || "";
  const footer = `*I first published this on my blog: [${title}](${pageUrl}).*`;
  return {
    title,
    body_markdown: `${toMarkdown(article, markdown)}\n\n---\n\n${footer}\n`,
    published: true,
    canonical_url: pageUrl,
    description: metaContent(html, "name", "description").slice(0, 300),
    tags: entry.tags.join(","),
    main_image: heroImage(html, pageUrl),
  };
}

// --- Forem API --------------------------------------------------------------------
function headers(key, extra = {}) {
  return { "api-key": key, Accept: "application/vnd.forem.api-v1+json", "User-Agent": "aisaaswithmustafa-syndication", ...extra };
}

async function failure(response, what, key) {
  const body = (await response.text().catch(() => "")).split(key).join("***").slice(0, 300);
  const hint = response.status === 401 ? " The DEVTO_API_KEY is wrong or revoked; create a new key in DEV Settings, Extensions." : "";
  const error = new Error(`${what} failed with HTTP ${response.status}: ${body}${hint}`);
  error.httpStatus = response.status;
  return error;
}

async function existingCanonicals(key, fetchImpl) {
  const response = await fetchImpl(`${API_BASE}/articles/me/all?per_page=1000`, { headers: headers(key) });
  if (!response.ok) throw await failure(response, "Listing your DEV articles", key);
  const articles = await response.json();
  return new Map(articles.filter((a) => a.canonical_url).map((a) => [a.canonical_url, a.url || ""]));
}

async function checkKey(key, fetchImpl) {
  if (!key) return "key check: DEVTO_API_KEY is not available to functions";
  try {
    const response = await fetchImpl(`${API_BASE}/users/me`, { headers: headers(key) });
    if (!response.ok) return `key check: ${(await failure(response, "reading your DEV profile", key)).message}`;
    const user = await response.json();
    return `key check: OK, connected as ${user.username || "your DEV account"}`;
  } catch (error) {
    return `key check failed: ${String(error.message).split(key).join("***")}`;
  }
}

function settingsLine(env) {
  const mode = env.DEVTO_DRY_RUN === "true" ? "dry run" : "live";
  const auto = env.DEVTO_AUTO_POST === "true" ? "on" : "off";
  const key = env.DEVTO_API_KEY ? "available" : "not available to functions";
  return `Settings: auto post ${auto}, ${mode}, key ${key}.`;
}

async function fetchLive(fetchImpl, url, what) {
  const response = await fetchImpl(url, { headers: { "Cache-Control": "no-cache" } });
  if (!response.ok) throw new Error(`Reading ${what} from the live site failed with HTTP ${response.status}`);
  return response;
}

// Shares at most one due post per run. `store` is a Netlify Blobs store (or a
// fake with getWithMetadata/setJSON) that counts attempts per post.
async function runDevto({ env = process.env, fetchImpl = fetch, store, now = new Date(), markdown } = {}) {
  const info = { settings: settingsLine(env) };
  if (env.DEVTO_AUTO_POST !== "true") return { skipped: "DEVTO_AUTO_POST is not set to true", ...info };

  const entries = await (await fetchLive(fetchImpl, `${SITE_ORIGIN}/${DEVTO_FILE}?t=${now.getTime()}`, DEVTO_FILE)).json();
  info.next = nextEntry(entries, now);
  const due = dueEntries(entries, now).filter(({ key, entry }) => !validateEntry(key, entry).length);
  if (!due.length) return { skipped: "nothing is due", ...info };

  const key = env.DEVTO_API_KEY;
  const dryRun = env.DEVTO_DRY_RUN === "true";
  if (!key && !dryRun) return { skipped: "DEVTO_API_KEY is not available to functions (check its scopes in Netlify)", ...info };

  const published = key ? await existingCanonicals(key, fetchImpl) : new Map();
  info.handled = [];
  for (const { key: path, entry } of due) {
    const url = `${SITE_ORIGIN}${path}`;
    if (published.has(url)) {
      info.handled.push(`${url}: already on DEV${published.get(url) ? ` (${published.get(url)})` : ""}`);
      if (store) await store.setJSON(path, { status: "posted", url: published.get(url) || "" });
      continue;
    }
    const existing = store ? await store.getWithMetadata(path, { type: "json" }) : null;
    const state = existing && existing.data;
    if (state && state.status === "failed" && state.attempts >= MAX_ATTEMPTS) {
      info.handled.push(`${url}: gave up after ${state.attempts} attempts (${state.error})`);
      continue;
    }

    const article = buildArticle(await (await fetchLive(fetchImpl, url, "the page")).text(), url, entry, markdown);
    if (dryRun) return { dryRun: true, url, article, keyStatus: await checkKey(key, fetchImpl), ...info };

    const attempts = ((state && state.attempts) || 0) + 1;
    try {
      const response = await fetchImpl(`${API_BASE}/articles`, {
        method: "POST",
        headers: headers(key, { "Content-Type": "application/json" }),
        body: JSON.stringify({ article }),
      });
      if (response.status !== 201) throw await failure(response, "Creating the DEV article", key);
      const created = await response.json().catch(() => ({}));
      if (store) await store.setJSON(path, { status: "posted", attempts, url: created.url || "", at: now.toISOString() });
      return { posted: { url, devUrl: created.url || "" }, ...info };
    } catch (error) {
      const message = String(error.message || error).split(key).join("***").split(/\r?\n/)[0];
      // A network error may still have created the article; the canonical
      // check on the next run finds it, so retrying is safe either way.
      if (store) await store.setJSON(path, { status: "failed", attempts, error: message, at: now.toISOString() });
      return { failed: message, url, retry: attempts < MAX_ATTEMPTS, ...info };
    }
  }
  return { skipped: "every due post was already handled", ...info };
}

function describe(result) {
  const lines = [];
  let summary;
  if (result.skipped) summary = `Skipped: ${result.skipped}.`;
  else if (result.dryRun) {
    summary = `Dry run: would publish ${result.url} on DEV with tags ${result.article.tags}. ${result.keyStatus[0].toUpperCase()}${result.keyStatus.slice(1)}.`;
    lines.push(`Title: ${result.article.title}`, `Cover: ${result.article.main_image}`, `Markdown: ${result.article.body_markdown.length} characters`);
  } else if (result.posted) {
    summary = `Published ${result.posted.url} on DEV.`;
    if (result.posted.devUrl) lines.push(`DEV post: ${result.posted.devUrl}`);
  } else {
    summary = `Not published ${result.url}: ${result.failed}.`;
    lines.push(result.retry ? "It will be retried on the next run." : `Gave up after ${MAX_ATTEMPTS} attempts.`);
  }
  if (result.handled && result.handled.length) lines.push("Already handled:", ...result.handled);
  if (result.next) lines.push(`Next scheduled: ${result.next}`);
  if (result.settings) lines.push(result.settings);
  return { summary, lines };
}

module.exports = {
  DEVTO_FILE,
  DEVTO_STORE,
  MAX_ATTEMPTS,
  buildArticle,
  describe,
  dueEntries,
  runDevto,
  toMarkdown,
  validateEntry,
};
