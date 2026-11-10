// Shares a newly published blog post or free tool on the owner's LinkedIn
// profile after a production deploy, as an image post: the page's own OG image
// plus hand-written text in a fixed format, with the link inside the text.
//
// Uses the self-serve "Share on LinkedIn" product (w_member_social) and "Sign
// In with LinkedIn using OpenID Connect" (openid, profile) for the member id.
// The access token lives only in the Netlify environment variable
// LINKEDIN_ACCESS_TOKEN and is never logged.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { sitemapUrls } = require("../indexnow/changed-urls");

const ROOT = path.join(__dirname, "..", "..", "..");
const SITE_ORIGIN = "https://aisaaswithmustafa.com";
const API_BASE = "https://api.linkedin.com";
// Hand-written LinkedIn text for each post or tool, keyed by site path.
const SOCIAL_FILE = "social/linkedin.json";
// Versioned LinkedIn APIs are sunset roughly a year after release; override
// with LINKEDIN_API_VERSION (YYYYMM) when this one is retired.
const DEFAULT_API_VERSION = "202610";
// Never flood the feed: one LinkedIn post per deploy, newest item first.
const MAX_POSTS_PER_DEPLOY = 1;
const COMMENTARY_LIMIT = 3000;
// LinkedIn tokens from the Token Generator last 60 days.
const TOKEN_WARNING_DAYS = 50;

