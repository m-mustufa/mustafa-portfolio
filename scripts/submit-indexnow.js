#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const SITE_ORIGIN = "https://aisaaswithmustafa.com";
const SITE_HOST = new URL(SITE_ORIGIN).hostname;
const INDEXNOW_KEY = "0ddd3c5e36d62ab4cdac47fc97190e4f";
const KEY_LOCATION = `${SITE_ORIGIN}/${INDEXNOW_KEY}.txt`;
const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";

function parseArgs(argv) {
  const args = { urls: [] };

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];
    if (token.startsWith("--url=")) {
      args.urls.push(token.slice("--url=".length));
    } else if (token === "--url") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--url requires a URL");
      args.urls.push(value);
      index += 1;
    } else if (token === "--sitemap") {
      args.sitemap = true;
    } else if (token.startsWith("--since=")) {
      args.since = token.slice("--since=".length);
    } else if (token === "--since") {
      const value = argv[index + 1];
      if (!value || value.startsWith("--")) throw new Error("--since requires YYYY-MM-DD");
      args.since = value;
      index += 1;
    } else if (token === "--submit") {
      args.submit = true;
    } else if (token === "--help" || token === "-h") {
      args.help = true;
    } else {
      throw new Error(`Unknown argument: ${token}`);
    }
  }

  return args;
}

function extractSitemapEntries(xml) {
  return [...xml.matchAll(/<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<lastmod>([^<]+)<\/lastmod>[\s\S]*?<\/url>/g)].map(
    ([, url, lastmod]) => ({ url: url.trim(), lastmod: lastmod.trim() }),
  );
}

function validateSince(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00Z`))) {
    throw new Error("--since must be a valid YYYY-MM-DD date");
  }
}

function validateUrl(value) {
  const url = new URL(value);
  if (url.protocol !== "https:" || url.hostname !== SITE_HOST) {
    throw new Error(`Only HTTPS URLs on ${SITE_HOST} can be submitted: ${value}`);
  }
  url.hash = "";
  return url.toString();
}

function collectUrls(args) {
  const urls = [...args.urls];

  if (args.sitemap) {
    if (!args.since) {
      throw new Error("--sitemap requires --since so unchanged URLs are not resubmitted");
    }
    validateSince(args.since);
    const xml = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
    for (const entry of extractSitemapEntries(xml)) {
      if (entry.lastmod >= args.since) urls.push(entry.url);
    }
  }

  return [...new Set(urls.map(validateUrl))];
}

async function verifyLiveKey(fetchImpl = fetch) {
  const response = await fetchImpl(KEY_LOCATION, { redirect: "error" });
  const body = (await response.text()).trim();
  if (!response.ok || body !== INDEXNOW_KEY) {
    throw new Error(`Live IndexNow key verification failed (${response.status}) at ${KEY_LOCATION}`);
  }
}

async function submitUrls(urlList, fetchImpl = fetch) {
  await verifyLiveKey(fetchImpl);
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      host: SITE_HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList,
    }),
  });

  if (![200, 202].includes(response.status)) {
    const detail = (await response.text()).trim();
    throw new Error(`IndexNow rejected the submission (${response.status})${detail ? `: ${detail}` : ""}`);
  }

  return response.status;
}

function printHelp() {
  console.log(`Usage:
  node scripts/submit-indexnow.js --url <production-url> [--url <production-url>] [--submit]
  node scripts/submit-indexnow.js --sitemap --since YYYY-MM-DD [--submit]

Without --submit the command is a dry run. Sitemap mode requires --since to avoid
resubmitting unchanged pages. Run the real submission only after production is live.`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help) {
    printHelp();
    return;
  }

  const urlList = collectUrls(args);
  if (!urlList.length) throw new Error("No eligible URLs were selected");

  console.log(`${args.submit ? "Submitting" : "Dry run:"} ${urlList.length} URL(s)`);
  for (const url of urlList) console.log(`- ${url}`);

  if (!args.submit) {
    console.log("No request sent. Add --submit after the deployment is live.");
    return;
  }

  const status = await submitUrls(urlList);
  console.log(`IndexNow accepted the submission (HTTP ${status}).`);
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  KEY_LOCATION,
  collectUrls,
  extractSitemapEntries,
  parseArgs,
  submitUrls,
  validateSince,
  validateUrl,
  verifyLiveKey,
};
