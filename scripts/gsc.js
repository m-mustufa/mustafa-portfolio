#!/usr/bin/env node
// Read-only Google Search Console API helper (performance data, index status,
// sitemaps). Authenticates as a Google Cloud service account that was added to
// the Search Console property as a "Restricted" user, with the read-only scope.
//
// The service account JSON key stays outside the repo. Its path is read from
// GSC_KEY_FILE (process env, or the Windows user environment), default
// D:\keys\gsc-reader.json. The key and access tokens are never printed.
//
// Usage:
//   node scripts/gsc.js sites
//   node scripts/gsc.js summary --start 2026-11-04 --end 2026-11-17 [--vs-start 2026-10-21 --vs-end 2026-11-03]
//   node scripts/gsc.js pages   --start ... --end ... [--vs-start ... --vs-end ...] [--fresh]
//   node scripts/gsc.js queries --start ... --end ... [--page <url>] [--vs-start ... --vs-end ...]
//   node scripts/gsc.js inspect <url> [<url> ...]
//   node scripts/gsc.js inspect --sitemap          every URL in the live sitemap
//   node scripts/gsc.js sitemaps
//
// Dates are Pacific Time, inclusive. Without --start/--end the last 28 days
// ending 3 days ago are used (recent days are still incomplete). --fresh adds
// the incomplete recent data. --site overrides the property (for example
// sc-domain:aisaaswithmustafa.com or https://aisaaswithmustafa.com/).
const crypto = require("crypto");
const fs = require("fs");
const { execFileSync } = require("child_process");

const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
const TOKEN_URL = "https://oauth2.googleapis.com/token";
const WEBMASTERS = "https://www.googleapis.com/webmasters/v3";
const INSPECT_URL = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect";
const DOMAIN = "aisaaswithmustafa.com";
const SITE_ORIGIN = `https://${DOMAIN}`;
const DEFAULT_KEY_FILE = "D:\\keys\\gsc-reader.json";

