const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { INDEXNOW_ENDPOINT, INDEXNOW_KEY, KEY_LOCATION } = require("./submit-indexnow");
const {
  fileToCandidateUrls,
  runIndexNow,
  selectChangedUrls,
  sitemapUrls,
} = require("../netlify/plugins/indexnow/changed-urls");
const plugin = require("../netlify/plugins/indexnow");

const ORIGIN = "https://aisaaswithmustafa.com";
const sitemapXml = `
  <url><loc>${ORIGIN}/</loc><lastmod>2026-11-06</lastmod></url>
  <url><loc>${ORIGIN}/portfolio.html</loc><lastmod>2026-11-06</lastmod></url>
  <url><loc>${ORIGIN}/blog/index.html</loc><lastmod>2026-11-06</lastmod></url>
  <url><loc>${ORIGIN}/tools/complexity-coach/</loc><lastmod>2026-11-06</lastmod></url>
  <url><loc>${ORIGIN}/blog/example.html</loc><lastmod>2026-11-06</lastmod></url>
`;
const indexable = sitemapUrls(sitemapXml);

assert.deepStrictEqual(fileToCandidateUrls("index.html"), [`${ORIGIN}/index.html`, `${ORIGIN}/`]);
assert.deepStrictEqual(fileToCandidateUrls("tools/complexity-coach/index.html"), [
  `${ORIGIN}/tools/complexity-coach/index.html`,
  `${ORIGIN}/tools/complexity-coach/`,
]);
assert.deepStrictEqual(fileToCandidateUrls("assets/css/style.css"), []);

assert.deepStrictEqual(
  selectChangedUrls(
    [
      "index.html",
      "blog/index.html",
      "blog/example.html",
      "blog/_template.html",
      "thanks.html",
      "tools/complexity-coach/index.html",
      "assets/css/tailwind.css",
      "sitemap.xml",
    ],
    indexable,
  ),
  [`${ORIGIN}/`, `${ORIGIN}/blog/index.html`, `${ORIGIN}/blog/example.html`, `${ORIGIN}/tools/complexity-coach/`],
);

const production = { CONTEXT: "production", CACHED_COMMIT_REF: "aaa111", COMMIT_REF: "bbb222" };
const readSitemap = () => sitemapXml;
const listFiles = () => ["portfolio.html", "assets/js/style.js"];

function mockFetchFactory(calls) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    if (url === KEY_LOCATION) return { ok: true, status: 200, text: async () => INDEXNOW_KEY };
    if (url === INDEXNOW_ENDPOINT) return { ok: true, status: 202, text: async () => "" };
    throw new Error(`Unexpected URL: ${url}`);
  };
}

function statusRecorder() {
  const shown = [];
  return { shown, utils: { status: { show: (status) => shown.push(status) } } };
}

(async () => {
  for (const context of ["branch-deploy", "deploy-preview", undefined]) {
    const result = await runIndexNow({ env: { ...production, CONTEXT: context }, readSitemap, listFiles });
    assert.match(result.skipped, /not production/);
  }

  assert.match(
    (await runIndexNow({ env: { ...production, CACHED_COMMIT_REF: "bbb222" }, readSitemap, listFiles })).skipped,
    /no new commit/,
  );
  assert.match(
    (await runIndexNow({ env: { CONTEXT: "production" }, readSitemap, listFiles })).skipped,
    /references are missing/,
  );
  assert.match(
    (await runIndexNow({ env: production, readSitemap, listFiles: () => ["assets/css/style.css"] })).skipped,
    /no page in sitemap.xml changed/,
  );

  const dryCalls = [];
  const dryRun = await runIndexNow({
    env: { ...production, INDEXNOW_DRY_RUN: "true" },
    fetchImpl: mockFetchFactory(dryCalls),
    readSitemap,
    listFiles,
  });
  assert.deepStrictEqual(dryRun, { dryRun: true, urls: [`${ORIGIN}/portfolio.html`] });
  assert.strictEqual(dryCalls.length, 0);

  const calls = [];
  const submitted = await runIndexNow({ env: production, fetchImpl: mockFetchFactory(calls), readSitemap, listFiles });
  assert.deepStrictEqual(submitted, { status: 202, urls: [`${ORIGIN}/portfolio.html`] });
  assert.strictEqual(calls[0].url, KEY_LOCATION);
  assert.deepStrictEqual(JSON.parse(calls[1].options.body).urlList, [`${ORIGIN}/portfolio.html`]);

  // The real sitemap must parse, and every entry must be an accepted URL.
  const realSitemap = fs.readFileSync(path.join(__dirname, "..", "sitemap.xml"), "utf8");
  const realUrls = sitemapUrls(realSitemap);
  assert.ok(realUrls.size > 0);
  assert.ok(realUrls.has(`${ORIGIN}/`));

  // The plugin must never throw, even when git cannot resolve a commit.
  const previousEnv = { ...process.env };
  Object.assign(process.env, { CONTEXT: "production", CACHED_COMMIT_REF: "0000000", COMMIT_REF: "HEAD" });
  const recorder = statusRecorder();
  await plugin.onSuccess({ utils: recorder.utils });
  assert.match(recorder.shown[0].summary, /^Not submitted:/);
  process.env = previousEnv;

  console.log("IndexNow plugin tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
