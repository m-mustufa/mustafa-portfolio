#!/usr/bin/env node
// Live SEO health check for a deployed site (production by default).
// Suggested by readers of the Astro migration write-up on Indie Hackers.
//
// For every URL in the live sitemap it checks, as a browser and as Googlebot:
//   - HTTP 200, HTML, no "noindex" in the X-Robots-Tag header
//   - robots meta allows indexing, canonical points at the URL itself
// It then fetches every URL again 8 at a time (a crawler-like burst), checks
// that extensionless and folder aliases 301 to the canonical, that made-up
// URLs return a real 404, and that the CSS and JS the homepage loads exist.
//
// Usage: node scripts/live-check.js [--base https://aisaaswithmustafa.com]
//        node scripts/live-check.js --base https://<branch>--mustcode.netlify.app --preview
//   --preview expects noindex and compares canonical paths, not hosts.

const SITE = "https://aisaaswithmustafa.com";
const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i === -1 ? undefined : args[i + 1] && !args[i + 1].startsWith("--") ? args[i + 1] : true;
};
const BASE = String(opt("base") || SITE).replace(/\/$/, "");
const PREVIEW = Boolean(opt("preview"));
const BROWSER_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";
const GOOGLEBOT_UA = "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const problems = [];
const fail = (url, what) => problems.push(`${url}: ${what}`);
const toBase = (url) => url.replace(SITE, BASE);
const pathOf = (url) => new URL(url).pathname;

async function get(url, ua = BROWSER_UA, redirect = "follow") {
  const started = Date.now();
  const response = await fetch(url, { headers: { "User-Agent": ua }, redirect });
  const body = redirect === "follow" ? await response.text() : "";
  return { response, body, ms: Date.now() - started };
}

function checkPage(siteUrl, { response, body }, label) {
  const url = toBase(siteUrl);
  if (response.status !== 200) return fail(url, `${label}: HTTP ${response.status}`);
  if (!/text\/html/.test(response.headers.get("content-type") || "")) fail(url, `${label}: not HTML`);
  const xRobots = response.headers.get("x-robots-tag") || "";
  if (!PREVIEW && /noindex/i.test(xRobots)) fail(url, `${label}: X-Robots-Tag "${xRobots}"`);
  const robots = body.match(/<meta name="robots" content="([^"]*)"/i)?.[1] || "";
  if (PREVIEW ? !/noindex/i.test(robots) : /noindex/i.test(robots)) fail(url, `${label}: robots meta "${robots}"`);
  const canonical = body.match(/<link rel="canonical" href="([^"]+)"/i)?.[1];
  if (!canonical) return fail(url, `${label}: no canonical`);
  if (PREVIEW ? pathOf(canonical) !== pathOf(siteUrl) : canonical !== siteUrl) fail(url, `${label}: canonical is ${canonical}`);
  return canonical;
}

function aliasesFor(siteUrl) {
  const p = pathOf(siteUrl);
  if (p === "/") return ["/index.html", "/index"];
  if (p.endsWith("/index.html")) {
    const dir = p.slice(0, -"index.html".length);
    return [p.replace(/\.html$/, ""), dir, dir.replace(/\/$/, "")];
  }
  if (p.endsWith("/")) return [`${p}index.html`, `${p}index`];
  return [p.replace(/\.html$/, "")];
}

async function main() {
  const sitemap = await (await fetch(`${BASE}/sitemap.xml`)).text();
  const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
  if (!urls.length) throw new Error("sitemap.xml has no URLs");
  console.log(`Checking ${urls.length} sitemap URLs on ${BASE}${PREVIEW ? " (preview)" : ""}`);

  // 1. One at a time, as a browser and as Googlebot.
  let slowest = { ms: 0 };
  for (const siteUrl of urls) {
    const asBrowser = await get(toBase(siteUrl));
    checkPage(siteUrl, asBrowser, "browser");
    if (asBrowser.ms > slowest.ms) slowest = { ms: asBrowser.ms, url: siteUrl };
    const asBot = await get(toBase(siteUrl), GOOGLEBOT_UA);
    checkPage(siteUrl, asBot, "Googlebot");
  }

  // 2. A burst of 8 parallel requests at a time.
  for (let i = 0; i < urls.length; i += 8) {
    const batch = urls.slice(i, i + 8);
    const results = await Promise.all(batch.map((u) => get(toBase(u)).catch((e) => ({ error: e }))));
    results.forEach((r, j) => {
      if (r.error) fail(toBase(batch[j]), `parallel: ${r.error.message}`);
      else if (r.response.status !== 200) fail(toBase(batch[j]), `parallel: HTTP ${r.response.status}`);
    });
  }

  // 3. Aliases must 301 to the canonical (a slash-only variant may also be 200).
  let aliasCount = 0;
  for (const siteUrl of urls) {
    const target = pathOf(siteUrl);
    for (const alias of aliasesFor(siteUrl)) {
      if (alias === target) continue;
      aliasCount += 1;
      const { response } = await get(`${BASE}${alias}`, BROWSER_UA, "manual");
      const location = response.headers.get("location") || "";
      const slashOnly = alias.replace(/\/$/, "") === target.replace(/\/$/, "");
      if (response.status === 301 && pathOf(new URL(location, BASE).href) === target) continue;
      if (slashOnly && response.status === 200) continue;
      fail(`${BASE}${alias}`, `expected 301 to ${target}, got ${response.status} ${location}`);
    }
  }

  // 4. Made-up URLs must be real 404s, not soft 404s.
  const stamp = Date.now();
  for (const p of [`/no-such-page-${stamp}`, `/blog/no-such-post-${stamp}.html`, `/tools/no-such-tool-${stamp}`]) {
    const { response } = await get(`${BASE}${p}`);
    if (response.status !== 404) fail(`${BASE}${p}`, `expected 404, got ${response.status}`);
  }

  // 5. CSS and JS referenced by the homepage must load.
  const home = (await get(`${BASE}/`)).body;
  const assets = [...new Set([...home.matchAll(/(?:href|src)="(\/?assets\/(?:css|js)\/[^"]+)"/g)].map((m) => m[1]))];
  for (const asset of assets) {
    const { response } = await get(new URL(asset, `${BASE}/`).href);
    if (response.status !== 200) fail(asset, `asset HTTP ${response.status}`);
  }

  console.log(`Aliases checked: ${aliasCount}. Assets checked: ${assets.length}. Slowest page: ${slowest.ms} ms (${slowest.url}).`);
  if (problems.length) {
    console.log(`\nLive check FAILED with ${problems.length} problem(s):`);
    for (const p of problems) console.log(`  - ${p}`);
    process.exitCode = 1;
  } else {
    console.log("Live check OK: every URL, alias, 404 and asset behaves as expected.");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
