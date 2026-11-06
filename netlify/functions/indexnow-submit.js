// Relay for the free IndexNow Submitter tool (/tools/indexnow-submitter.html).
// Browsers cannot call api.indexnow.org directly (no CORS) or read a key file
// on another site, so this function checks the key file and forwards the
// submission. Nothing is stored or logged beyond an error category.

const dns = require("dns").promises;
const net = require("net");

const INDEXNOW_ENDPOINT = "https://api.indexnow.org/indexnow";
const MAX_URLS = 100;
const MAX_URL_LENGTH = 2048;
const KEY_FILE_MAX_BYTES = 4096;
const FETCH_TIMEOUT_MS = 8000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const requestBuckets = new Map();

const KEY_PATTERN = /^[a-zA-Z0-9-]{8,128}$/;
const HOST_PATTERN = /^(?=.{4,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;
const BLOCKED_SUFFIXES = [".localhost", ".local", ".internal", ".home.arpa", ".lan", ".corp", ".test", ".invalid", ".example"];

const RESPONSE_MESSAGES = {
  200: "Submitted. IndexNow received your URLs and will share them with participating search engines.",
  202: "Accepted. IndexNow received your URLs; key validation is still pending.",
  400: "Bad request. IndexNow rejected the request format.",
  403: "Key not valid. IndexNow could not find or match the key file on your site.",
  422: "Unprocessable. A URL does not belong to this host, or the key does not match the required format.",
  429: "Too many requests. IndexNow is rate-limiting this host; wait before submitting again.",
};

class InputError extends Error {}

function jsonResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
    body: JSON.stringify(body),
  };
}

function getClientIp(event) {
  const headers = event.headers || {};
  return (
    headers["x-nf-client-connection-ip"] ||
    headers["client-ip"] ||
    (headers["x-forwarded-for"] || "unknown").split(",")[0].trim()
  );
}

function isSameOrigin(event) {
  const headers = event.headers || {};
  const origin = headers.origin;
  const host = headers.host;
  if (!origin || !host) return true;
  try {
    return new URL(origin).host === host;
  } catch (_error) {
    return false;
  }
}

function isRateLimited(ip, now = Date.now()) {
  const existing = requestBuckets.get(ip);
  if (!existing || now - existing.startedAt > WINDOW_MS) {
    if (requestBuckets.size > 5000) requestBuckets.clear();
    requestBuckets.set(ip, { startedAt: now, count: 1 });
    return false;
  }
  existing.count += 1;
  return existing.count > MAX_REQUESTS_PER_WINDOW;
}

function normalizeHost(value) {
  if (typeof value !== "string") throw new InputError("Enter your website domain.");
  let host = value.trim().toLowerCase();
  if (/^https?:\/\//.test(host)) {
    try {
      host = new URL(host).hostname;
    } catch (_error) {
      throw new InputError("Enter a valid domain, such as example.com.");
    }
  }
  host = host.replace(/\/.*$/, "").replace(/\.$/, "");
  if (!HOST_PATTERN.test(host) || host === "localhost" || BLOCKED_SUFFIXES.some((suffix) => host.endsWith(suffix))) {
    throw new InputError("Enter a public domain name, such as example.com. IP addresses and local hosts are not supported.");
  }
  return host;
}

function normalizeKey(value) {
  const key = typeof value === "string" ? value.trim() : "";
  if (!KEY_PATTERN.test(key)) {
    throw new InputError("The key must be 8 to 128 characters using letters, numbers and dashes only.");
  }
  return key;
}

function keyLocationFor(host, key) {
  return `https://${host}/${key}.txt`;
}

function normalizeUrls(values, host) {
  if (!Array.isArray(values)) throw new InputError("Add at least one URL to submit.");
  const urls = [];
  const seen = new Set();
  for (const raw of values) {
    if (typeof raw !== "string" || !raw.trim()) continue;
    const value = raw.trim();
    if (value.length > MAX_URL_LENGTH) throw new InputError("One of the URLs is longer than 2,048 characters.");
    let url;
    try {
      url = new URL(value);
    } catch (_error) {
      throw new InputError(`This is not a full URL: ${value.slice(0, 120)}`);
    }
    if (!["https:", "http:"].includes(url.protocol)) throw new InputError(`Only http and https URLs can be submitted: ${value.slice(0, 120)}`);
    if (url.hostname.toLowerCase() !== host) throw new InputError(`Every URL must be on ${host}. This one is not: ${value.slice(0, 120)}`);
    url.hash = "";
    const normalized = url.toString();
    if (!seen.has(normalized)) {
      seen.add(normalized);
      urls.push(normalized);
    }
  }
  if (!urls.length) throw new InputError("Add at least one URL to submit.");
  if (urls.length > MAX_URLS) throw new InputError(`Submit up to ${MAX_URLS} URLs at a time.`);
  return urls;
}