function git(args, cwd = ROOT) {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

// LinkedIn "little" text format reserves these characters, so plain text must
// escape them. A '#' that starts a hashtag (#SEO) is kept as a real hashtag.
function escapeLittle(text) {
  return String(text)
    .replace(/[\\|{}@[\]()<>*_~]/g, "\\$&")
    .replace(/#(?![A-Za-z0-9])/g, "\\#");
}

function toHashtag(tag) {
  const words = String(tag).match(/[A-Za-z0-9]+/g) || [];
  if (!words.length) return "";
  return `#${words.map((w) => w[0].toUpperCase() + w.slice(1)).join("")}`;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function metaContent(html, property) {
  const match = String(html).match(new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]*content="([^"]*)"`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

// --- The fixed post format ------------------------------------------------
// social/linkedin.json:
// { "/blog/<slug>.html": {
//     "hook": "One line that makes people stop scrolling",
//     "intro": "One or two lines: what it is and who it is for",
//     "points": ["Short benefit", "Short benefit", "Optional third"],
//     "cta": "Read the guide",            // optional; default by page type
//     "hashtags": ["SEO", "IndexNow", "Bing"]   // 3 to 5, from the target keywords
// } }
function validateEntry(entry) {
  const problems = [];
  const text = (value) => typeof value === "string" && value.trim().length > 0;
  if (!entry || typeof entry !== "object") return ["entry is missing"];
  if (!text(entry.hook) || entry.hook.length > 150) problems.push("hook must be one line of up to 150 characters");
  if (!text(entry.intro) || entry.intro.length > 300) problems.push("intro must be up to 300 characters");
  if (!Array.isArray(entry.points) || entry.points.length < 2 || entry.points.length > 3 || !entry.points.every(text)) {
    problems.push("points must be 2 or 3 short lines");
  } else if (entry.points.some((p) => p.length > 160)) {
    problems.push("each point must be up to 160 characters");
  }
  if (entry.cta !== undefined && (!text(entry.cta) || entry.cta.length > 40)) problems.push("cta must be up to 40 characters");
  if (
    !Array.isArray(entry.hashtags) ||
    entry.hashtags.length < 3 ||
    entry.hashtags.length > 5 ||
    !entry.hashtags.every((tag) => /^#?[A-Za-z][A-Za-z0-9]*$/.test(String(tag)))
  ) {
    problems.push("hashtags must be 3 to 5 single words such as SEO or NextJs");
  }
  const allText = [entry.hook, entry.intro, ...(entry.points || []), entry.cta].filter(Boolean).join(" ");
  if (allText.includes("—")) problems.push("do not use the em dash character");
  return problems;
}

function defaultCta(kind) {
  return kind === "tool" ? "Try it free" : "Read the guide";
}

function buildCommentary(entry, item) {
  const hashtags = entry.hashtags.map((tag) => toHashtag(String(tag).replace(/^#/, ""))).join(" ");
  const lines = [
    escapeLittle(entry.hook.trim()),
    escapeLittle(entry.intro.trim()),
    "",
    ...entry.points.map((point) => `→ ${escapeLittle(point.trim())}`),
    "",
    `${escapeLittle((entry.cta || defaultCta(item.kind)).trim())}:`,
    item.url,
    "",
    hashtags,
  ];
  return lines.join("\n").slice(0, COMMENTARY_LIMIT);
}

// --- Finding what is new ---------------------------------------------------
function readManifestAt(ref, gitImpl) {
  return JSON.parse(gitImpl(["show", `${ref}:blog/posts.json`]));
}

// Blog posts whose slug is in the new manifest but not in the previous one,
// newest first (the manifest is already ordered newest first).
function detectNewPosts(oldPosts, newPosts) {
  const known = new Set(oldPosts.map((post) => post.slug));
  return newPosts.filter((post) => post.slug && !known.has(post.slug));
}

// New tool pages: files added under tools/ that are listed in the sitemap.
function detectNewTools(addedFiles, indexableUrls) {
  const tools = [];
  for (const file of addedFiles) {
    const normalized = file.replace(/\\/g, "/");
    const match = normalized.match(/^tools\/(?:([^/]+)\.html|([^/]+)\/index\.html)$/);
    if (!match || normalized === "tools/index.html") continue;
    const url = match[1] ? `${SITE_ORIGIN}/${normalized}` : `${SITE_ORIGIN}/tools/${match[2]}/`;
    if (indexableUrls.has(url)) tools.push({ kind: "tool", url, file: normalized });
  }
  return tools;
}

function sitePath(url) {
  return url.startsWith(SITE_ORIGIN) ? url.slice(SITE_ORIGIN.length) : url;
}

// The image is the page's own OG image, so LinkedIn shows the same card as a
// shared link would. It must be a file on this site.
function pageImage(html) {
  const image = metaContent(html, "og:image");
  return {
    imagePath: image.startsWith(`${SITE_ORIGIN}/`) ? image.slice(SITE_ORIGIN.length + 1) : "",
    imageAlt: metaContent(html, "og:image:alt") || metaContent(html, "og:title"),
  };
}

function prepareItem(item, social, readFile) {
  const problems = [];
  let html = "";
  try {
    html = readFile(item.file);
  } catch (_error) {
    problems.push(`page file ${item.file} not found`);
  }
  const { imagePath, imageAlt } = pageImage(html);
  if (html && !imagePath) problems.push("the page has no og:image hosted on this site");

  const entry = social[sitePath(item.url)];
  if (!entry) problems.push(`no LinkedIn text in ${SOCIAL_FILE}`);
  else problems.push(...validateEntry(entry));

  return {
    ...item,
    imagePath,
    imageAlt,
    problems,
    commentary: problems.length ? "" : buildCommentary(entry, item),
  };
}

// --- LinkedIn API ------------------------------------------------------------
function linkedInHeaders(token, version, extra = {}) {
  return {
    Authorization: `Bearer ${token}`,
    "LinkedIn-Version": version,
    "X-Restli-Protocol-Version": "2.0.0",
    ...extra,
  };
}

async function failure(response, what, token) {
  const body = (await response.text().catch(() => "")).split(token).join("***").slice(0, 300);
  if (response.status === 401) {
    return new Error(
      `${what} failed: the LinkedIn token is expired or invalid (HTTP 401). Create a new token in the LinkedIn Token Generator and update LINKEDIN_ACCESS_TOKEN in Netlify`,
    );
  }
  if (response.status === 403) {
    return new Error(`${what} failed: permission denied (HTTP 403). Check the app has Share on LinkedIn and the token has w_member_social`);
  }
  return new Error(`${what} failed with HTTP ${response.status}: ${body}`);
}

async function getPersonUrn(env, token, fetchImpl) {
  if (env.LINKEDIN_PERSON_URN) return env.LINKEDIN_PERSON_URN;
  const response = await fetchImpl(`${API_BASE}/v2/userinfo`, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) throw await failure(response, "Reading the LinkedIn member id", token);
  const data = await response.json();
  if (!data.sub) throw new Error("Reading the LinkedIn member id failed: no 'sub' in userinfo. The token needs the openid and profile scopes");
  return `urn:li:person:${data.sub}`;
}

async function uploadImage({ token, version, owner, imagePath, fetchImpl, readBinary }) {
  const bytes = readBinary(imagePath);
  const init = await fetchImpl(`${API_BASE}/rest/images?action=initializeUpload`, {
    method: "POST",
    headers: linkedInHeaders(token, version, { "Content-Type": "application/json" }),
    body: JSON.stringify({ initializeUploadRequest: { owner } }),
  });
  if (!init.ok) throw await failure(init, "Starting the image upload", token);
  const { value } = await init.json();
  if (!value?.uploadUrl || !value?.image) throw new Error("Starting the image upload failed: no upload URL returned");

  const contentType = imagePath.endsWith(".png") ? "image/png" : "image/jpeg";
  const upload = await fetchImpl(value.uploadUrl, {
    method: "PUT",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": contentType },
    body: bytes,
  });
  if (!upload.ok) throw await failure(upload, "Uploading the image", token);
  return value.image;
}

async function createImagePost({ token, version, author, item, image, fetchImpl }) {
  const response = await fetchImpl(`${API_BASE}/rest/posts`, {
    method: "POST",
    headers: linkedInHeaders(token, version, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      author,
      commentary: item.commentary,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { media: { id: image, altText: String(item.imageAlt || "").slice(0, 300) } },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (response.status !== 201) throw await failure(response, "Creating the LinkedIn post", token);
  return response.headers?.get?.("x-restli-id") || "";
}

// Read-only check used while LINKEDIN_DRY_RUN is on: confirms the token works
// and has the openid/profile scopes, without posting anything.
async function checkToken(env, fetchImpl) {
  const token = env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return "token check: LINKEDIN_ACCESS_TOKEN is not set";
  try {
    const response = await fetchImpl(`${API_BASE}/v2/userinfo`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) return `token check: ${(await failure(response, "reading your profile", token)).message}`;
    const data = await response.json();
    if (!data.sub) return "token check: the token works but is missing the openid and profile scopes";
    return `token check: OK, connected as ${data.name || "your LinkedIn profile"}`;
  } catch (error) {
    return `token check failed: ${String(error.message).split(token).join("***")}`;
  }
}

function tokenWarning(env, now = new Date()) {
  if (!env.LINKEDIN_TOKEN_CREATED) return "";
  const created = new Date(env.LINKEDIN_TOKEN_CREATED);
  if (Number.isNaN(created.getTime())) return "";
  const days = Math.floor((now - created) / 86400000);
  if (days < TOKEN_WARNING_DAYS) return "";
  return `LinkedIn token is ${days} days old and expires at 60 days. Create a new one and update LINKEDIN_ACCESS_TOKEN and LINKEDIN_TOKEN_CREATED.`;
}

function readSocial(readFile) {
  try {
    return JSON.parse(readFile(SOCIAL_FILE));
  } catch (_error) {
    return {};
  }
}

async function runLinkedIn({
  env = process.env,
  fetchImpl = fetch,
  gitImpl = git,
  readFile = (file) => fs.readFileSync(path.join(ROOT, file), "utf8"),
  readBinary = (file) => fs.readFileSync(path.join(ROOT, file)),
  now = new Date(),
} = {}) {
  if (env.CONTEXT !== "production") return { skipped: `deploy context is ${env.CONTEXT || "unknown"}, not production` };
  const warning = tokenWarning(env, now);
  if (env.LINKEDIN_AUTO_POST !== "true") return { skipped: "LINKEDIN_AUTO_POST is not set to true", warning };
  const tokenStatus = env.LINKEDIN_DRY_RUN === "true" ? await checkToken(env, fetchImpl) : "";
  const info = { warning, tokenStatus };

  const fromRef = env.CACHED_COMMIT_REF;
  const toRef = env.COMMIT_REF;
  if (!fromRef || !toRef) return { skipped: "commit references are missing", ...info };
  if (fromRef === toRef) return { skipped: "no new commit since the last production build", ...info };

  let oldPosts;
  try {
    oldPosts = readManifestAt(fromRef, gitImpl);
  } catch (_error) {
    // Without the previous manifest every post would look new, so do nothing.
    return { skipped: "the previous blog manifest could not be read", ...info };
  }
  const newPosts = JSON.parse(readFile("blog/posts.json"));
  const addedFiles = gitImpl(["diff", "--name-only", "--diff-filter=A", fromRef, toRef])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const indexable = sitemapUrls(readFile("sitemap.xml"));

  const found = [
    ...detectNewPosts(oldPosts, newPosts).map((post) => ({
      kind: "post",
      url: `${SITE_ORIGIN}/blog/${post.slug}.html`,
      file: `blog/${post.slug}.html`,
    })),
    ...detectNewTools(addedFiles, indexable),
  ];
  if (!found.length) return { skipped: "no new blog post or tool in this deploy", ...info };

  // Only items with complete hand-written text and an OG image are shared;
  // nothing generic is ever posted.
  const social = readSocial(readFile);
  const prepared = found.map((item) => prepareItem(item, social, readFile));
  const ready = prepared.filter((item) => !item.problems.length);
  const notReady = prepared
    .filter((item) => item.problems.length)
    .map((item) => `${item.url}: ${item.problems.join("; ")}`);
  if (!ready.length) return { skipped: "the new item has no complete LinkedIn text", notReady, ...info };

  const selected = ready.slice(0, MAX_POSTS_PER_DEPLOY);
  const extra = ready.slice(MAX_POSTS_PER_DEPLOY).map((item) => item.url);
  if (env.LINKEDIN_DRY_RUN === "true") return { dryRun: true, items: selected, extra, notReady, ...info };

  const token = env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return { skipped: "LINKEDIN_ACCESS_TOKEN is not set", notReady, ...info };
  const version = env.LINKEDIN_API_VERSION || DEFAULT_API_VERSION;

  const author = await getPersonUrn(env, token, fetchImpl);
  const posted = [];
  for (const item of selected) {
    // The OG image is part of the format, so a failed upload means no post.
    const image = await uploadImage({ token, version, owner: author, imagePath: item.imagePath, fetchImpl, readBinary });
    const postId = await createImagePost({ token, version, author, item, image, fetchImpl });
    posted.push({ url: item.url, postId });
  }
  return { posted, extra, notReady, ...info };
}

module.exports = {
  DEFAULT_API_VERSION,
  MAX_POSTS_PER_DEPLOY,
  SITE_ORIGIN,
  SOCIAL_FILE,
  buildCommentary,
  detectNewPosts,
  detectNewTools,
  escapeLittle,
  pageImage,
  prepareItem,
  runLinkedIn,
  sitePath,
  toHashtag,
  tokenWarning,
  validateEntry,
};
