// Shares a newly published blog post or free tool on the owner's LinkedIn
// profile after a production deploy. Uses the self-serve "Share on LinkedIn"
// product (w_member_social) and "Sign In with LinkedIn using OpenID Connect"
// (openid, profile) for the member id. The access token lives only in the
// Netlify environment variable LINKEDIN_ACCESS_TOKEN and is never logged.
const { execFileSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const { sitemapUrls } = require("../indexnow/changed-urls");

const ROOT = path.join(__dirname, "..", "..", "..");
const SITE_ORIGIN = "https://aisaaswithmustafa.com";
const API_BASE = "https://api.linkedin.com";
// Versioned LinkedIn APIs are sunset roughly a year after release; override
// with LINKEDIN_API_VERSION (YYYYMM) when this one is retired.
const DEFAULT_API_VERSION = "202610";
// Never flood the feed: one LinkedIn post per deploy, newest item first.
const MAX_POSTS_PER_DEPLOY = 1;
const COMMENTARY_LIMIT = 3000;
const DESCRIPTION_LIMIT = 250;
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

function truncate(text, limit) {
  const clean = String(text || "").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).replace(/\s+\S*$/, "")}…`;
}

function decodeEntities(text) {
  return String(text || "")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function postCommentary(post) {
  if (post.linkedinText) return truncate(escapeLittle(post.linkedinText), COMMENTARY_LIMIT);
  const hashtags = (post.tags || []).slice(0, 3).map(toHashtag).filter(Boolean).join(" ");
  const body = `New on the blog: ${post.title}\n\n${post.metaDescription}`;
  return truncate(`${escapeLittle(body)}${hashtags ? `\n\n${hashtags}` : ""}`, COMMENTARY_LIMIT);
}

function toolCommentary(tool) {
  const body = `New free tool: ${tool.title}\n\n${tool.description}\n\nFree to use, no signup.`;
  return truncate(`${escapeLittle(body)}\n\n#FreeTools #WebDevelopment`, COMMENTARY_LIMIT);
}

function readManifestAt(ref, gitImpl) {
  return JSON.parse(gitImpl(["show", `${ref}:blog/posts.json`]));
}

// Blog posts whose slug is in the new manifest but not in the previous one,
// newest first (the manifest is already ordered newest first).
function detectNewPosts(oldPosts, newPosts) {
  const known = new Set(oldPosts.map((post) => post.slug));
  return newPosts.filter((post) => post.slug && !known.has(post.slug));
}

function metaContent(html, property) {
  const match = html.match(new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]*content="([^"]*)"`, "i"));
  return match ? decodeEntities(match[1]) : "";
}

// New tool pages: files added under tools/ that are listed in the sitemap.
function detectNewTools(addedFiles, indexableUrls, readFile) {
  const tools = [];
  for (const file of addedFiles) {
    const normalized = file.replace(/\\/g, "/");
    const match = normalized.match(/^tools\/(?:([^/]+)\.html|([^/]+)\/index\.html)$/);
    if (!match || normalized === "tools/index.html") continue;
    const url = match[1] ? `${SITE_ORIGIN}/${normalized}` : `${SITE_ORIGIN}/tools/${match[2]}/`;
    if (!indexableUrls.has(url)) continue;

    const html = readFile(normalized);
    const image = metaContent(html, "og:image");
    tools.push({
      kind: "tool",
      url,
      title: metaContent(html, "og:title"),
      description: metaContent(html, "og:description"),
      imagePath: image.startsWith(`${SITE_ORIGIN}/`) ? image.slice(SITE_ORIGIN.length + 1) : "",
    });
  }
  return tools;
}

function postItem(post) {
  return {
    kind: "post",
    url: `${SITE_ORIGIN}/blog/${post.slug}.html`,
    title: post.title,
    description: post.metaDescription,
    imagePath: `blog/images/${post.socialImageFile || post.heroImageFile || `${post.slug}.jpg`}`,
    commentary: postCommentary(post),
  };
}

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

