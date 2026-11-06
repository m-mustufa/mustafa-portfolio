const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { submitUrls, validateUrl } = require("../../../scripts/submit-indexnow");

const ROOT = path.join(__dirname, "..", "..", "..");
const SITE_ORIGIN = "https://aisaaswithmustafa.com";
// IndexNow accepts at most 10,000 URLs per request.
const MAX_URLS = 10000;

function sitemapUrls(xml) {
  return new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(([, url]) => url.trim()));
}

// A changed HTML file can be published under its file path and, for index
// pages, under its folder URL. Both forms are checked against the sitemap.
function fileToCandidateUrls(file) {
  const normalized = file.replace(/\\/g, "/");
  if (!normalized.endsWith(".html")) return [];

  const candidates = [`${SITE_ORIGIN}/${normalized}`];
  if (normalized === "index.html") {
    candidates.push(`${SITE_ORIGIN}/`);
  } else if (normalized.endsWith("/index.html")) {
    candidates.push(`${SITE_ORIGIN}/${normalized.slice(0, -"index.html".length)}`);
  }
  return candidates;
}

// Only URLs listed in sitemap.xml are submitted, so drafts, templates and
// noindex pages such as thanks.html are never sent.
function selectChangedUrls(changedFiles, indexableUrls) {
  const urls = new Set();
  for (const file of changedFiles) {
    for (const candidate of fileToCandidateUrls(file)) {
      if (indexableUrls.has(candidate)) urls.add(validateUrl(candidate));
    }
  }
  return [...urls].slice(0, MAX_URLS);
}

function listChangedFiles(fromRef, toRef, cwd = ROOT) {
  const output = execFileSync("git", ["diff", "--name-only", "--diff-filter=AMR", fromRef, toRef], {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
  return output
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

async function runIndexNow({
  env = process.env,
  fetchImpl,
  readSitemap = () => fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8"),
  listFiles = listChangedFiles,
} = {}) {
  if (env.CONTEXT !== "production") {
    return { skipped: `deploy context is ${env.CONTEXT || "unknown"}, not production` };
  }

  const fromRef = env.CACHED_COMMIT_REF;
  const toRef = env.COMMIT_REF;
  if (!fromRef || !toRef) return { skipped: "commit references are missing" };
  if (fromRef === toRef) return { skipped: "no new commit since the last production build" };

  const urls = selectChangedUrls(listFiles(fromRef, toRef), sitemapUrls(readSitemap()));
  if (!urls.length) return { skipped: "no page in sitemap.xml changed" };
  if (env.INDEXNOW_DRY_RUN === "true") return { dryRun: true, urls };

  const status = await submitUrls(urls, fetchImpl);
  return { status, urls };
}

module.exports = {
  MAX_URLS,
  fileToCandidateUrls,
  listChangedFiles,
  runIndexNow,
  selectChangedUrls,
  sitemapUrls,
};
