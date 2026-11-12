#!/usr/bin/env node
// Builds blog/feed.xml (RSS 2.0) from blog/posts.json and the generated post
// pages, newest first. Each item carries the full article (absolute links), so
// feed readers, daily.dev and Dev.to's RSS import get the whole post, with the
// hero photo as the enclosure.
//
//   node scripts/blog-feed.js        write blog/feed.xml
//
// new-post.js runs this after every new post or --refresh, so the feed never
// drifts from the manifest. Dates come from the manifest (not "now"), so an
// unchanged manifest always produces an identical feed.
const fs = require("fs");
const path = require("path");
const { extractArticleContent } = require("./blog-seo");

const ROOT = path.join(__dirname, "..");
const SITE_ORIGIN = "https://aisaaswithmustafa.com";
const FEED_URL = `${SITE_ORIGIN}/blog/feed.xml`;
const FEED_ITEMS = 20;

const escapeXml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

// CDATA cannot contain "]]>", so split it across two sections.
const cdata = (value) => `<![CDATA[${String(value).replace(/]]>/g, "]]]]><![CDATA[>")}]]>`;

// Rewrites relative src/href values against the post URL, so the article reads
// correctly outside the site (feeds, Dev.to).
function absolutizeHtml(html, pageUrl) {
  return String(html).replace(/\s(src|href)="([^"]*)"/g, (match, attr, value) => {
    if (!value || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(value)) return match;
    try {
      return ` ${attr}="${new URL(value, pageUrl).href}"`;
    } catch (_error) {
      return match;
    }
  });
}

// Strips the generated heading ids and classes, which mean nothing off-site.
function cleanArticleHtml(html) {
  return String(html).replace(/<(h[23])\s+class="scroll-mt-28"\s+id="[^"]*">/g, "<$1>");
}

const postUrl = (post) => `${SITE_ORIGIN}/blog/${post.slug}.html`;
const heroFile = (post) => post.heroImageFile || `${post.slug}.jpg`;

function articleFor(post, readFile) {
  // Line endings depend on the checkout (CRLF on Windows), so normalise them
  // to keep the feed identical everywhere.
  const html = readFile(`blog/${post.slug}.html`).replace(/\r\n/g, "\n");
  return absolutizeHtml(cleanArticleHtml(extractArticleContent(html)), postUrl(post));
}

function buildFeed(posts, { readFile, fileSize }) {
  const items = posts.slice(0, FEED_ITEMS).map((post) => {
    const url = postUrl(post);
    const hero = `blog/images/${heroFile(post)}`;
    const categories = [post.category, ...(post.tags || [])]
      .filter(Boolean)
      .filter((tag, i, all) => all.indexOf(tag) === i)
      .map((tag) => `      <category>${escapeXml(tag)}</category>`);
    return [
      "    <item>",
      `      <title>${escapeXml(post.title)}</title>`,
      `      <link>${url}</link>`,
      `      <guid isPermaLink="true">${url}</guid>`,
      `      <pubDate>${new Date(post.publishDateIso).toUTCString()}</pubDate>`,
      "      <dc:creator>Muhammad Mustafa</dc:creator>",
      `      <description>${escapeXml(post.metaDescription)}</description>`,
      ...categories,
      `      <enclosure url="${SITE_ORIGIN}/${hero}" length="${fileSize(hero)}" type="image/jpeg"/>`,
      `      <content:encoded>${cdata(articleFor(post, readFile))}</content:encoded>`,
      "    </item>",
    ].join("\n");
  });
  const newest = posts[0] ? new Date(posts[0].publishDateIso).toUTCString() : new Date(0).toUTCString();
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:dc="http://purl.org/dc/elements/1.1/">',
    "  <channel>",
    "    <title>AI SaaS with Mustafa: SaaS and AI Engineering Blog</title>",
    `    <link>${SITE_ORIGIN}/blog/index.html</link>`,
    `    <atom:link href="${FEED_URL}" rel="self" type="application/rss+xml"/>`,
    "    <description>Practical guides on SaaS, AI integrations, Node.js, React and web engineering by Muhammad Mustafa, from real project experience.</description>",
    "    <language>en</language>",
    `    <lastBuildDate>${newest}</lastBuildDate>`,
    ...items,
    "  </channel>",
    "</rss>",
    "",
  ].join("\n");
}

function writeFeed(root = ROOT) {
  const posts = JSON.parse(fs.readFileSync(path.join(root, "blog", "posts.json"), "utf8"));
  const xml = buildFeed(posts, {
    readFile: (file) => fs.readFileSync(path.join(root, file), "utf8"),
    fileSize: (file) => fs.statSync(path.join(root, file)).size,
  });
  fs.writeFileSync(path.join(root, "blog", "feed.xml"), xml);
  return Math.min(posts.length, FEED_ITEMS);
}

if (require.main === module) {
  console.log(`Updated blog/feed.xml with ${writeFeed()} posts.`);
}

module.exports = { FEED_URL, SITE_ORIGIN, absolutizeHtml, buildFeed, cleanArticleHtml, writeFeed };