// The Posts API does not build link previews itself, so the share card image
// is uploaded first and attached as the article thumbnail.
async function uploadThumbnail({ token, version, owner, imagePath, fetchImpl, readBinary }) {
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

async function createArticlePost({ token, version, author, item, thumbnail, fetchImpl }) {
  const article = {
    source: item.url,
    title: truncate(item.title, 200),
    description: truncate(item.description, DESCRIPTION_LIMIT),
  };
  if (thumbnail) article.thumbnail = thumbnail;

  const response = await fetchImpl(`${API_BASE}/rest/posts`, {
    method: "POST",
    headers: linkedInHeaders(token, version, { "Content-Type": "application/json" }),
    body: JSON.stringify({
      author,
      commentary: item.commentary,
      visibility: "PUBLIC",
      distribution: { feedDistribution: "MAIN_FEED", targetEntities: [], thirdPartyDistributionChannels: [] },
      content: { article },
      lifecycleState: "PUBLISHED",
      isReshareDisabledByAuthor: false,
    }),
  });
  if (response.status !== 201) throw await failure(response, "Creating the LinkedIn post", token);
  return response.headers?.get?.("x-restli-id") || "";
}

function tokenWarning(env, now = new Date()) {
  if (!env.LINKEDIN_TOKEN_CREATED) return "";
  const created = new Date(env.LINKEDIN_TOKEN_CREATED);
  if (Number.isNaN(created.getTime())) return "";
  const days = Math.floor((now - created) / 86400000);
  if (days < TOKEN_WARNING_DAYS) return "";
  return `LinkedIn token is ${days} days old and expires at 60 days. Create a new one and update LINKEDIN_ACCESS_TOKEN and LINKEDIN_TOKEN_CREATED.`;
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

  const fromRef = env.CACHED_COMMIT_REF;
  const toRef = env.COMMIT_REF;
  if (!fromRef || !toRef) return { skipped: "commit references are missing", warning };
  if (fromRef === toRef) return { skipped: "no new commit since the last production build", warning };

  let oldPosts;
  try {
    oldPosts = readManifestAt(fromRef, gitImpl);
  } catch (_error) {
    // Without the previous manifest every post would look new, so do nothing.
    return { skipped: "the previous blog manifest could not be read", warning };
  }
  const newPosts = JSON.parse(readFile("blog/posts.json"));
  const addedFiles = gitImpl(["diff", "--name-only", "--diff-filter=A", fromRef, toRef])
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const indexable = sitemapUrls(readFile("sitemap.xml"));

  const items = [
    ...detectNewPosts(oldPosts, newPosts).map(postItem),
    ...detectNewTools(addedFiles, indexable, readFile).map((tool) => ({ ...tool, commentary: toolCommentary(tool) })),
  ];
  if (!items.length) return { skipped: "no new blog post or tool in this deploy", warning };

  const selected = items.slice(0, MAX_POSTS_PER_DEPLOY);
  const extra = items.slice(MAX_POSTS_PER_DEPLOY).map((item) => item.url);
  if (env.LINKEDIN_DRY_RUN === "true") return { dryRun: true, items: selected, extra, warning };

  const token = env.LINKEDIN_ACCESS_TOKEN;
  if (!token) return { skipped: "LINKEDIN_ACCESS_TOKEN is not set", warning };
  const version = env.LINKEDIN_API_VERSION || DEFAULT_API_VERSION;

  const author = await getPersonUrn(env, token, fetchImpl);
  const posted = [];
  const notes = [];
  for (const item of selected) {
    let thumbnail = "";
    if (item.imagePath) {
      try {
        thumbnail = await uploadThumbnail({ token, version, owner: author, imagePath: item.imagePath, fetchImpl, readBinary });
      } catch (error) {
        notes.push(`Thumbnail skipped: ${String(error.message).split(token).join("***")}`);
      }
    }
    const postId = await createArticlePost({ token, version, author, item, thumbnail, fetchImpl });
    posted.push({ url: item.url, postId });
  }
  return { posted, extra, notes, warning };
}

module.exports = {
  DEFAULT_API_VERSION,
  MAX_POSTS_PER_DEPLOY,
  detectNewPosts,
  detectNewTools,
  escapeLittle,
  postCommentary,
  runLinkedIn,
  toHashtag,
  toolCommentary,
  tokenWarning,
};
