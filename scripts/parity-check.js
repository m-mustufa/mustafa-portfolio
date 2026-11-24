#!/usr/bin/env node
// Compares what is published now with the Astro build in dist/, page by page.
// Anything that affects SEO must match exactly; only the shared header, footer
// and asset ?v= hashes may differ.
//
// Usage: npm run build && node scripts/parity-check.js [live | <site URL> | <git ref>]
//   live (default): fetch every page from production and compare.
//   <site URL>:     same against another deploy, e.g. a branch preview.
//   <git ref>:      compare with the committed HTML of a pre-Astro ref (the
//                   migration itself was checked against 0c34889). After the
//                   migration, refs hold marker sources, so use live instead.

const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { parse } = require("node-html-parser");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const SITE = "https://aisaaswithmustafa.com";
const ARG = process.argv[2] || "live";
const LIVE_BASE = ARG === "live" ? SITE : /^https?:\/\//.test(ARG) ? ARG.replace(/\/$/, "") : null;
const REF = LIVE_BASE ? "HEAD" : ARG;

const git = (args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8", maxBuffer: 100 * 1024 * 1024 });
const liveCache = new Map();
const show = (file) => {
  if (LIVE_BASE) return liveCache.get(file) ?? null;
  try {
    return git(["show", `${REF}:${file}`]);
  } catch {
    return null;
  }
};

const listDist = (dir = DIST, out = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listDist(full, out);
    else out.push(path.relative(DIST, full).replace(/\\/g, "/"));
  }
  return out;
};

const refFiles = git(["ls-tree", "-r", "--name-only", REF]).split("\n").filter(Boolean);
const isPage = (f) =>
  /^[^/]+\.html$/.test(f) || /^blog\/[^/]+\.html$/.test(f) || /^tools\/(?:[^/]+|complexity-coach\/index)\.html$/.test(f);
const pages = LIVE_BASE
  ? listDist().filter((f) => f.endsWith(".html") && !f.startsWith("_astro/"))
  : refFiles.filter((f) => isPage(f) && f !== "blog/_template.html");
const STATIC_FILES = ["robots.txt", "sitemap.xml", "_redirects", "_headers", "blog/feed.xml", "blog/posts.json", "0ddd3c5e36d62ab4cdac47fc97190e4f.txt", "social/linkedin.json", "social/devto.json"];

async function prefetchLive() {
  const files = [...pages, ...STATIC_FILES.filter((f) => !f.startsWith("_"))];
  for (let i = 0; i < files.length; i += 8) {
    await Promise.all(
      files.slice(i, i + 8).map(async (file) => {
        const response = await fetch(`${LIVE_BASE}/${file}`);
        liveCache.set(file, response.ok ? await response.text() : null);
      })
    );
  }
}

const problems = [];
const report = (file, check, before, after) => problems.push({ file, check, before, after });

const norm = (s) => (s || "").replace(/\s+/g, " ").trim();
const lf = (s) => (s || "").replace(/\r\n/g, "\n");
const stripVersion = (s) => (s || "").replace(/((?:\.\.\/|\/)?assets\/(?:css|js)\/[\w.-]+\.(?:css|js))\?v=[\w.-]*/g, "$1");
const sortKeys = (v) =>
  Array.isArray(v) ? v.map(sortKeys) : v && typeof v === "object" ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sortKeys(v[k])])) : v;

function withoutChrome(root) {
  const nav = root.querySelector("#mainNav");
  const header = nav && nav.closest("header");
  if (header) header.remove();
  const footers = root.querySelectorAll("footer");
  if (footers.length) footers[footers.length - 1].remove();
  return root;
}

