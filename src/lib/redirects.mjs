import fs from "node:fs";
import path from "node:path";

// Builds 301 rules so every page has exactly one live address: its canonical.
// Netlify serves /pricing (no .html) and /tools/ (directory) as 200 copies of
// the real page, so each alias of a built page is redirected to the URL in
// that page's <link rel="canonical">. Rules are generated from dist/ on every
// build, so a new page is covered without editing _redirects by hand.

const SITE = "https://aisaaswithmustafa.com";

function listHtml(dir, base = dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listHtml(full, base, out);
    else if (entry.name.endsWith(".html")) out.push(path.relative(base, full).replace(/\\/g, "/"));
  }
  return out;
}

const stripSlash = (p) => (p.length > 1 ? p.replace(/\/$/, "") : p);

export function aliasesFor(file) {
  const own = `/${file}`;
  if (file === "index.html") return ["/index.html", "/index"];
  if (file.endsWith("/index.html")) {
    const dir = `/${file.slice(0, -"index.html".length)}`; // "/tools/"
    return [own, own.replace(/\.html$/, ""), dir, stripSlash(dir)];
  }
  return [own.replace(/\.html$/, "")];
}

export function buildRedirectRules(distDir, existingRules = "") {
  const taken = new Set(
    existingRules
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith("#"))
      .map((line) => line.split(/\s+/)[0])
  );
  const rules = [];
  for (const file of listHtml(distDir).sort()) {
    const html = fs.readFileSync(path.join(distDir, file), "utf8");
    const href = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!href || !href.startsWith(SITE)) continue;
    const canonical = href.slice(SITE.length) || "/";
    // Only redirect aliases of a page whose canonical is the page itself.
    const ownPaths = file === "index.html" ? ["/"] : [`/${file}`, `/${file.replace(/index\.html$/, "")}`];
    if (!ownPaths.includes(canonical)) continue;
    for (const alias of aliasesFor(file)) {
      if (alias === canonical || taken.has(alias)) continue;
      // Netlify treats /x and /x/ alike, so a slash-only difference would loop.
      if (stripSlash(alias) === stripSlash(canonical)) continue;
      rules.push(`${alias} ${canonical} 301!`);
      taken.add(alias);
    }
  }
  return rules;
}
