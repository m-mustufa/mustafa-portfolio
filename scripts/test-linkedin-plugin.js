// Tests for netlify/plugins/linkedin with a mocked LinkedIn API. Nothing is
// ever sent to LinkedIn from these tests.
const assert = require("assert");
const {
  DEFAULT_API_VERSION,
  detectNewPosts,
  detectNewTools,
  escapeLittle,
  postCommentary,
  runLinkedIn,
  toHashtag,
  tokenWarning,
} = require("../netlify/plugins/linkedin/linkedin");
const plugin = require("../netlify/plugins/linkedin");

const ORIGIN = "https://aisaaswithmustafa.com";
const TOKEN = "test-token-abc123";

// --- Text helpers -----------------------------------------------------------
assert.strictEqual(escapeLittle("Guide (2026) [beta] @you"), "Guide \\(2026\\) \\[beta\\] \\@you");
assert.strictEqual(escapeLittle("Use #SEO and # alone"), "Use #SEO and \\# alone");
assert.strictEqual(escapeLittle("a_b*c~d"), "a\\_b\\*c\\~d");
assert.strictEqual(toHashtag("Submit Site to Bing"), "#SubmitSiteToBing");
assert.strictEqual(toHashtag("Next.js"), "#NextJs");
assert.strictEqual(toHashtag("!!!"), "");

const samplePost = {
  slug: "new-post",
  title: "How to Submit Your Site to Bing (2026 Guide)",
  metaDescription: "Verify, add a key and automate pings.",
  heroImageFile: "new-post-hero.jpg",
  socialImageFile: "new-post-social.jpg",
  tags: ["IndexNow", "Technical SEO", "Netlify", "Extra"],
};
const commentary = postCommentary(samplePost);
assert.ok(commentary.includes("\\(2026 Guide\\)"), "reserved characters are escaped");
assert.ok(commentary.endsWith("#IndexNow #TechnicalSEO #Netlify"), "at most three hashtags");
assert.strictEqual(
  postCommentary({ ...samplePost, linkedinText: "My own words (short). #SEO" }),
  "My own words \\(short\\). #SEO",
  "a hand-written linkedinText wins over the template",
);

// --- Detection --------------------------------------------------------------
assert.deepStrictEqual(
  detectNewPosts([{ slug: "old" }], [{ slug: "new-post" }, { slug: "old" }]).map((p) => p.slug),
  ["new-post"],
);

const toolHtml = `<meta property="og:title" content="AI API Cost &amp; Profit Calculator">
<meta property="og:description" content="Model token costs.">
<meta property="og:image" content="${ORIGIN}/assets/img/tool-card.jpg">`;
const tools = detectNewTools(
  ["tools/ai-api-cost-calculator.html", "tools/index.html", "tools/draft.html", "assets/x.js"],
  new Set([`${ORIGIN}/tools/ai-api-cost-calculator.html`, `${ORIGIN}/tools/index.html`]),
  () => toolHtml,
);
assert.deepStrictEqual(tools, [
  {
    kind: "tool",
    url: `${ORIGIN}/tools/ai-api-cost-calculator.html`,
    title: "AI API Cost & Profit Calculator",
    description: "Model token costs.",
    imagePath: "assets/img/tool-card.jpg",
  },
]);

assert.strictEqual(tokenWarning({ LINKEDIN_TOKEN_CREATED: "2026-11-01" }, new Date("2026-11-20")), "");
assert.ok(tokenWarning({ LINKEDIN_TOKEN_CREATED: "2026-09-01" }, new Date("2026-11-01")).includes("61 days"));

