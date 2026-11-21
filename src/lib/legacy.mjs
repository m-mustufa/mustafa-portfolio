import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

// Astro bundles this file into dist/.prerender, so resolve from the project
// root (where `astro build` runs) rather than from import.meta.url.
export const ROOT = process.cwd();

export const HEADER_MARKER = "<!--@site-header-->";
export const FOOTER_MARKER = "<!--@site-footer-->";

// Files that are copied as-is or never published.
const NOT_RENDERED = new Set(["googlefe36830bf825adfa.html", "blog/_template.html"]);

// Pages that need an index.astro of their own so the output keeps the
// folder/index.html shape. Everything else goes through [...slug].astro.
export const INDEX_PAGES = ["index.html", "blog/index.html", "tools/index.html", "tools/complexity-coach/index.html"];

export function listPages() {
  const pages = [];
  const add = (dir) => {
    for (const name of fs.readdirSync(path.join(ROOT, dir))) {
      const rel = dir === "." ? name : `${dir}/${name}`;
      if (name.endsWith(".html") && !NOT_RENDERED.has(rel)) pages.push(rel);
    }
  };
  add(".");
  add("blog");
  add("tools");
  pages.push("tools/complexity-coach/index.html");
  return pages.sort();
}

export function slugPages() {
  return listPages()
    .filter((file) => !INDEX_PAGES.includes(file))
    .map((file) => ({ params: { slug: file.replace(/\.html$/, "") }, props: { file } }));
}

// Exact-page highlight in the header nav.
const ACTIVE = {
  "ai-saas-development-services.html": "services",
  "pricing.html": "pricing",
  "portfolio.html": "projects",
  "blog/index.html": "blog",
  "tools/index.html": "tools",
};

const hashes = new Map();
function contentHash(rel) {
  if (!hashes.has(rel)) {
    const file = path.join(ROOT, rel);
    hashes.set(rel, fs.existsSync(file) ? crypto.createHash("md5").update(fs.readFileSync(file)).digest("hex").slice(0, 10) : null);
  }
  return hashes.get(rel);
}

// Give every local CSS/JS reference a content hash so browsers never keep a
// stale stylesheet after a deploy (the reason the nav once ran together).
export function versionAssets(html) {
  return html.replace(/((?:\.\.\/|\/)?assets\/(?:css|js)\/[\w.-]+\.(?:css|js))(?:\?v=[\w.-]*)?(?=["'])/g, (match, url) => {
    const hash = contentHash(url.replace(/^(?:\.\.\/|\/)/, ""));
    return hash ? `${url}?v=${hash}` : match;
  });
}

// Branch deploys and previews must never be indexed.
export function applyDeployContext(html, context = process.env.CONTEXT) {
  if (!context || context === "production") return html;
  const noindex = '<meta name="robots" content="noindex, nofollow">';
  if (/<meta name="robots"[^>]*>/i.test(html)) return html.replace(/<meta name="robots"[^>]*>/gi, noindex);
  return html.replace(/<head>/i, `<head>\n    ${noindex}`);
}

export function loadPage(file) {
  let html = fs.readFileSync(path.join(ROOT, file), "utf8");
  html = applyDeployContext(versionAssets(html));
  // Astro writes its own doctype.
  html = html.replace(/^﻿?\s*<!doctype html>\s*/i, "");

  const body = html.match(/<body[^>]*>/i)?.[0] || "";
  const isHome = file === "index.html";
  const header = {
    isHome,
    active: ACTIVE[file],
    trackCta: /data-service-page=/.test(body),
    variant: file === "profile.html" ? "profile" : file.startsWith("tools/complexity-coach/") ? "coach" : /ai-saas-services-page/.test(body) ? "service" : "default",
  };
  const footer = { isHome, name: file === "profile.html" ? "Muhammad Mustufa" : "Muhammad Mustafa" };

  if (html.includes(FOOTER_MARKER)) html = html.replace(/<\/head>/i, () => `    <style id="site-footer-css">${footerCss()}</style>\n</head>`);

  const page = { before: "", header: null, middle: html, footer: null, after: "" };
  const h = split(page.middle, HEADER_MARKER, file);
  if (h) [page.before, page.middle, page.header] = [h[0], h[1], header];
  const f = split(page.middle, FOOTER_MARKER, file);
  if (f) [page.middle, page.after, page.footer] = [f[0], f[1], footer];
  return page;
}

let footerCssCache;
function footerCss() {
  footerCssCache ??= fs
    .readFileSync(path.join(ROOT, "src/components/site-footer.css"), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s*([{};:,>])\s*/g, "$1")
    .replace(/\s+/g, " ")
    .replace(/;}/g, "}")
    .trim();
  return footerCssCache;
}

function split(text, marker, file) {
  const index = text.indexOf(marker);
  if (index === -1) return null;
  if (text.indexOf(marker, index + 1) !== -1) throw new Error(`${file}: ${marker} appears twice`);
  return [text.slice(0, index), text.slice(index + marker.length)];
}
