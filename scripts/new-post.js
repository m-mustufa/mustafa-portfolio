#!/usr/bin/env node
/**
 * Publishes a new blog post from structured data: renders the template,
 * generates the hero image, and updates blog/posts.json (the single source
 * of truth), which regenerates blog/index.html, the homepage "From the
 * Blog" preview section, and sitemap.xml.
 *
 * Usage:
 *   node scripts/new-post.js --data path/to/post.json
 *
 * post.json shape:
 * {
 *   "title": "Post Title",
 *   "slug": "optional-custom-slug",       // derived from title if omitted
 *   "metaDescription": "150-160 char SEO description",
 *   "heroImageFile": "optional-descriptive-image-filename.jpg",
 *   "heroImageAlt": "descriptive alt text for the hero image",
 *   "imagePrompt": "prompt used for OpenAI image generation (or ignored by the fallback)",
 *   "category": "Security & Compliance",
 *   "tags": ["UAE PDPL", "SaaS Compliance"],
 *   "relatedSlugs": ["optional-curated-related-post-slug"],
 *   "serviceLandingPage": "/full-stack-developer-uae.html",
 *   "contentHtml": "<p>...</p><h2>...</h2>..."   // already-written post body as HTML
 * }
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { renderPostPage } = require("./blog-seo");

const ROOT = path.join(__dirname, "..");
const POSTS_JSON = path.join(ROOT, "blog", "posts.json");
const HOME_MAX_POSTS = 3;
const SITE_URL = "https://aisaaswithmustafa.com";

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function estimateReadingTime(html) {
  const text = html.replace(/<[^>]+>/g, " ");
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

function formatDate(d) {
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function loadPosts() {
  if (!fs.existsSync(POSTS_JSON)) return [];
  return JSON.parse(fs.readFileSync(POSTS_JSON, "utf8"));
}

function savePosts(posts) {
  fs.writeFileSync(POSTS_JSON, JSON.stringify(posts, null, 2) + "\n");
}

function escapeHtml(str) {
  return String(str).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function heroImageFile(post) {
  return post.heroImageFile || `${post.slug}.jpg`;
}

function blogCard(post) {
  return `
              <a href="/blog/${post.slug}.html"
                class="blog-index-card group">
                <div class="blog-index-image">
                  <img src="/blog/images/${heroImageFile(post)}" alt="${escapeHtml(post.heroImageAlt)}"
                    width="1200" height="675" loading="lazy" />
                  <span>${escapeHtml(post.category || "Engineering Notes")}</span>
                </div>
                <div class="blog-index-content">
                  <p class="blog-index-meta">${post.publishDate}<span aria-hidden="true">·</span>${post.readingTime} min read</p>
                  <h2>${escapeHtml(post.title)}</h2>
                  <p class="blog-index-excerpt">${escapeHtml(post.metaDescription)}</p>
                  <span class="blog-index-link">Read article <span aria-hidden="true">&rarr;</span></span>
                </div>
              </a>`;
}

function homeCard(post) {
  return `
        <a href="/blog/${post.slug}.html"
          class="group block bg-white/5 rounded-2xl border border-gray-700 overflow-hidden transition hover:-translate-y-1 hover:border-primary">
          <img src="/blog/images/${heroImageFile(post)}" alt="${escapeHtml(post.heroImageAlt)}"
            width="1200" height="675" loading="lazy" class="w-full aspect-video object-cover" />
          <div class="p-5">
            <p class="text-primary text-xs font-semibold mb-2">${post.publishDate} · ${post.readingTime} min read</p>
            <h3 class="text-lg font-bold text-white mb-1 group-hover:text-primary transition">${escapeHtml(post.title)}</h3>
            <p class="text-gray-400 text-sm">${escapeHtml(post.metaDescription)}</p>
          </div>
        </a>`;
}

function regenerateBlogIndex(posts) {
  const indexPath = path.join(ROOT, "blog", "index.html");
  let html = fs.readFileSync(indexPath, "utf8");
  const inner = posts.length
    ? `<div class="blog-index-grid">${posts.map(blogCard).join("")}\n            </div>`
    : `<p class="text-center text-gray-400 py-16">New posts are on the way — check back soon.</p>`;
  html = html.replace(/<!-- POSTS_START -->[\s\S]*?<!-- POSTS_END -->/, `<!-- POSTS_START -->\n            ${inner}\n            <!-- POSTS_END -->`);
  fs.writeFileSync(indexPath, html);
  console.log("Updated blog/index.html");
}

function regenerateHomeSection(posts) {
  const homePath = path.join(ROOT, "index.html");
  let html = fs.readFileSync(homePath, "utf8");
  const latest = posts.slice(0, HOME_MAX_POSTS);
  const inner = latest.length
    ? latest.map(homeCard).join("")
    : `\n        <p class="text-gray-400 col-span-full text-center">New posts are on the way — check back soon.</p>`;
  html = html.replace(/<!-- HOME_BLOG_START -->[\s\S]*?<!-- HOME_BLOG_END -->/, `<!-- HOME_BLOG_START -->${inner}\n        <!-- HOME_BLOG_END -->`);
  fs.writeFileSync(homePath, html);
  console.log("Updated index.html blog preview section");
}

function regenerateSitemap(posts) {
  const sitemapPath = path.join(ROOT, "sitemap.xml");
  let sitemap = fs.readFileSync(sitemapPath, "utf8");
  // Strip any existing blog entries, then re-add all from the manifest (idempotent, avoids duplicates)
  sitemap = sitemap.replace(/\s*<url>\s*<loc>https:\/\/aisaaswithmustafa\.com\/blog\/[\s\S]*?<\/url>/g, "");
  const blogIndexLastModified = posts[0]?.publishDateIso.slice(0, 10) || new Date().toISOString().slice(0, 10);
  const entries = [
    `  <url>
    <loc>${SITE_URL}/blog/index.html</loc>
    <lastmod>${blogIndexLastModified}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`,
    ...posts.map(
      (post) => `  <url>
    <loc>${SITE_URL}/blog/${post.slug}.html</loc>
    <lastmod>${post.publishDateIso.slice(0, 10)}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    ),
  ].join("\n");
  sitemap = sitemap.replace("</urlset>", (entries ? entries + "\n" : "") + "</urlset>");
  fs.writeFileSync(sitemapPath, sitemap);
  console.log("Updated sitemap.xml");
}

const args = parseArgs(process.argv.slice(2));
if (!args.data) {
  console.error("Usage: node scripts/new-post.js --data path/to/post.json");
  process.exit(1);
}

const post = JSON.parse(fs.readFileSync(path.resolve(args.data), "utf8"));
if (!post.title || !post.metaDescription || !post.contentHtml) {
  console.error("post.json must include at least: title, metaDescription, contentHtml");
  process.exit(1);
}

const slug = post.slug ? slugify(post.slug) : slugify(post.title);
const postPath = path.join(ROOT, "blog", `${slug}.html`);
if (fs.existsSync(postPath)) {
  console.error(`blog/${slug}.html already exists — pick a different slug or delete the existing post first.`);
  process.exit(1);
}

const now = new Date();
const publishDate = formatDate(now);
const publishDateIso = now.toISOString();
const readingTime = estimateReadingTime(post.contentHtml);
const newPost = {
  slug,
  title: post.title,
  metaDescription: post.metaDescription,
  heroImageFile: post.heroImageFile || `${slug}.jpg`,
  heroImageAlt: post.heroImageAlt || post.title,
  publishDate,
  publishDateIso,
  readingTime,
  category: post.category || "SaaS Engineering",
  tags: Array.isArray(post.tags) ? post.tags : [],
  relatedSlugs: Array.isArray(post.relatedSlugs) ? post.relatedSlugs : [],
  serviceLandingPage: post.serviceLandingPage || "",
};
const posts = [newPost, ...loadPosts()];

// 1. Render the post page from the template
const template = fs.readFileSync(path.join(ROOT, "blog", "_template.html"), "utf8");
const rendered = renderPostPage({
  template,
  post: newPost,
  contentHtml: post.contentHtml,
  posts,
});

fs.writeFileSync(postPath, rendered);
console.log(`Wrote blog/${slug}.html`);

// 2. Generate the hero image (OpenAI if configured, otherwise free fallback)
execFileSync(
  "node",
  [
    path.join(ROOT, "scripts", "generate-image.js"),
    "--slug", slug,
    "--file", heroImageFile(newPost),
    "--title", post.title,
    "--prompt", post.imagePrompt || `A clean, modern, abstract tech illustration representing: ${post.title}`,
  ],
  { stdio: "inherit" }
);

// 3. Update the manifest (single source of truth), newest first
savePosts(posts);
console.log("Updated blog/posts.json");

// 4. Regenerate everything derived from the manifest
regenerateBlogIndex(posts);
regenerateHomeSection(posts);
regenerateSitemap(posts);

// Related links depend on the complete manifest, so refresh every generated post.
execFileSync("node", [path.join(ROOT, "scripts", "refresh-blog-seo.js")], { stdio: "inherit" });

console.log(`\nDone. Draft ready at blog/${slug}.html — remember to run "npm run build:css" if you added any new Tailwind classes, then review before pushing.`);
