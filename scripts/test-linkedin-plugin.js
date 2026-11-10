// Tests for netlify/plugins/linkedin with a mocked LinkedIn API. Nothing is
// ever sent to LinkedIn from these tests.
const assert = require("assert");
const {
  DEFAULT_API_VERSION,
  buildCommentary,
  detectNewPosts,
  detectNewTools,
  escapeLittle,
  pageImage,
  runLinkedIn,
  toHashtag,
  tokenWarning,
  validateEntry,
} = require("../netlify/plugins/linkedin/linkedin");
const plugin = require("../netlify/plugins/linkedin");

const ORIGIN = "https://aisaaswithmustafa.com";
const TOKEN = "test-token-abc123";

// --- Text helpers -----------------------------------------------------------
assert.strictEqual(escapeLittle("Guide (2026) [beta] @you"), "Guide \\(2026\\) \\[beta\\] \\@you");
assert.strictEqual(escapeLittle("Use #SEO and # alone"), "Use #SEO and \\# alone");
assert.strictEqual(escapeLittle("a_b*c~d"), "a\\_b\\*c\\~d");
assert.strictEqual(toHashtag("Submit Site to Bing"), "#SubmitSiteToBing");
assert.strictEqual(toHashtag("NextJs"), "#NextJs");
assert.strictEqual(toHashtag("!!!"), "");

const entry = {
  hook: "Most sites wait for Bing to find new pages (mine doesn't).",
  intro: "A step-by-step guide to IndexNow on a static Netlify site.",
  points: ["Verify in Bing Webmaster Tools", "Host the key file", "Ping only changed URLs"],
  hashtags: ["SEO", "#IndexNow", "Bing", "Netlify"],
};
assert.deepStrictEqual(validateEntry(entry), []);
assert.ok(validateEntry({ ...entry, points: ["only one"] })[0].includes("points"));
assert.ok(validateEntry({ ...entry, hashtags: ["SEO", "Two words"] })[0].includes("hashtags"));
assert.ok(validateEntry({ ...entry, hook: "Fast — really" }).some((p) => p.includes("em dash")));
assert.deepStrictEqual(validateEntry(undefined), ["entry is missing"]);

const postUrl = `${ORIGIN}/blog/new-post.html`;
assert.strictEqual(
  buildCommentary(entry, { kind: "post", url: postUrl }),
  [
    "Most sites wait for Bing to find new pages \\(mine doesn't\\).",
    "A step-by-step guide to IndexNow on a static Netlify site.",
    "",
    "→ Verify in Bing Webmaster Tools",
    "→ Host the key file",
    "→ Ping only changed URLs",
    "",
    "Read the guide:",
    postUrl,
    "",
    "#SEO #IndexNow #Bing #Netlify",
  ].join("\n"),
  "the fixed format, with the link inside the text",
);
assert.ok(buildCommentary(entry, { kind: "tool", url: postUrl }).includes("Try it free:"));
assert.ok(buildCommentary({ ...entry, cta: "Get the checklist" }, { kind: "post", url: postUrl }).includes("Get the checklist:"));

// --- Detection and the OG image --------------------------------------------
assert.deepStrictEqual(
  detectNewPosts([{ slug: "old" }], [{ slug: "new-post" }, { slug: "old" }]).map((p) => p.slug),
  ["new-post"],
);
assert.deepStrictEqual(
  detectNewTools(
    ["tools/ai-api-cost-calculator.html", "tools/index.html", "tools/draft.html", "assets/x.js"],
    new Set([`${ORIGIN}/tools/ai-api-cost-calculator.html`, `${ORIGIN}/tools/index.html`]),
  ),
  [{ kind: "tool", url: `${ORIGIN}/tools/ai-api-cost-calculator.html`, file: "tools/ai-api-cost-calculator.html" }],
);
const pageHtml = (image) => `<meta property="og:title" content="Cost &amp; Profit">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="Share card for the guide">`;
assert.deepStrictEqual(pageImage(pageHtml(`${ORIGIN}/blog/images/new-post-social.jpg`)), {
  imagePath: "blog/images/new-post-social.jpg",
  imageAlt: "Share card for the guide",
});
assert.strictEqual(pageImage(pageHtml("https://cdn.example/x.jpg")).imagePath, "", "only images hosted on this site");

assert.strictEqual(tokenWarning({ LINKEDIN_TOKEN_CREATED: "2026-11-01" }, new Date("2026-11-20")), "");
assert.ok(tokenWarning({ LINKEDIN_TOKEN_CREATED: "2026-09-01" }, new Date("2026-11-01")).includes("61 days"));