// --- runLinkedIn ------------------------------------------------------------
const sitemap = `<url><loc>${ORIGIN}/blog/new-post.html</loc></url><url><loc>${ORIGIN}/tools/ai-api-cost-calculator.html</loc></url>`;
const files = {
  "blog/posts.json": JSON.stringify([samplePost, { slug: "old" }]),
  "sitemap.xml": sitemap,
  "tools/ai-api-cost-calculator.html": toolHtml,
};
const readFile = (file) => files[file];
const readBinary = () => Buffer.from("jpeg-bytes");
function gitFactory({ oldManifest = JSON.stringify([{ slug: "old" }]), added = "" } = {}) {
  return (args) => {
    if (args[0] === "show") {
      if (oldManifest === null) throw new Error("bad ref");
      return oldManifest;
    }
    if (args[0] === "diff") return added;
    throw new Error(`unexpected git ${args.join(" ")}`);
  };
}
const baseEnv = {
  CONTEXT: "production",
  CACHED_COMMIT_REF: "aaa111",
  COMMIT_REF: "bbb222",
  LINKEDIN_AUTO_POST: "true",
  LINKEDIN_ACCESS_TOKEN: TOKEN,
};

function response(status, { json, text = "", headers = {} } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => json,
    text: async () => text,
    headers: { get: (name) => headers[name.toLowerCase()] },
  };
}

function mockLinkedIn(calls, overrides = {}) {
  return async (url, options = {}) => {
    calls.push({ url, options });
    if (overrides[url]) return overrides[url]();
    if (url === "https://api.linkedin.com/v2/userinfo") return response(200, { json: { sub: "abc123" } });
    if (url === "https://api.linkedin.com/rest/images?action=initializeUpload") {
      return response(200, { json: { value: { uploadUrl: "https://upload.example/u1", image: "urn:li:image:IMG1" } } });
    }
    if (url === "https://upload.example/u1") return response(201);
    if (url === "https://api.linkedin.com/rest/posts") return response(201, { headers: { "x-restli-id": "urn:li:share:999" } });
    throw new Error(`Unexpected URL ${url}`);
  };
}