function isPrivateAddress(address) {
  if (net.isIPv4(address)) {
    const [a, b] = address.split(".").map(Number);
    return (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 198 && (b === 18 || b === 19)) ||
      a >= 224
    );
  }
  if (net.isIPv6(address)) {
    const lower = address.toLowerCase();
    if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
    return lower === "::" || lower === "::1" || /^f[cd]/.test(lower) || /^fe[89ab]/.test(lower) || lower.startsWith("ff");
  }
  return true;
}

async function assertPublicHost(host, lookup = dns.lookup) {
  let records;
  try {
    records = await lookup(host, { all: true, verbatim: true });
  } catch (_error) {
    throw new InputError(`Could not find ${host}. Check the domain spelling.`);
  }
  if (!records.length || records.some((record) => isPrivateAddress(record.address))) {
    throw new InputError("This domain does not resolve to a public address.");
  }
}

async function readLimitedText(response) {
  if (!response.body || typeof response.body.getReader !== "function") {
    return (await response.text()).slice(0, KEY_FILE_MAX_BYTES);
  }
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (total < KEY_FILE_MAX_BYTES) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    total += value.length;
  }
  reader.cancel().catch(() => {});
  return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).toString("utf8").slice(0, KEY_FILE_MAX_BYTES);
}

async function verifyKeyFile({ host, key }, { fetchImpl = fetch, lookup } = {}) {
  const keyLocation = keyLocationFor(host, key);
  await assertPublicHost(host, lookup);

  let response;
  try {
    response = await fetchImpl(keyLocation, {
      method: "GET",
      redirect: "manual",
      headers: { "User-Agent": "IndexNow-Submitter/1.0 (+https://aisaaswithmustafa.com/tools/indexnow-submitter.html)" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    const timedOut = error && (error.name === "TimeoutError" || error.name === "AbortError");
    return {
      ok: false,
      keyLocation,
      message: timedOut ? "Your site took too long to return the key file." : "Could not connect to your site over HTTPS.",
    };
  }

  if (response.status >= 300 && response.status < 400) {
    return {
      ok: false,
      keyLocation,
      httpStatus: response.status,
      message: "The key file redirects to another address. Host it at the exact URL shown, on the same domain and protocol.",
    };
  }
  if (response.status !== 200) {
    return { ok: false, keyLocation, httpStatus: response.status, message: `The key file returned HTTP ${response.status}. Upload it to your site root.` };
  }

  const body = (await readLimitedText(response)).replace(/^﻿/, "").trim();
  if (body !== key) {
    return { ok: false, keyLocation, httpStatus: 200, message: "The file exists, but its content does not match the key. It must contain only the key." };
  }
  return { ok: true, keyLocation, httpStatus: 200, message: "Key file found and it matches." };
}

async function submitToIndexNow({ host, key, urls }, { fetchImpl = fetch } = {}) {
  const keyLocation = keyLocationFor(host, key);
  const response = await fetchImpl(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify({ host, key, keyLocation, urlList: urls }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS * 2),
  });
  const status = response.status;
  return {
    ok: status === 200 || status === 202,
    httpStatus: status,
    message: RESPONSE_MESSAGES[status] || `IndexNow returned HTTP ${status}.`,
    keyLocation,
    submitted: status === 200 || status === 202 ? urls.length : 0,
  };
}

function createHandler({ fetchImpl = fetch, lookup } = {}) {
  return async function handler(event) {
    if (event.httpMethod !== "POST") return jsonResponse(405, { error: "Method not allowed." });
    if (!isSameOrigin(event)) return jsonResponse(403, { error: "Request origin is not allowed." });
    if (isRateLimited(getClientIp(event))) {
      return jsonResponse(429, { error: "Too many requests from this connection. Please wait a few minutes." });
    }
    if ((event.body || "").length > 300000) return jsonResponse(413, { error: "The request is too large." });

    let payload;
    try {
      payload = JSON.parse(event.body || "{}");
    } catch (_error) {
      return jsonResponse(400, { error: "Invalid request." });
    }

    try {
      const action = payload.action === "submit" ? "submit" : payload.action === "verify" ? "verify" : null;
      if (!action) throw new InputError("Unknown action.");
      const host = normalizeHost(payload.host);
      const key = normalizeKey(payload.key);
      const urls = action === "submit" ? normalizeUrls(payload.urls, host) : [];

      const verification = await verifyKeyFile({ host, key }, { fetchImpl, lookup });
      if (action === "verify" || !verification.ok) {
        return jsonResponse(200, { action, verification });
      }

      const submission = await submitToIndexNow({ host, key, urls }, { fetchImpl });
      return jsonResponse(200, { action, verification, submission });
    } catch (error) {
      if (error instanceof InputError) return jsonResponse(400, { error: error.message });
      console.error("IndexNow relay failed", error && error.name ? error.name : "Error");
      return jsonResponse(502, { error: "IndexNow could not be reached right now. Please try again." });
    }
  };
}

exports.handler = createHandler();
exports._test = {
  InputError,
  MAX_URLS,
  createHandler,
  isPrivateAddress,
  isRateLimited,
  keyLocationFor,
  normalizeHost,
  normalizeKey,
  normalizeUrls,
  requestBuckets,
  verifyKeyFile,
};
