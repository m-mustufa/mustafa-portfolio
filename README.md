# AI SaaS with Mustafa

Source of [aisaaswithmustafa.com](https://aisaaswithmustafa.com), the portfolio, blog and free tools of Muhammad Mustafa, a full-stack SaaS and AI developer.

- 50+ pages, 35 blog posts and 5 free browser tools
- Hand-written HTML rendered through [Astro](https://astro.build) for a shared header and footer
- Tailwind CSS compiled ahead of time, vanilla JavaScript, no client-side framework
- Hosted on Netlify with serverless functions and two small build plugins

## How this site is built

The site started as plain HTML files. In November 2026 it moved to Astro **without changing a single URL or a word of page content**.

1. **Pages stay as HTML at their public paths** (`index.html`, `pricing.html`, `blog/*.html`, `tools/*.html`). Each page has two markers where its header and footer used to be: `<!--@site-header-->` and `<!--@site-footer-->`.
2. **Astro renders every page into `dist/`** at the same URL. [`LegacyPage.astro`](src/components/LegacyPage.astro) swaps the markers for [`SiteHeader.astro`](src/components/SiteHeader.astro) and [`SiteFooter.astro`](src/components/SiteFooter.astro), so the navigation and footer are edited in one place.
3. **`.html` URLs are kept** with `build.format: "preserve"` in [`astro.config.mjs`](astro.config.mjs): `pricing.html` stays `pricing.html`, and `blog/index.html` stays `blog/index.html`.
4. **[`src/lib/legacy.mjs`](src/lib/legacy.mjs)** sets the active nav link, adds a content hash (`?v=`) to every local CSS and JS file so browsers never keep a stale stylesheet, and switches `robots` to `noindex` on every Netlify deploy that is not production.
5. **Static files** (images, feed, sitemap, redirects) are copied into `dist/` by [`src/lib/copy-static.mjs`](src/lib/copy-static.mjs).

### Parity check

[`scripts/parity-check.js`](scripts/parity-check.js) compares every page of a git ref (production by default) with the new build. It checks titles, meta tags, canonical URLs, JSON-LD, headings, body text, links, images, static files, sitemap URLs and every local link or asset reference. The migration went live only when it reported zero differences.

```bash
npm run build
npm run parity            # compare dist/ with main
npm run parity -- <ref>   # or with any git ref
```

## Commands

| Command | What it does |
|---|---|
| `npm install` | Install dependencies (Node 22.12 or newer) |
| `npm run build` | Build the site into `dist/` |
| `npm run preview` | Serve `dist/` locally |
| `npm run build:css` | Recompile `assets/css/tailwind.css` after changing Tailwind classes |
| `npm run validate:site-seo` | Build, then check titles, descriptions, headings, schema, images, links and sitemap entries |
| `npm run validate:blog-seo` | Check every blog post's SEO structure |
| `npm run parity` | Compare the build with production page by page |

## Project structure

```
index.html, pricing.html, ...   Pages (HTML with header/footer markers)
blog/                           Blog posts, posts.json manifest, RSS feed, images
tools/                          Free browser tools
src/components/                 Shared SiteHeader, SiteFooter and the page renderer
src/lib/                        Page loading, asset hashing, static file copying
assets/                         CSS, JavaScript, images and documents
scripts/                        Blog pipeline, validators, parity check, SEO helpers
netlify/functions/              Serverless functions (site assistant, IndexNow relay, scheduled social posts)
netlify/plugins/                Post-deploy plugins (IndexNow, LinkedIn)
```

## Blog pipeline

New posts are rendered from [`blog/_template.html`](blog/_template.html) by [`scripts/new-post.js`](scripts/new-post.js). The script updates the `blog/posts.json` manifest and regenerates the blog index, the homepage blog section, the sitemap and the RSS feed from it. After a production deploy, a build plugin notifies IndexNow (Bing and other engines) about changed pages only.

## Free tools

- [Complexity Coach](https://aisaaswithmustafa.com/tools/complexity-coach/): Big O estimates for JavaScript
- [AI API Cost Calculator](https://aisaaswithmustafa.com/tools/ai-api-cost-calculator.html)
- [SaaS Metrics Calculator](https://aisaaswithmustafa.com/tools/saas-metrics-calculator.html)
- [Upwork Proposal Roast](https://aisaaswithmustafa.com/tools/upwork-proposal-roast.html)
- [IndexNow Submitter](https://aisaaswithmustafa.com/tools/indexnow-submitter.html)

## Deploying

Netlify runs `npm run build` and publishes `dist/` (see [`netlify.toml`](netlify.toml)). Pushes to `main` go to production. Preview branches get their own noindexed Netlify URL.

---

Need a SaaS, AI or web project built? See [services and pricing](https://aisaaswithmustafa.com/pricing.html) or [get in touch](https://aisaaswithmustafa.com/#contact).

All content, images and branding © 2026 Muhammad Mustafa.
