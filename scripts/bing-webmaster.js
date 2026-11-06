#!/usr/bin/env node
// Read-only Bing Webmaster Tools API helper for keyword and query research.
// The API key is read from BING_WEBMASTER_API_KEY (process env, or the Windows
// user environment). It is never printed, logged or written to disk.
//
// Usage:
//   node scripts/bing-webmaster.js sites
//   node scripts/bing-webmaster.js keyword "<phrase>" [--country us] [--language en-US] [--months 3]
//   node scripts/bing-webmaster.js related "<phrase>" [--country us] [--language en-US] [--months 3]
//   node scripts/bing-webmaster.js queries [--site https://aisaaswithmustafa.com/]
//   node scripts/bing-webmaster.js pages   [--site https://aisaaswithmustafa.com/]

const { execFileSync } = require("child_process");

const API_BASE = "https://ssl.bing.com/webmaster/api.svc/json";
const DEFAULT_SITE = "https://aisaaswithmustafa.com/";

function readApiKey() {
  if (process.env.BING_WEBMASTER_API_KEY) return process.env.BING_WEBMASTER_API_KEY.trim();
  if (process.platform === "win32") {
    try {
      const output = execFileSync("reg", ["query", "HKCU\\Environment", "/v", "BING_WEBMASTER_API_KEY"], {
        encoding: "utf8",
        stdio: ["ignore", "pipe", "ignore"],
      });
      const match = output.match(/BING_WEBMASTER_API_KEY\s+REG_\w+\s+(\S+)/);
      if (match) return match[1].trim();
    } catch (_error) {
      /* fall through */
    }
  }
  throw new Error("BING_WEBMASTER_API_KEY is not set.");
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const [name, inline] = token.slice(2).split("=");
      args[name] = inline !== undefined ? inline : argv[i + 1];
      if (inline === undefined) i += 1;
    } else {
      args._.push(token);
    }
  }
  return args;
}

// WCF JSON dates look like "/Date(1700000000000-0000)/".
function reviveDates(value) {
  if (typeof value === "string") {
    const match = value.match(/^\/Date\((-?\d+)([+-]\d{4})?\)\/$/);
    return match ? new Date(Number(match[1])).toISOString().slice(0, 10) : value;
  }
  if (Array.isArray(value)) return value.map(reviveDates);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, inner]) => [key, reviveDates(inner)]));
  }
  return value;
}

async function callApi(method, params, apiKey) {
  const url = new URL(`${API_BASE}/${method}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) url.searchParams.set(key, value);
  }
  url.searchParams.set("apikey", apiKey);

  const response = await fetch(url, { headers: { Accept: "application/json" } });
  const text = await response.text();
  if (!response.ok) {
    const safe = text.replace(new RegExp(apiKey, "g"), "***").slice(0, 500);
    throw new Error(`${method} failed with HTTP ${response.status}: ${safe}`);
  }
  const data = JSON.parse(text);
  return reviveDates(data && Object.prototype.hasOwnProperty.call(data, "d") ? data.d : data);
}

function dateRange(months) {
  const end = new Date();
  const start = new Date(end);
  start.setMonth(start.getMonth() - Number(months || 3));
  const iso = (date) => date.toISOString().slice(0, 10);
  return { startDate: iso(start), endDate: iso(end) };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const [command, phrase] = args._;
  const apiKey = readApiKey();
  const site = args.site || DEFAULT_SITE;
  const country = args.country === "all" ? "" : args.country || "us";
  const language = args.language || "en-US";

  let result;
  if (command === "sites") {
    result = await callApi("GetUserSites", {}, apiKey);
  } else if (command === "keyword" || command === "related") {
    if (!phrase) throw new Error(`Usage: ${command} "<phrase>"`);
    const method = command === "keyword" ? "GetKeyword" : "GetRelatedKeywords";
    result = await callApi(method, { q: phrase, country, language, ...dateRange(args.months) }, apiKey);
  } else if (command === "queries") {
    result = await callApi("GetQueryStats", { siteUrl: site }, apiKey);
  } else if (command === "pages") {
    result = await callApi("GetPageStats", { siteUrl: site }, apiKey);
  } else {
    throw new Error("Commands: sites | keyword <phrase> | related <phrase> | queries | pages");
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
