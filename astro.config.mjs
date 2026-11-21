import { defineConfig } from "astro/config";
import { copyStaticFiles } from "./src/lib/copy-static.mjs";

// The site's pages still live as hand-written HTML at their public paths
// (index.html, pricing.html, blog/*.html, tools/*.html). Astro renders each of
// them through src/components/LegacyPage.astro, which swaps the
// <!--@site-header--> and <!--@site-footer--> markers for the shared
// components, and writes the result to dist/ at the exact same URL.
export default defineConfig({
  site: "https://aisaaswithmustafa.com",
  outDir: "./dist",
  // No public/ folder: static files are copied by copyStaticFiles() so that
  // the blog pipeline, plugins and scripts keep their current paths.
  publicDir: "./src/no-public",
  build: {
    // about.astro -> about.html, blog/index.astro -> blog/index.html
    format: "preserve",
  },
  trailingSlash: "ignore",
  compressHTML: false,
  devToolbar: { enabled: false },
  integrations: [copyStaticFiles()],
});
