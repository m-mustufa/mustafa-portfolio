const assert = require("assert");
const fs = require("fs");
const path = require("path");
const {
  INDEXNOW_ENDPOINT,
  INDEXNOW_KEY,
  KEY_LOCATION,
  extractSitemapEntries,
  parseArgs,
  submitUrls,
  validateUrl,
} = require("./submit-indexnow");

const args = parseArgs([
  "--url",
  "https://aisaaswithmustafa.com/blog/example.html",
  "--sitemap",
  "--since",
  "2026-11-04",
  "--submit",
]);
assert.deepStrictEqual(args.urls, ["https://aisaaswithmustafa.com/blog/example.html"]);
assert.strictEqual(args.sitemap, true);
assert.strictEqual(args.since, "2026-11-04");
assert.strictEqual(args.submit, true);

const equalsArgs = parseArgs([
  "--url=https://aisaaswithmustafa.com/blog/example.html",
  "--sitemap",
  "--since=2026-11-04",
]);
assert.deepStrictEqual(equalsArgs.urls, ["https://aisaaswithmustafa.com/blog/example.html"]);
assert.strictEqual(equalsArgs.since, "2026-11-04");

assert.strictEqual(
  fs.readFileSync(path.join(__dirname, "..", `${INDEXNOW_KEY}.txt`), "utf8").trim(),
  INDEXNOW_KEY,
);

assert.deepStrictEqual(
  extractSitemapEntries(`
    <url><loc>https://aisaaswithmustafa.com/a.html</loc><lastmod>2026-11-03</lastmod></url>
    <url><loc>https://aisaaswithmustafa.com/b.html</loc><lastmod>2026-11-04</lastmod></url>
  `),
  [
    { url: "https://aisaaswithmustafa.com/a.html", lastmod: "2026-11-03" },
    { url: "https://aisaaswithmustafa.com/b.html", lastmod: "2026-11-04" },
  ],
);

assert.strictEqual(
  validateUrl("https://aisaaswithmustafa.com/blog/example.html#section"),
  "https://aisaaswithmustafa.com/blog/example.html",
);
assert.throws(() => validateUrl("http://aisaaswithmustafa.com/blog/example.html"), /Only HTTPS URLs/);
assert.throws(() => validateUrl("https://example.com/blog/example.html"), /Only HTTPS URLs/);

const calls = [];
async function mockFetch(url, options = {}) {
  calls.push({ url, options });
  if (url === KEY_LOCATION) {
    return { ok: true, status: 200, text: async () => INDEXNOW_KEY };
  }
  if (url === INDEXNOW_ENDPOINT) {
    return { ok: true, status: 202, text: async () => "" };
  }
  throw new Error(`Unexpected URL: ${url}`);
}

(async () => {
  const urlList = ["https://aisaaswithmustafa.com/blog/example.html"];
  const status = await submitUrls(urlList, mockFetch);
  assert.strictEqual(status, 202);
  assert.strictEqual(calls.length, 2);
  assert.strictEqual(calls[0].url, KEY_LOCATION);
  const payload = JSON.parse(calls[1].options.body);
  assert.deepStrictEqual(payload, {
    host: "aisaaswithmustafa.com",
    key: INDEXNOW_KEY,
    keyLocation: KEY_LOCATION,
    urlList,
  });
  console.log("IndexNow submission tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
