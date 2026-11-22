import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildRedirectRules } from "./redirects.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

// Everything the live site serves besides the rendered pages. Paths are
// relative to the repo root and keep the same public URL in dist/.
export const STATIC_ENTRIES = [
  "assets",
  "blog/images",
  "blog/feed.xml",
  "blog/posts.json",
  "tools/complexity-coach/assets",
  "robots.txt",
  "sitemap.xml",
  "_redirects",
  "_headers",
  "googlefe36830bf825adfa.html",
  "0ddd3c5e36d62ab4cdac47fc97190e4f.txt",
  // Read live by the LinkedIn and DEV scheduled functions.
  "social",
];

export function copyStaticFiles() {
  return {
    name: "copy-static-files",
    hooks: {
      "astro:build:done": ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        for (const entry of STATIC_ENTRIES) {
          const from = path.join(ROOT, entry);
          if (!fs.existsSync(from)) throw new Error(`Static entry is missing: ${entry}`);
          fs.cpSync(from, path.join(outDir, entry), { recursive: true });
        }
        logger.info(`Copied ${STATIC_ENTRIES.length} static entries`);

        // One live address per page: 301 every alias (/pricing, /tools/) to its canonical.
        const redirectsFile = path.join(outDir, "_redirects");
        const existing = fs.readFileSync(redirectsFile, "utf8");
        const rules = buildRedirectRules(outDir, existing);
        const eol = existing.includes("\r\n") ? "\r\n" : "\n";
        const block = ["", "# GENERATED_CANONICAL_ALIASES (src/lib/redirects.mjs, build time only)", ...rules, ""].join(eol);
        fs.writeFileSync(redirectsFile, existing.replace(/\s*$/, eol) + block);
        logger.info(`Added ${rules.length} canonical alias redirects`);
      },
    },
  };
}
