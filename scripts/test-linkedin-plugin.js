// Tests for netlify/plugins/linkedin with a mocked LinkedIn API. Nothing is
// ever sent to LinkedIn from these tests.
const assert = require("assert");
const {
  DEFAULT_API_VERSION,
  MAX_SCHEDULE_ATTEMPTS,
  buildCommentary,
  describeScheduled,
  detectNewPosts,
  detectNewTools,
  dueScheduled,
  escapeLittle,
  pageImage,
  runLinkedIn,
  runScheduledLinkedIn,
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

  // --- Scheduled posts ----------------------------------------------------------
  assert.deepStrictEqual(validateEntry({ ...entry, publishAt: "2026-11-12T15:00:00+05:00" }), []);
  assert.ok(validateEntry({ ...entry, publishAt: "2026-11-12 15:00" })[0].includes("publishAt"), "a timezone is required");
  assert.ok(validateEntry({ ...entry, publishAt: "tomorrow" })[0].includes("publishAt"));

  const at = "2026-11-12T15:00:00+05:00"; // 10:00 UTC
  const scheduledSocial = {
    "/blog/new-post.html": { ...entry, publishAt: at },
    "/blog/other.html": { ...entry, publishAt: "2026-11-20T09:00:00Z" },
    "/blog/no-time.html": entry,
  };
  assert.deepStrictEqual(dueScheduled(scheduledSocial, new Date("2026-11-12T09:59:00Z")), []);
  assert.deepStrictEqual(dueScheduled(scheduledSocial, new Date("2026-11-12T10:00:00Z")).map((d) => d.key), ["/blog/new-post.html"]);
  assert.deepStrictEqual(dueScheduled(scheduledSocial, new Date("2026-11-13T10:00:01Z")), [], "never shared more than 24 hours late");

  // The deploy plugin leaves a scheduled post to the scheduled function.
  const deployScheduled = await runLinkedIn({
    ...common,
    readFile: readerFor({ ...baseFiles, "social/linkedin.json": JSON.stringify(scheduledSocial) }),
    env: baseEnv,
  });
  assert.strictEqual(deployScheduled.skipped, "the new item is scheduled for later");
  assert.deepStrictEqual(deployScheduled.scheduled, [`${postUrl} at ${at}`]);

  // A fake Netlify Blobs store with the same conditional-write behaviour.
  function memoryStore() {
    const data = new Map();
    let version = 0;
    return {
      data,
      async getWithMetadata(key) {
        return data.has(key) ? { data: data.get(key).value, etag: data.get(key).etag } : null;
      },
      async setJSON(key, value, options = {}) {
        if (options.onlyIfNew && data.has(key)) return { modified: false };
        if (options.onlyIfMatch && (!data.has(key) || data.get(key).etag !== options.onlyIfMatch)) return { modified: false };
        version += 1;
        data.set(key, { value, etag: `e${version}` });
        return { modified: true, etag: `e${version}` };
      },
    };
  }
  function liveSite(calls, overrides = {}) {
    const linkedIn = mockLinkedIn(calls, overrides);
    return async (url, options) => {
      if (url.startsWith(`${ORIGIN}/social/linkedin.json`)) {
        calls.push({ url });
        return { ok: true, status: 200, json: async () => scheduledSocial };
      }
      if (url === postUrl) {
        calls.push({ url });
        return response(200, { text: baseFiles["blog/new-post.html"] });
      }
      if (url === `${ORIGIN}/blog/images/new-post-social.jpg`) {
        calls.push({ url });
        return { ok: true, status: 200, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer };
      }
      return linkedIn(url, options);
    };
  }
  const dueTime = new Date("2026-11-12T10:00:30Z");
  const scheduledEnv = { LINKEDIN_AUTO_POST: "true", LINKEDIN_ACCESS_TOKEN: TOKEN };

  // Guard rails.
  const offStore = memoryStore();
  assert.ok((await runScheduledLinkedIn({ env: {}, fetchImpl: noCalls, store: offStore, now: dueTime })).skipped.includes("LINKEDIN_AUTO_POST"));
  const early = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([]), store: offStore, now: new Date("2026-11-12T09:00:00Z") });
  assert.strictEqual(early.skipped, "nothing is due");
  assert.strictEqual(early.next, `${postUrl} at ${at}`);
  assert.ok(describeScheduled(early).lines.includes("Settings: auto post on, live, token available."));

  // Dry run: shows the post, claims nothing, so it is still shared after dry run is switched off.
  const dryStore = memoryStore();
  const dryScheduled = await runScheduledLinkedIn({
    env: { ...scheduledEnv, LINKEDIN_DRY_RUN: "true" },
    fetchImpl: liveSite([]),
    store: dryStore,
    now: dueTime,
  });
  assert.strictEqual(dryScheduled.dryRun, true);
  assert.strictEqual(dryScheduled.items[0].imagePath, "blog/images/new-post-social.jpg");
  assert.strictEqual(dryStore.data.size, 0);

  // Live: shared once, then never again.
  const store = memoryStore();
  const scheduledCalls = [];
  const sharedNow = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite(scheduledCalls), store, now: dueTime });
  assert.deepStrictEqual(sharedNow.posted, [{ url: postUrl, postId: "urn:li:share:999" }]);
  assert.strictEqual(store.data.get("/blog/new-post.html").value.status, "posted");
  const scheduledBody = JSON.parse(scheduledCalls.find((c) => c.url === "https://api.linkedin.com/rest/posts").options.body);
  assert.ok(scheduledBody.commentary.includes(`Read the guide:\n${postUrl}`));
  assert.ok(describeScheduled(sharedNow).summary.startsWith("Shared"));
  const secondRun = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([]), store, now: new Date("2026-11-12T10:15:00Z") });
  assert.strictEqual(secondRun.skipped, "every due post was already handled");

  // A run that finds the item already claimed by another run does nothing.
  const raceStore = memoryStore();
  const realSet = raceStore.setJSON;
  raceStore.setJSON = async (key, value, options) => {
    await realSet(key, { status: "posting", attempts: 1 }, {});
    return realSet(key, value, options);
  };
  const raced = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([]), store: raceStore, now: dueTime });
  assert.strictEqual(raced.skipped, "another run is already sharing it");

  // Failure before the post request: retried, up to the limit.
  const failStore = memoryStore();
  const imageFails = { "https://api.linkedin.com/rest/images?action=initializeUpload": () => response(500, { text: "boom" }) };
  for (let attempt = 1; attempt <= MAX_SCHEDULE_ATTEMPTS; attempt += 1) {
    const failedRun = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([], imageFails), store: failStore, now: dueTime });
    assert.ok(failedRun.failed.includes("image upload"));
    assert.strictEqual(failedRun.retry, attempt < MAX_SCHEDULE_ATTEMPTS);
  }
  const gaveUp = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([], imageFails), store: failStore, now: dueTime });
  assert.strictEqual(gaveUp.skipped, "every due post was already handled");

  // A network error during the post request may have created the post: never retried.
  const unknownStore = memoryStore();
  const postDrops = { "https://api.linkedin.com/rest/posts": () => { throw new Error(`socket hang up ${TOKEN}`); } };
  const unknownRun = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([], postDrops), store: unknownStore, now: dueTime });
  assert.strictEqual(unknownRun.retry, false);
  assert.ok(!unknownRun.failed.includes(TOKEN), "the token is never echoed");
  assert.strictEqual(unknownStore.data.get("/blog/new-post.html").value.status, "unknown");
  assert.ok(describeScheduled(unknownRun).lines[0].includes("check LinkedIn"));
  // A LinkedIn error response to the post request means no post: safe to retry.
  const rejectedStore = memoryStore();
  const postRejected = { "https://api.linkedin.com/rest/posts": () => response(422, { text: "bad" }) };
  const rejected = await runScheduledLinkedIn({ env: scheduledEnv, fetchImpl: liveSite([], postRejected), store: rejectedStore, now: dueTime });
  assert.strictEqual(rejected.retry, true);

  console.log("LinkedIn plugin tests passed.");
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
