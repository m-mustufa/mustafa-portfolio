#!/usr/bin/env node
// Lists DEV comments on the account's articles that have no reply from the
// account yet, so an agent can draft replies for the user to post by hand.
// Uses the public DEV API only (no key). Nothing is posted.
//
//   node scripts/devto-comments.js                 print unanswered comments
//   node scripts/devto-comments.js --out <file>    also write them as Markdown
//
// Comments listed in reports/devto-comments/ignore.json (an array of comment
// id codes, for spam or comments the user chose not to answer) are left out.
// reports/ is never committed.
const fs = require("fs");
const path = require("path");

const USERNAME = "aisaaswithmustafa";
const API = "https://dev.to/api";
const ROOT = path.join(__dirname, "..");
const IGNORE_FILE = path.join(ROOT, "reports", "devto-comments", "ignore.json");

async function getJson(url) {
  const response = await fetch(url, { headers: { Accept: "application/vnd.forem.api-v1+json", "User-Agent": "aisaaswithmustafa-comments" } });
  if (!response.ok) throw new Error(`${url} returned HTTP ${response.status}`);
  return response.json();
}

function text(html) {
  return String(html || "")
    .replace(/<br\s*\/?>|<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Walks a comment tree and returns comments by others with no reply from us.
function unanswered(comments, article, ignore, parent = null) {
  const found = [];
  for (const comment of comments) {
    const children = comment.children || [];
    const mine = comment.user && comment.user.username === USERNAME;
    const answered = children.some((child) => child.user && child.user.username === USERNAME);
    if (!mine && !answered && !ignore.has(comment.id_code)) {
      found.push({
        article: article.title,
        articleUrl: article.url,
        url: `https://dev.to/${(comment.user && comment.user.username) || USERNAME}/comment/${comment.id_code}`,
        id: comment.id_code,
        author: comment.user ? `${comment.user.name} (@${comment.user.username})` : "unknown",
        createdAt: comment.created_at,
        replyTo: parent ? text(parent.body_html).slice(0, 200) : "",
        body: text(comment.body_html),
      });
    }
    found.push(...unanswered(children, article, ignore, comment));
  }
  return found;
}

function toMarkdown(items, today) {
  const lines = [`# DEV comments to answer (${today})`, "", `${items.length} comment(s) without a reply from @${USERNAME}.`, ""];
  items.forEach((item, index) => {
    lines.push(
      `## ${index + 1}. ${item.author} on "${item.article}"`,
      "",
      `- Comment: ${item.url}`,
      `- Article: ${item.articleUrl}`,
      `- Date: ${item.createdAt}`,
      ...(item.replyTo ? [`- In reply to: ${item.replyTo}`] : []),
      "",
      ...item.body.split("\n").map((line) => `> ${line}`),
      "",
      "**Reply draft:**",
      "",
      "_(to be written)_",
      "",
    );
  });
  return `${lines.join("\n")}\n`;
}

async function main() {
  const outIndex = process.argv.indexOf("--out");
  const ignore = new Set(fs.existsSync(IGNORE_FILE) ? JSON.parse(fs.readFileSync(IGNORE_FILE, "utf8")) : []);
  // The public list is cached and can miss an article for a while; a weekly
  // run picks it up the next time.
  const articles = await getJson(`${API}/articles?username=${USERNAME}&per_page=1000`);
  const items = [];
  for (const article of articles.filter((a) => a.comments_count > 0)) {
    items.push(...unanswered(await getJson(`${API}/comments?a_id=${article.id}`), article, ignore));
  }
  console.log(`${articles.length} article(s) checked, ${items.length} comment(s) without a reply.`);
  for (const item of items) console.log(`- ${item.url} by ${item.author} on "${item.article}"`);
  if (outIndex > -1) {
    const file = path.resolve(process.argv[outIndex + 1]);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, toMarkdown(items, new Date().toISOString().slice(0, 10)));
    console.log(`Wrote ${file}`);
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}

module.exports = { text, unanswered, toMarkdown };