function readKeyPath(env = process.env) {
  if (env.GSC_KEY_FILE) return env.GSC_KEY_FILE.trim();
  if (process.platform === "win32") {
    try {
      const output = execFileSync("reg", ["query", "HKCU\\Environment", "/v", "GSC_KEY_FILE"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const match = output.match(/GSC_KEY_FILE\s+REG_\w+\s+(.+)/);
      if (match) return match[1].trim();
    } catch (_error) {
      /* fall through */
    }
  }
  return DEFAULT_KEY_FILE;
}

function loadServiceAccount(keyPath) {
  let raw;
  try {
    raw = fs.readFileSync(keyPath, "utf8");
  } catch (_error) {
    throw new Error(`Service account key not found at ${keyPath}. Set GSC_KEY_FILE to its path.`);
  }
  const key = JSON.parse(raw);
  if (key.type !== "service_account" || !key.client_email || !key.private_key) {
    throw new Error(`${keyPath} is not a Google service account JSON key.`);
  }
  return { clientEmail: key.client_email, privateKey: key.private_key };
}

const base64url = (input) => Buffer.from(input).toString("base64").replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");

function buildJwt({ clientEmail, privateKey }, now = Math.floor(Date.now() / 1000)) {
  const header = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claims = base64url(JSON.stringify({ iss: clientEmail, scope: SCOPE, aud: TOKEN_URL, iat: now, exp: now + 3600 }));
  const signature = crypto.createSign("RSA-SHA256").update(`${header}.${claims}`).sign(privateKey);
  return `${header}.${claims}.${base64url(signature)}`;
}

function redact(text, secrets) {
  let out = String(text);
  for (const secret of secrets) if (secret) out = out.split(secret).join("***");
  return out;
}

function createClient({ account, fetchImpl = fetch }) {
  let token = null;

  async function accessToken() {
    if (token) return token;
    const assertion = buildJwt(account);
    const response = await fetchImpl(TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`Getting an access token failed with HTTP ${response.status}: ${redact(text, [assertion]).slice(0, 300)}`);
    token = JSON.parse(text).access_token;
    return token;
  }

  async function call(url, body) {
    const bearer = await accessToken();
    const response = await fetchImpl(url, {
      method: body ? "POST" : "GET",
      headers: { Authorization: `Bearer ${bearer}`, ...(body ? { "Content-Type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      const hint =
        response.status === 403
          ? ` Add ${account.clientEmail} as a Restricted user in Search Console (Settings, Users and permissions) and enable the Search Console API in the Cloud project.`
          : "";
      throw new Error(`${url.replace(/\?.*$/, "")} failed with HTTP ${response.status}: ${redact(text, [bearer]).slice(0, 300)}${hint}`);
    }
    return text ? JSON.parse(text) : {};
  }

  return {
    sites: () => call(`${WEBMASTERS}/sites`),
    sitemaps: (site) => call(`${WEBMASTERS}/sites/${encodeURIComponent(site)}/sitemaps`),
    query: (site, body) => call(`${WEBMASTERS}/sites/${encodeURIComponent(site)}/searchAnalytics/query`, body),
    inspect: (site, url) => call(INSPECT_URL, { inspectionUrl: url, siteUrl: site, languageCode: "en-US" }),
  };
}

// Prefer the Domain property, then the https URL-prefix property.
function pickSite(entries, override) {
  if (override) return override;
  const urls = (entries || []).filter((e) => e.permissionLevel !== "siteUnverifiedUser").map((e) => e.siteUrl);
  const preferred = [`sc-domain:${DOMAIN}`, `${SITE_ORIGIN}/`, `https://www.${DOMAIN}/`];
  const found = preferred.find((url) => urls.includes(url));
  if (!found) throw new Error(`No access to ${DOMAIN} yet. Properties visible to the service account: ${urls.join(", ") || "none"}.`);
  return found;
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [name, inline] = token.slice(2).split("=");
      const next = argv[i + 1];
      if (inline !== undefined) args[name] = inline;
      else if (next === undefined || next.startsWith("--")) args[name] = true;
      else {
        args[name] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

const isoDay = (date) => date.toISOString().slice(0, 10);
function addDays(day, n) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return isoDay(d);
}
const daysBetween = (start, end) => Math.round((new Date(`${end}T00:00:00Z`) - new Date(`${start}T00:00:00Z`)) / 86400000) + 1;

function ranges(args, today = isoDay(new Date())) {
  const end = args.end || addDays(today, -3);
  const start = args.start || addDays(end, -27);
  const current = { start, end, days: daysBetween(start, end) };
  const previous = args["vs-start"] && args["vs-end"]
    ? { start: args["vs-start"], end: args["vs-end"], days: daysBetween(args["vs-start"], args["vs-end"]) }
    : null;
  for (const r of [current, previous].filter(Boolean)) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(r.start) || !/^\d{4}-\d{2}-\d{2}$/.test(r.end) || r.days < 1) {
      throw new Error(`Invalid date range ${r.start} to ${r.end}. Use YYYY-MM-DD.`);
    }
  }
  return { current, previous };
}

function queryBody(range, dimensions, args) {
  const body = { startDate: range.start, endDate: range.end, type: "web", rowLimit: 25000, dataState: args.fresh ? "all" : "final" };
  if (dimensions.length) body.dimensions = dimensions;
  if (args.page) {
    body.dimensionFilterGroups = [{ groupType: "and", filters: [{ dimension: "page", operator: "equals", expression: args.page }] }];
  }
  return body;
}

const short = (url) => (url.startsWith(SITE_ORIGIN) ? url.slice(SITE_ORIGIN.length) || "/" : url);
const pct = (ctr) => `${(ctr * 100).toFixed(1)}%`;
const pos = (p) => (p ? p.toFixed(1) : "-");

// Merges current and previous rows by key. Per-day impressions make ranges of
// different lengths comparable.
function compareRows(currentRows, previousRows, current, previous) {
  const map = new Map();
  for (const row of currentRows) map.set(row.keys[0], { key: row.keys[0], now: row, before: null });
  for (const row of previousRows || []) {
    const item = map.get(row.keys[0]) || { key: row.keys[0], now: null, before: null };
    item.before = row;
    map.set(row.keys[0], item);
  }
  return [...map.values()]
    .map((item) => ({
      ...item,
      nowPerDay: item.now ? item.now.impressions / current.days : 0,
      beforePerDay: item.before && previous ? item.before.impressions / previous.days : 0,
    }))
    .sort((a, b) => b.nowPerDay - a.nowPerDay || b.beforePerDay - a.beforePerDay);
}

function formatRows(rows, current, previous, label) {
  const lines = [];
  const head = previous
    ? `${label} | clicks now/before | impressions now/before (per day) | position now/before`
    : `${label} | clicks | impressions | CTR | position`;
  lines.push(`Range: ${current.start} to ${current.end} (${current.days} days)${previous ? ` vs ${previous.start} to ${previous.end} (${previous.days} days)` : ""}`);
  lines.push(head);
  for (const r of rows) {
    const name = label === "page" ? short(r.key) : r.key;
    if (previous) {
      const n = r.now || { clicks: 0, impressions: 0, position: 0 };
      const b = r.before || { clicks: 0, impressions: 0, position: 0 };
      lines.push(
        `${name} | ${n.clicks}/${b.clicks} | ${n.impressions}/${b.impressions} (${r.nowPerDay.toFixed(1)}/${r.beforePerDay.toFixed(1)}) | ${pos(n.position)}/${pos(b.position)}`,
      );
    } else {
      lines.push(`${name} | ${r.now.clicks} | ${r.now.impressions} | ${pct(r.now.ctr)} | ${pos(r.now.position)}`);
    }
  }
  return lines.join("\n");
}

function totalsLine(name, range, row) {
  const r = row || { clicks: 0, impressions: 0, ctr: 0, position: 0 };
  return `${name} ${range.start} to ${range.end} (${range.days} days): clicks ${r.clicks}, impressions ${r.impressions} (${(r.impressions / range.days).toFixed(1)}/day), CTR ${pct(r.ctr)}, position ${pos(r.position)}`;
}

async function sitemapUrls(fetchImpl = fetch) {
  const response = await fetchImpl(`${SITE_ORIGIN}/sitemap.xml`);
  if (!response.ok) throw new Error(`Reading the sitemap failed with HTTP ${response.status}`);
  return [...(await response.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

function inspectionLine(url, result) {
  const s = (result && result.inspectionResult && result.inspectionResult.indexStatusResult) || {};
  const canonical = s.googleCanonical && s.userCanonical && s.googleCanonical !== s.userCanonical ? ` | Google canonical ${short(s.googleCanonical)}` : "";
  const crawled = s.lastCrawlTime ? s.lastCrawlTime.slice(0, 10) : "never";
  return `${short(url)} | ${s.verdict || "?"} | ${s.coverageState || "?"} | last crawl ${crawled}${canonical}`;
}

async function main(argv = process.argv.slice(2), { fetchImpl = fetch, env = process.env, log = console.log } = {}) {
  const args = parseArgs(argv);
  const command = args._[0];
  const commands = ["sites", "summary", "pages", "queries", "inspect", "sitemaps"];
  if (!commands.includes(command)) {
    throw new Error(`Usage: node scripts/gsc.js <${commands.join("|")}> [options]. See the comment at the top of the file.`);
  }
  const client = createClient({ account: loadServiceAccount(readKeyPath(env)), fetchImpl });
  const siteList = (await client.sites()).siteEntry || [];
  if (command === "sites") {
    log(JSON.stringify(siteList, null, 2));
    return;
  }
  const site = pickSite(siteList, args.site);
  log(`Property: ${site}`);

  if (command === "sitemaps") {
    const { sitemap = [] } = await client.sitemaps(site);
    for (const s of sitemap) {
      const counts = (s.contents || []).map((c) => `${c.type} submitted ${c.submitted}`).join(", ");
      log(`${s.path} | last read ${(s.lastDownloaded || "never").slice(0, 10)} | errors ${s.errors || 0}, warnings ${s.warnings || 0} | ${counts}`);
    }
    return;
  }

  if (command === "inspect") {
    const urls = args.sitemap ? await sitemapUrls(fetchImpl) : args._.slice(1);
    if (!urls.length) throw new Error("Give one or more URLs, or --sitemap.");
    log("page | verdict | coverage | last crawl");
    for (const url of urls) {
      try {
        log(inspectionLine(url, await client.inspect(site, url)));
      } catch (error) {
        log(`${short(url)} | error | ${error.message.split("\n")[0]}`);
      }
    }
    return;
  }

  const { current, previous } = ranges(args);
  if (command === "summary") {
    const now = await client.query(site, queryBody(current, [], args));
    log(totalsLine("Now", current, (now.rows || [])[0]));
    if (previous) {
      const before = await client.query(site, queryBody(previous, [], args));
      log(totalsLine("Before", previous, (before.rows || [])[0]));
    }
    return;
  }

  const dimension = command === "pages" ? "page" : "query";
  const now = await client.query(site, queryBody(current, [dimension], args));
  const before = previous ? await client.query(site, queryBody(previous, [dimension], args)) : null;
  log(formatRows(compareRows(now.rows || [], before && (before.rows || []), current, previous), current, previous, dimension));
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

module.exports = { buildJwt, compareRows, createClient, inspectionLine, main, parseArgs, pickSite, queryBody, ranges };
