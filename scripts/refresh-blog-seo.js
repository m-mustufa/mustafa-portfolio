#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { extractArticleContent, renderPostPage } = require("./blog-seo");

const ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const posts = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, "posts.json"), "utf8"));
const template = fs.readFileSync(path.join(BLOG_DIR, "_template.html"), "utf8");

// Extract every article first so a malformed page cannot cause a partial refresh.
const renderedPages = posts.map((post) => {
  const postPath = path.join(BLOG_DIR, `${post.slug}.html`);
  if (!fs.existsSync(postPath)) throw new Error(`Missing generated post: blog/${post.slug}.html`);

  const currentHtml = fs.readFileSync(postPath, "utf8");
  const contentHtml = extractArticleContent(currentHtml);
  return {
    postPath,
    html: renderPostPage({ template, post, contentHtml, posts }),
  };
});

for (const page of renderedPages) fs.writeFileSync(page.postPath, page.html);
console.log(`Refreshed SEO structure for ${renderedPages.length} blog posts.`);
