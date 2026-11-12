#!/usr/bin/env node
// Checks every entry in social/devto.json and that its post exists.
//
//   node scripts/validate-devto.js                    check all entries
//   node scripts/validate-devto.js --preview <path>   print the DEV article (Markdown)
//
// <path> is the site path used as the key, e.g. /blog/my-post.html.
const fs = require("fs");
const path = require("path");
const { DEVTO_FILE, buildArticle, validateEntry } = require("../netlify/lib/devto");

const ROOT = path.join(__dirname, "..");
const entries = JSON.parse(fs.readFileSync(path.join(ROOT, DEVTO_FILE), "utf8"));
const previewIndex = process.argv.indexOf("--preview");
const keys = previewIndex > -1 ? [process.argv[previewIndex + 1]] : Object.keys(entries);
let failed = 0;

for (const key of keys) {
  const problems = validateEntry(key, entries[key]);
  const file = path.join(ROOT, String(key || "").replace(/^\//, ""));
  if (!fs.existsSync(file)) problems.push(`page ${key} does not exist`);
  if (problems.length) {
    failed += 1;
    console.error(`FAIL ${key}: ${problems.join("; ")}`);
    continue;
  }
  const article = buildArticle(fs.readFileSync(file, "utf8"), `https://aisaaswithmustafa.com${key}`, entries[key]);
  if (!article.main_image) {
    failed += 1;
    console.error(`FAIL ${key}: no hero image found for the DEV cover`);
  } else if (previewIndex > -1) {
    console.log(`Title: ${article.title}\nTags: ${article.tags}\nCover: ${article.main_image}\nCanonical: ${article.canonical_url}\nScheduled: ${entries[key].publishAt}\n\n${article.body_markdown}`);
  } else {
    console.log(`OK   ${key}  scheduled ${entries[key].publishAt}  tags ${article.tags}`);
  }
}

if (failed) process.exit(1);
if (previewIndex === -1) console.log(`Validated ${keys.length} DEV cross-post(s) in ${DEVTO_FILE}.`);