function snapshot(html) {
  const root = parse(stripVersion(html), { comment: false });
  const attr = (sel, name) => root.querySelector(sel)?.getAttribute(name) ?? null;
  const metas = {};
  for (const m of root.querySelectorAll("meta")) {
    const key = m.getAttribute("name") || m.getAttribute("property");
    if (key && key !== "robots") metas[key] = m.getAttribute("content");
  }
  const jsonLd = root.querySelectorAll('script[type="application/ld+json"]').map((s) => {
    try {
      return JSON.stringify(sortKeys(JSON.parse(s.rawText)));
    } catch {
      return `INVALID:${norm(s.rawText).slice(0, 80)}`;
    }
  });
  const htmlLang = attr("html", "lang");
  const bodyAttrs = norm(root.querySelector("body")?.rawAttrs);

  const content = withoutChrome(parse(stripVersion(html), { comment: false }));
  for (const el of content.querySelectorAll("script, style, noscript")) el.remove();
  const body = content.querySelector("body") || content;
  return {
    title: norm(root.querySelector("title")?.text),
    description: attr('meta[name="description"]', "content"),
    robots: attr('meta[name="robots"]', "content"),
    canonical: attr('link[rel="canonical"]', "href"),
    hreflang: root.querySelectorAll('link[rel="alternate"]').map((l) => `${l.getAttribute("hreflang")}=${l.getAttribute("href")}`).join(" "),
    metas: JSON.stringify(sortKeys(metas)),
    jsonLd: jsonLd.join("\n"),
    htmlLang,
    bodyAttrs,
    h1: body.querySelectorAll("h1").map((h) => norm(h.text)).join(" | "),
    headings: body.querySelectorAll("h2, h3").map((h) => norm(h.text)).join(" | "),
    text: norm(body.text),
    links: body.querySelectorAll("a[href]").map((a) => `${a.getAttribute("href")} ${a.getAttribute("rel") || ""}`.trim()).join("\n"),
    // loading and fetchpriority too: a hero image that turns lazy in a new
    // component looks identical but hurts LCP.
    images: body.querySelectorAll("img").map((i) => `${i.getAttribute("src")} alt=${i.getAttribute("alt")} ${i.getAttribute("width")}x${i.getAttribute("height")} loading=${i.getAttribute("loading") || ""} fetchpriority=${i.getAttribute("fetchpriority") || ""}`).join("\n"),
    scripts: root.querySelectorAll("script[src]").map((s) => s.getAttribute("src")).join("\n"),
    styles: root.querySelectorAll('link[rel="stylesheet"]').map((s) => s.getAttribute("href")).join("\n"),
  };
}

function firstDiff(a, b) {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i += 1;
  return [a.slice(Math.max(0, i - 40), i + 80), b.slice(Math.max(0, i - 40), i + 80)];
}

