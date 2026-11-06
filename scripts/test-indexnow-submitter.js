const assert = require("assert");
const { _test } = require("../netlify/functions/indexnow-submit");

const {
  InputError,
  MAX_URLS,
  createHandler,
  isPrivateAddress,
  normalizeHost,
  normalizeKey,
  normalizeUrls,
  requestBuckets,
} = _test;

const KEY = "a1b2c3d4e5f60718293a4b5c6d7e8f90";
const HOST = "example-store.com";
const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

// Host validation
assert.strictEqual(normalizeHost("Example-Store.com"), HOST);
assert.strictEqual(normalizeHost("https://example-store.com/blog/post"), HOST);
assert.strictEqual(normalizeHost("www.example-store.com/"), `www.${HOST}`);
for (const bad of ["localhost", "127.0.0.1", "10.0.0.5", "[::1]", "printer.local", "app.internal", "nodot", "", "http://", "a_b.com"]) {
  assert.throws(() => normalizeHost(bad), InputError, `host should be rejected: ${bad}`);
}

// Key validation
assert.strictEqual(normalizeKey(` ${KEY} `), KEY);
for (const bad of ["short", "has space key 123", "x".repeat(129), "abc_defgh", undefined]) {
  assert.throws(() => normalizeKey(bad), InputError, `key should be rejected: ${bad}`);
}

// URL validation
assert.deepStrictEqual(
  normalizeUrls([`https://${HOST}/a#top`, `https://${HOST}/a`, " ", `http://${HOST}/b`], HOST),
  [`https://${HOST}/a`, `http://${HOST}/b`],
);
assert.throws(() => normalizeUrls([`https://other.com/a`], HOST), /must be on/);
assert.throws(() => normalizeUrls(["/relative"], HOST), /not a full URL/);
assert.throws(() => normalizeUrls([`ftp://${HOST}/a`], HOST), /Only http and https/);
assert.throws(() => normalizeUrls([], HOST), /at least one URL/);
assert.throws(
  () => normalizeUrls(Array.from({ length: MAX_URLS + 1 }, (_, i) => `https://${HOST}/p${i}`), HOST),
  /up to 100/,
);

// Private address detection
for (const address of ["10.1.2.3", "127.0.0.1", "169.254.169.254", "172.20.0.1", "192.168.1.1", "100.64.0.1", "::1", "fd00::1", "fe80::1", "::ffff:10.0.0.1"]) {
  assert.ok(isPrivateAddress(address), `${address} should be private`);
}
for (const address of ["93.184.216.34", "8.8.8.8", "2606:4700::1111"]) {
  assert.ok(!isPrivateAddress(address), `${address} should be public`);
}

function event(body, headers = {}) {
  return {
    httpMethod: "POST",
    headers: { host: "aisaaswithmustafa.com", origin: "https://aisaaswithmustafa.com", "x-nf-client-connection-ip": `ip-${Math.random()}`, ...headers },
    body: JSON.stringify(body),
  };
}

function textResponse(status, text) {
  return { status, ok: status >= 200 && status < 300, text: async () => text, body: null };
}

function mockFetch({ keyStatus = 200, keyBody = KEY, indexNowStatus = 202 } = {}) {
  const calls = [];
  const impl = async (url, options = {}) => {
    calls.push({ url, options });
    if (url === `https://${HOST}/${KEY}.txt`) return textResponse(keyStatus, keyBody);
    if (url === "https://api.indexnow.org/indexnow") return textResponse(indexNowStatus, "");
    throw new Error(`Unexpected fetch: ${url}`);
  };
  impl.calls = calls;
  return impl;
}

async function call(handler, body, headers) {
  const response = await handler(event(body, headers));
  return { statusCode: response.statusCode, body: JSON.parse(response.body) };
}

(async () => {
  // Verify succeeds and does not submit
  let fetchImpl = mockFetch();
  let handler = createHandler({ fetchImpl, lookup: publicLookup });
  let result = await call(handler, { action: "verify", host: HOST, key: KEY });
  assert.strictEqual(result.statusCode, 200);
  assert.strictEqual(result.body.verification.ok, true);
  assert.strictEqual(fetchImpl.calls.length, 1);
  assert.strictEqual(fetchImpl.calls[0].options.redirect, "manual");

  // Wrong key content blocks the submission
  fetchImpl = mockFetch({ keyBody: "something-else" });
  handler = createHandler({ fetchImpl, lookup: publicLookup });
  result = await call(handler, { action: "submit", host: HOST, key: KEY, urls: [`https://${HOST}/`] });
  assert.strictEqual(result.body.verification.ok, false);
  assert.match(result.body.verification.message, /does not match/);
  assert.strictEqual(result.body.submission, undefined);
  assert.strictEqual(fetchImpl.calls.length, 1);

  // Redirects and missing files are reported
  for (const [status, pattern] of [[301, /redirects/], [404, /HTTP 404/]]) {
    handler = createHandler({ fetchImpl: mockFetch({ keyStatus: status }), lookup: publicLookup });
    result = await call(handler, { action: "verify", host: HOST, key: KEY });
    assert.match(result.body.verification.message, pattern);
  }

  // Successful submission sends the IndexNow payload
  fetchImpl = mockFetch({ indexNowStatus: 200 });
  handler = createHandler({ fetchImpl, lookup: publicLookup });
  result = await call(handler, { action: "submit", host: HOST, key: KEY, urls: [`https://${HOST}/`, `https://${HOST}/blog/new.html`] });
  assert.strictEqual(result.body.submission.ok, true);
  assert.strictEqual(result.body.submission.httpStatus, 200);
  assert.strictEqual(result.body.submission.submitted, 2);
  const payload = JSON.parse(fetchImpl.calls[1].options.body);
  assert.deepStrictEqual(payload, {
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: [`https://${HOST}/`, `https://${HOST}/blog/new.html`],
  });

  // IndexNow error codes are explained
  handler = createHandler({ fetchImpl: mockFetch({ indexNowStatus: 422 }), lookup: publicLookup });
  result = await call(handler, { action: "submit", host: HOST, key: KEY, urls: [`https://${HOST}/`] });
  assert.strictEqual(result.body.submission.ok, false);
  assert.match(result.body.submission.message, /does not belong/);

  // Private DNS answers are refused before any fetch
  fetchImpl = mockFetch();
  handler = createHandler({ fetchImpl, lookup: async () => [{ address: "10.0.0.8", family: 4 }] });
  result = await call(handler, { action: "verify", host: HOST, key: KEY });
  assert.strictEqual(result.statusCode, 400);
  assert.strictEqual(fetchImpl.calls.length, 0);

  // Request guards
  handler = createHandler({ fetchImpl: mockFetch(), lookup: publicLookup });
  assert.strictEqual((await handler({ httpMethod: "GET", headers: {} })).statusCode, 405);
  result = await call(handler, { action: "verify", host: HOST, key: KEY }, { origin: "https://evil.example.net" });
  assert.strictEqual(result.statusCode, 403);
  result = await call(handler, { action: "delete", host: HOST, key: KEY });
  assert.strictEqual(result.statusCode, 400);

  requestBuckets.clear();
  const ipHeaders = { "x-nf-client-connection-ip": "203.0.113.9" };
  let last;
  for (let i = 0; i < 21; i += 1) last = await call(handler, { action: "verify", host: HOST, key: KEY }, ipHeaders);
  assert.strictEqual(last.statusCode, 429);

  console.log("IndexNow Submitter relay tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