// --- runLinkedIn ------------------------------------------------------------
const toolUrl = `${ORIGIN}/tools/ai-api-cost-calculator.html`;
const baseFiles = {
  "blog/posts.json": JSON.stringify([{ slug: "new-post" }, { slug: "old" }]),
  "sitemap.xml": `<url><loc>${postUrl}</loc></url><url><loc>${toolUrl}</loc></url>`,
  "blog/new-post.html": pageHtml(`${ORIGIN}/blog/images/new-post-social.jpg`),
  "tools/ai-api-cost-calculator.html": pageHtml(`${ORIGIN}/assets/img/tool-card.jpg`),
  "social/linkedin.json": JSON.stringify({
    "/blog/new-post.html": entry,
    "/tools/ai-api-cost-calculator.html": { ...entry, hook: "A free calculator for AI API costs." },
  }),
};
function readerFor(files) {
  return (file) => {
    if (!(file in files)) throw new Error(`ENOENT ${file}`);
    return files[file];
  };
}
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
    if (url === "https://api.linkedin.com/v2/userinfo") return response(200, { json: { sub: "abc123", name: "Muhammad Mustafa" } });
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
  const common = { gitImpl: gitFactory(), readFile: readerFor(baseFiles), readBinary, fetchImpl: noCalls };

  // Guard rails: nothing is sent in these cases.
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, CONTEXT: "branch-deploy" } })).skipped);
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, LINKEDIN_AUTO_POST: "" } })).skipped.includes("LINKEDIN_AUTO_POST"));
  assert.ok((await runLinkedIn({ ...common, env: { ...baseEnv, COMMIT_REF: "aaa111" } })).skipped.includes("no new commit"));
  assert.ok(
    (await runLinkedIn({ ...common, gitImpl: gitFactory({ oldManifest: null }), env: baseEnv })).skipped.includes("previous blog manifest"),
    "an unreadable old manifest never makes every post look new",
  );
  assert.ok(
    (await runLinkedIn({ ...common, gitImpl: gitFactory({ oldManifest: baseFiles["blog/posts.json"] }), env: baseEnv })).skipped.includes("no new blog post"),
  );

  // No hand-written text means no post, and the reason is reported.
  const noText = await runLinkedIn({
    ...common,
    readFile: readerFor({ ...baseFiles, "social/linkedin.json": "{}" }),
    env: baseEnv,
  });
  assert.ok(noText.skipped.includes("no complete LinkedIn text"));
  assert.ok(noText.notReady[0].includes("no LinkedIn text in social/linkedin.json"));
  const noImage = await runLinkedIn({
    ...common,
    readFile: readerFor({ ...baseFiles, "blog/new-post.html": pageHtml("https://cdn.example/x.jpg") }),
    env: baseEnv,
  });
  assert.ok(noImage.notReady[0].includes("og:image"));

  // Dry run: shows what would be shared, makes no API call without a token.
  const dry = await runLinkedIn({
    ...common,
    gitImpl: gitFactory({ added: "tools/ai-api-cost-calculator.html\n" }),
    env: { ...baseEnv, LINKEDIN_DRY_RUN: "true", LINKEDIN_ACCESS_TOKEN: "" },
  });
  assert.strictEqual(dry.dryRun, true);
  assert.strictEqual(dry.items.length, 1, "one post per deploy");
  assert.strictEqual(dry.items[0].url, postUrl, "the new blog post comes first");
  assert.strictEqual(dry.items[0].imagePath, "blog/images/new-post-social.jpg", "the page's OG image");
  assert.deepStrictEqual(dry.extra, [toolUrl]);
  assert.ok(dry.tokenStatus.includes("not set"));

  // While dry run is on, every deploy checks the token with a read-only call.
  const checkCalls = [];
  const checked = await runLinkedIn({
    ...common,
    fetchImpl: mockLinkedIn(checkCalls),
    gitImpl: gitFactory({ oldManifest: baseFiles["blog/posts.json"] }),
    env: { ...baseEnv, LINKEDIN_DRY_RUN: "true" },
  });
  assert.ok(checked.skipped.includes("no new blog post"));
  assert.strictEqual(checked.tokenStatus, "token check: OK, connected as Muhammad Mustafa");
  assert.deepStrictEqual(checkCalls.map((c) => c.url), ["https://api.linkedin.com/v2/userinfo"], "only the read-only check");
  const badCheck = await runLinkedIn({
    ...common,
    fetchImpl: mockLinkedIn([], { "https://api.linkedin.com/v2/userinfo": () => response(401, { text: TOKEN }) }),
    gitImpl: gitFactory({ oldManifest: baseFiles["blog/posts.json"] }),
    env: { ...baseEnv, LINKEDIN_DRY_RUN: "true" },
  });
  assert.ok(badCheck.tokenStatus.includes("expired or invalid"));
  assert.ok(!badCheck.tokenStatus.includes(TOKEN));

  // Full share with the mocked API: an image post with the OG image.
  const calls = [];
  const result = await runLinkedIn({ ...common, fetchImpl: mockLinkedIn(calls), env: baseEnv });
  assert.deepStrictEqual(result.posted, [{ url: postUrl, postId: "urn:li:share:999" }]);
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
  assert.deepStrictEqual(body.content, { media: { id: "urn:li:image:IMG1", altText: "Share card for the guide" } });
  assert.ok(body.commentary.includes(`Read the guide:\n${postUrl}`), "the link is inside the text");
  assert.ok(body.commentary.endsWith("#SEO #IndexNow #Bing #Netlify"));

  // A failed image upload means no post at all (the image is part of the format).
  let uploadError;
  const failCalls = [];
  try {
    await runLinkedIn({
      ...common,
      fetchImpl: mockLinkedIn(failCalls, {
        "https://api.linkedin.com/rest/images?action=initializeUpload": () => response(500, { text: "boom" }),
      }),
      env: baseEnv,
    });
  } catch (error) {
    uploadError = error;
  }
  assert.ok(uploadError && uploadError.message.includes("image upload"));
  assert.ok(!failCalls.some((c) => c.url === "https://api.linkedin.com/rest/posts"), "no post without the image");

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