async function run() {
if (LIVE_BASE) await prefetchLive();

// 1. Every published page: SEO fields and body content must match.
for (const file of pages) {
  const before = show(file);
  const outFile = path.join(DIST, file);
  if (!fs.existsSync(outFile)) {
    report(file, "missing in dist", "", "");
    continue;
  }
  if (before === null) {
    report(file, LIVE_BASE ? "not live yet (new page)" : "not in ref", "", "");
    continue;
  }
  if (file === "googlefe36830bf825adfa.html") {
    if (lf(before) !== lf(fs.readFileSync(outFile, "utf8"))) report(file, "raw file differs", "", "");
    continue;
  }
  const a = snapshot(before);
  const b = snapshot(fs.readFileSync(outFile, "utf8"));
  for (const key of Object.keys(a)) {
    if (a[key] !== b[key]) {
      const [x, y] = typeof a[key] === "string" ? firstDiff(a[key] || "", b[key] || "") : [a[key], b[key]];
      report(file, key, x, y);
    }
  }
}

// 2. Static files must be byte-identical. Netlify does not serve _redirects and
//    _headers, so in live mode they are compared with the committed source.
for (const file of STATIC_FILES) {
  const out = path.join(DIST, file);
  const committed = LIVE_BASE && file.startsWith("_");
  if (!fs.existsSync(out)) report(file, "missing in dist", "", "");
  else if (committed) {
    const source = lf(fs.readFileSync(path.join(ROOT, file), "utf8"));
    if (!lf(fs.readFileSync(out, "utf8")).startsWith(source.replace(/\s*$/, ""))) report(file, "differs from source", "", "");
  }
  // Git checkouts on Windows use CRLF; Netlify builds on Linux with LF.
  // dist/_redirects may also end with build-generated alias rules (src/lib/redirects.mjs).
  else {
    const before = lf(show(file));
    const after = lf(fs.readFileSync(out, "utf8"));
    const same = file === "_redirects" ? after.startsWith(before.replace(/\s*$/, "")) : before === after;
    if (!same) report(file, "content differs", "", "");
  }
}
for (const file of refFiles.filter((f) => /^(assets|blog\/images|tools\/complexity-coach\/assets)\//.test(f))) {
  const out = path.join(DIST, file);
  if (!fs.existsSync(out)) report(file, "asset missing in dist", "", "");
}

// 3. Every sitemap URL must be a built page.
const sitemap = fs.readFileSync(path.join(DIST, "sitemap.xml"), "utf8");
for (const [, url] of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) {
  let rel = url.replace(SITE, "").replace(/^\//, "");
  if (rel === "" || rel.endsWith("/")) rel += "index.html";
  if (!fs.existsSync(path.join(DIST, rel))) report("sitemap.xml", "URL has no built page", url, "");
}

// 4. Every local link and asset in the built pages must resolve inside dist/.
const builtPages = [];
const walk = (dir) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name.endsWith(".html")) builtPages.push(full);
  }
};
walk(DIST);
const broken = new Map();
for (const full of builtPages) {
  const rel = path.relative(DIST, full).replace(/\\/g, "/");
  const root = parse(fs.readFileSync(full, "utf8"));
  const refs = [
    ...root.querySelectorAll("a[href]").map((e) => e.getAttribute("href")),
    ...root.querySelectorAll("img[src], script[src]").map((e) => e.getAttribute("src")),
    ...root.querySelectorAll("link[href]").filter((e) => !/canonical|alternate|preconnect|dns-prefetch/.test(e.getAttribute("rel") || "")).map((e) => e.getAttribute("href")),
  ];
  for (const ref of refs) {
    if (!ref || /^(https?:|mailto:|tel:|#|data:|javascript:)/i.test(ref)) continue;
    const clean = ref.split("#")[0].split("?")[0];
    if (!clean) continue;
    let target = clean.startsWith("/") ? clean.slice(1) : path.posix.join(path.posix.dirname(rel), clean);
    if (target === "" || target.endsWith("/")) target += "index.html";
    if (target.startsWith(".netlify/")) continue;
    if (!fs.existsSync(path.join(DIST, target))) broken.set(`${rel} -> ${ref}`, true);
  }
}
for (const key of broken.keys()) report(key.split(" -> ")[0], "broken local reference", key.split(" -> ")[1], "");

// 5. Files the old site served that the new build no longer publishes (review, git mode only).
const dropped = LIVE_BASE
  ? []
  : refFiles.filter((f) => !fs.existsSync(path.join(DIST, f)) && !/^(platform|tool-apps|scripts|netlify|node_modules|src)\//.test(f));

const byCheck = {};
for (const p of problems) (byCheck[p.check] = byCheck[p.check] || []).push(p);
console.log(`Parity: ${pages.length} pages compared against ${LIVE_BASE || REF}; ${builtPages.length} pages built.`);
for (const [check, list] of Object.entries(byCheck)) {
  console.log(`\n[${check}] ${list.length}`);
  for (const p of list.slice(0, 12)) {
    console.log(`  - ${p.file}`);
    if (p.before || p.after) {
      console.log(`      before: ${String(p.before).replace(/\n/g, " ⏎ ").slice(0, 160)}`);
      console.log(`      after : ${String(p.after).replace(/\n/g, " ⏎ ").slice(0, 160)}`);
    }
  }
}
console.log(`\nNo longer published (not part of the site): ${dropped.length}`);
console.log(dropped.map((f) => `  ${f}`).join("\n"));
if (problems.length) {
  console.log(`\nParity FAILED with ${problems.length} difference(s).`);
  process.exitCode = 1;
} else {
  console.log("\nParity OK: every page, static file, sitemap URL and local reference matches.");
}
}

run().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