(async () => {
  const noCalls = async () => { throw new Error("must not call LinkedIn"); };
  const common = { gitImpl: gitFactory(), readFile, readBinary, fetchImpl: noCalls };

  // Guard rails: nothing is sent in these cases.
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, CONTEXT: "branch-deploy" } })).skipped);
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, LINKEDIN_AUTO_POST: "" } })).skipped.includes("LINKEDIN_AUTO_POST"));
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, COMMIT_REF: "aaa111" } })).skipped.includes("no new commit"));
  assert.ok(
    (await runLinkedIn({ ...common, gitImpl: gitFactory({ oldManifest: null }), env: baseEnv })).skipped.includes("previous blog manifest"),
    "an unreadable old manifest never makes every post look new",
  );
  assert.ok(
    (await runLinkedIn({ ...common, gitImpl: gitFactory({ oldManifest: files["blog/posts.json"] }), env: baseEnv })).skipped.includes("no new blog post"),
  );
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, LINKEDIN_ACCESS_TOKEN: "" } })).skipped.includes("LINKEDIN_ACCESS_TOKEN"));

  // Dry run: shows what would be shared, makes no API call.
  const dry = await runLinkedIn({
    ...common,
    gitImpl: gitFactory({ added: "tools/ai-api-cost-calculator.html\n" }),
    env: { ...baseEnv, LINKEDIN_DRY_RUN: "true", LINKEDIN_ACCESS_TOKEN: "" },
  });
  assert.strictEqual(dry.dryRun, true);
  assert.strictEqual(dry.items.length, 1, "one post per deploy");
  assert.strictEqual(dry.items[0].url, `${ORIGIN}/blog/new-post.html`, "the new blog post comes first");
  assert.deepStrictEqual(dry.extra, [`${ORIGIN}/tools/ai-api-cost-calculator.html`]);

  // While dry run is on, every deploy checks the token with a read-only call.
  const checkCalls = [];
  const checked = await runLinkedIn({
    ...common,
    fetchImpl: mockLinkedIn(checkCalls, {
      "https://api.linkedin.com/v2/userinfo": () => response(200, { json: { sub: "abc123", name: "Muhammad Mustafa" } }),
    }),
    gitImpl: gitFactory({ oldManifest: files["blog/posts.json"] }),
    env: { ...baseEnv, LINKEDIN_DRY_RUN: "true" },
  });
  assert.ok(checked.skipped.includes("no new blog post"));
  assert.strictEqual(checked.tokenStatus, "token check: OK, connected as Muhammad Mustafa");
  assert.deepStrictEqual(checkCalls.map((c) => c.url), ["https://api.linkedin.com/v2/userinfo"], "only the read-only check");
  const badCheck = await runLinkedIn({
    ...common,
    fetchImpl: mockLinkedIn([], { "https://api.linkedin.com/v2/userinfo": () => response(401, { text: TOKEN }) }),
    gitImpl: gitFactory({ oldManifest: files["blog/posts.json"] }),
    env: { ...baseEnv, LINKEDIN_DRY_RUN: "true" },
  });
  assert.ok(badCheck.tokenStatus.includes("expired or invalid"));
  assert.ok(!badCheck.tokenStatus.includes(TOKEN));

  // Full share with the mocked API.
  const calls = [];
  const result = await runLinkedIn({ ...common, fetchImpl: mockLinkedIn(calls), env: baseEnv });
  assert.deepStrictEqual(result.posted, [{ url: `${ORIGIN}/blog/new-post.html`, postId: "urn:li:share:999" }]);
  assert.deepStrictEqual(
    calls.map((c) => c.url),
    [
      "https://api.linkedin.com/v2/userinfo",
      "https://api.linkedin.com/rest/images?action=initializeUpload",
      "https://upload.example/u1",
      "https://api.linkedin.com/rest/posts",
    ],
  );
  const init = calls[1].options;
  assert.strictEqual(init.headers["LinkedIn-Version"], DEFAULT_API_VERSION);
  assert.strictEqual(init.headers["X-Restli-Protocol-Version"], "2.0.0");
  assert.deepStrictEqual(JSON.parse(init.body), { initializeUploadRequest: { owner: "urn:li:person:abc123" } });
  assert.strictEqual(calls[2].options.method, "PUT");
  assert.strictEqual(calls[2].options.headers["Content-Type"], "image/jpeg");
  const body = JSON.parse(calls[3].options.body);
  assert.strictEqual(body.author, "urn:li:person:abc123");
  assert.strictEqual(body.visibility, "PUBLIC");
  assert.strictEqual(body.lifecycleState, "PUBLISHED");
  assert.deepStrictEqual(body.content.article, {
    source: `${ORIGIN}/blog/new-post.html`,
    title: samplePost.title,
    description: samplePost.metaDescription,
    thumbnail: "urn:li:image:IMG1",
  });

  // A failed thumbnail upload still shares the post, without an image.
  const thumbCalls = [];
  const noThumb = await runLinkedIn({
    ...common,
    fetchImpl: mockLinkedIn(thumbCalls, {
      "https://api.linkedin.com/rest/images?action=initializeUpload": () => response(500, { text: "boom" }),
    }),
    env: baseEnv,
  });
  assert.strictEqual(noThumb.posted.length, 1);
  assert.ok(noThumb.notes[0].startsWith("Thumbnail skipped"));
  assert.strictEqual(JSON.parse(thumbCalls.at(-1).options.body).content.article.thumbnail, undefined);

  // An expired token gives a clear message that never contains the token.
  let expiredError;
  try {
    await runLinkedIn({
      ...common,
      fetchImpl: mockLinkedIn([], {
        "https://api.linkedin.com/v2/userinfo": () => response(401, { text: `bad token ${TOKEN}` }),
      }),
      env: baseEnv,
    });
  } catch (error) {
    expiredError = error;
  }
  assert.ok(expiredError && expiredError.message.includes("expired or invalid"));
  assert.ok(!expiredError.message.includes(TOKEN), "the token is never echoed");

  // The plugin never throws, even when everything fails.
  const shown = [];
  const savedEnv = { ...process.env };
  Object.assign(process.env, { CONTEXT: "branch-deploy" });
  await plugin.onSuccess({ utils: { status: { show: (s) => shown.push(s) } } });
  process.env = savedEnv;
  assert.strictEqual(shown.length, 1);
  assert.ok(shown[0].summary.startsWith("Skipped"));

  console.log("LinkedIn plugin tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
