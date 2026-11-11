#!/usr/bin/env node
// Checks every entry in social/linkedin.json against the fixed LinkedIn post
// format, and that its page exists with an OG image on this site.
//
//   node scripts/validate-linkedin.js                    check all entries
//   node scripts/validate-linkedin.js --preview <path>   print the exact post text
//
// <path> is the site path used as the key, e.g. /blog/my-post.html.
const fs = require("fs");
const path = require("path");
const {
  SITE_ORIGIN,
  SOCIAL_FILE,
  prepareItem,
} = require("../netlify/plugins/linkedin/linkedin");

const ROOT = path.join(__dirname, "..");
const readFile = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

function pageFile(sitePath) {
  const clean = sitePath.replace(/^\//, "");
  return clean.endsWith("/") ? `${clean}index.html` : clean;
}

const social = JSON.parse(readFile(SOCIAL_FILE));
const previewIndex = process.argv.indexOf("--preview");
const keys = previewIndex > -1 ? [process.argv[previewIndex + 1]] : Object.keys(social);
let failed = 0;

for (const key of keys) {
  if (!key || !key.startsWith("/")) {
    console.error(`Invalid key "${key}". Use a site path such as /blog/my-post.html.`);
    failed += 1;
    continue;
  }
  const item = prepareItem(
    { kind: key.startsWith("/tools/") ? "tool" : "post", url: `${SITE_ORIGIN}${key}`, file: pageFile(key) },
    social,
    readFile,
  );
  if (item.imagePath && !fs.existsSync(path.join(ROOT, item.imagePath))) {
    item.problems.push(`OG image file ${item.imagePath} does not exist`);
  }
  if (item.problems.length) {
    failed += 1;
    console.error(`FAIL ${key}: ${item.problems.join("; ")}`);
  } else if (previewIndex > -1) {
    // Show the text as LinkedIn displays it, without the little-format escapes.
    const shown = item.commentary.replace(/\\([\\|{}@[\]()<>#*_~])/g, "$1");
    const when = social[key].publishAt ? `Scheduled: ${social[key].publishAt}` : "Shared: on the deploy that publishes it";
    console.log(`Image: ${item.imagePath}\n${when}\n\n${shown}`);
  } else {
    const at = social[key].publishAt;
    const late = at && new Date(at) < new Date() ? " (time has passed; it is shared only within 24 hours of it)" : "";
    console.log(`OK   ${key}${at ? `  scheduled ${at}${late}` : ""}`);
  }
}

if (failed) process.exit(1);
if (previewIndex === -1) console.log(`Validated ${keys.length} LinkedIn post text(s) in ${SOCIAL_FILE}.`);
