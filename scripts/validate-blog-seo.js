#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const BLOG_DIR = path.join(ROOT, "blog");
const SITE_URL = "https://aisaaswithmustafa.com";
const posts = JSON.parse(fs.readFileSync(path.join(BLOG_DIR, "posts.json"), "utf8"));
const errors = [];

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

for (const post of posts) {
  const relativePath = `blog/${post.slug}.html`;
  const postPath = path.join(ROOT, relativePath);
  if (!fs.existsSync(postPath)) {
    errors.push(`${relativePath}: file is missing`);
    continue;
  }

  const html = fs.readFileSync(postPath, "utf8");
  const expectedImage = `${SITE_URL}/blog/images/${post.heroImageFile || `${post.slug}.jpg`}`;
  const checks = [
    [!/{{[A-Z0-9_]+}}/.test(html), "contains an unreplaced template placeholder"],
    [!html.includes("mustcode.netlify.app"), "contains the legacy production hostname"],
    [countMatches(html, /<title>/gi) === 1, "must contain exactly one title"],
    [countMatches(html, /<h1[\s>]/gi) === 1, "must contain exactly one h1"],
    [countMatches(html, /<main[\s>]/gi) === 1, "must contain exactly one main landmark"],
    [html.includes('aria-labelledby="table-of-contents"'), "table of contents is missing"],
    [html.includes('id="about-author"'), "author section is missing"],
    [html.includes('id="related-articles"'), "related articles section is missing"],
    [html.includes(`property="og:image" content="${expectedImage}"`), "Open Graph image is not the post hero"],
    [html.includes(`name="twitter:image" content="${expectedImage}"`), "Twitter image is not the post hero"],
    [html.includes('property="article:modified_time"'), "article modified time is missing"],
    [countMatches(html, /property="article:tag"/g) >= 1, "article tags are missing"],
    [countMatches(html, /class="group rounded-xl border border-gray-700 bg-white\/5 p-4/g) === 3, "must contain exactly three related article cards"],
  ];
  for (const [passed, message] of checks) if (!passed) errors.push(`${relativePath}: ${message}`);

  if (post.serviceLandingPage) {
    if (!html.includes(`href="${post.serviceLandingPage}"`)) {
      errors.push(`${relativePath}: service landing page link is missing`);
    }
    const servicePath = path.join(ROOT, post.serviceLandingPage.replace(/^\//, ""));
    if (!fs.existsSync(servicePath)) errors.push(`${relativePath}: service landing page does not exist`);
  }

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      const data = JSON.parse(match[1]);
      const article = data["@graph"]?.find((entry) => entry["@type"] === "BlogPosting");
      if (!article?.dateModified) errors.push(`${relativePath}: BlogPosting dateModified is missing`);
      if (!Array.isArray(article?.keywords) || !article.keywords.length) errors.push(`${relativePath}: BlogPosting keywords are missing`);
    } catch (error) {
      errors.push(`${relativePath}: invalid JSON-LD (${error.message})`);
    }
  }

  const ids = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const toc = html.match(/<nav class="mb-10[\s\S]*?<\/nav>/)?.[0] || "";
  for (const match of toc.matchAll(/href="#([^"]+)"/g)) {
    if (!ids.has(match[1])) errors.push(`${relativePath}: TOC target #${match[1]} is missing`);
  }

  for (const match of html.matchAll(/href="\/blog\/([^"#?]+\.html)"/g)) {
    if (!fs.existsSync(path.join(BLOG_DIR, path.basename(match[1])))) {
      errors.push(`${relativePath}: broken internal blog link /blog/${match[1]}`);
    }
  }
}

if (errors.length) {
  console.error(`Blog SEO validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Validated SEO structure, schema, TOCs and internal links for ${posts.length} blog posts.`);
