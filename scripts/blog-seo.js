const path = require("path");

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function stripTags(html) {
  return String(html)
    .replace(/<[^>]*>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyHeading(value) {
  return stripTags(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "") || "section";
}

function addHeadingIdsAndBuildToc(contentHtml) {
  const usedIds = new Set();
  const headings = [];

  const html = contentHtml.replace(/<h2([^>]*)>([\s\S]*?)<\/h2>/gi, (match, attributes, innerHtml) => {
    const existingId = attributes.match(/\sid=["']([^"']+)["']/i)?.[1];
    const baseId = existingId || slugifyHeading(innerHtml);
    let id = baseId;
    let suffix = 2;
    while (usedIds.has(id)) id = `${baseId}-${suffix++}`;
    usedIds.add(id);

    const text = stripTags(innerHtml);
    headings.push({ id, text });

    let nextAttributes = attributes.replace(/\s+id=["'][^"']+["']/i, "");
    const classMatch = nextAttributes.match(/\sclass=["']([^"']*)["']/i);
    if (classMatch) {
      const classes = new Set(classMatch[1].split(/\s+/).filter(Boolean));
      classes.add("scroll-mt-28");
      nextAttributes = nextAttributes.replace(classMatch[0], ` class="${[...classes].join(" ")}"`);
    } else {
      nextAttributes += ' class="scroll-mt-28"';
    }

    return `<h2${nextAttributes} id="${escapeHtml(id)}">${innerHtml}</h2>`;
  });

  const tocHtml = headings.length >= 2
    ? `<nav class="mb-10 rounded-2xl border border-gray-700 bg-white/5 p-6" aria-labelledby="table-of-contents">
                <h2 id="table-of-contents" class="text-xl font-bold text-white mb-4">Table of contents</h2>
                <ol class="space-y-2 list-decimal list-inside text-gray-300">
${headings.map(({ id, text }) => `                    <li><a href="#${escapeHtml(id)}" class="text-primary hover:text-white transition">${escapeHtml(text)}</a></li>`).join("\n")}
                </ol>
            </nav>`
    : "";

  return { contentHtml: html, tocHtml, headings };
}

function normaliseTags(post) {
  return Array.isArray(post.tags) ? post.tags.filter(Boolean).map(String) : [];
}

function selectRelatedPosts(post, posts, limit = 3) {
  const bySlug = new Map(posts.map((candidate) => [candidate.slug, candidate]));
  const selected = [];

  for (const slug of post.relatedSlugs || []) {
    const candidate = bySlug.get(slug);
    if (candidate && candidate.slug !== post.slug && !selected.some((item) => item.slug === candidate.slug)) {
      selected.push(candidate);
    }
    if (selected.length === limit) return selected;
  }

  const postTags = new Set(normaliseTags(post).map((tag) => tag.toLowerCase()));
  const candidates = posts
    .filter((candidate) => candidate.slug !== post.slug && !selected.some((item) => item.slug === candidate.slug))
    .map((candidate, index) => {
      const sharedTags = normaliseTags(candidate).filter((tag) => postTags.has(tag.toLowerCase())).length;
      const sameCategory = candidate.category && candidate.category === post.category ? 2 : 0;
      return { candidate, score: sharedTags * 3 + sameCategory, index };
    })
    .sort((a, b) => b.score - a.score || a.index - b.index);

  for (const { candidate } of candidates) {
    selected.push(candidate);
    if (selected.length === limit) break;
  }
  return selected;
}

function buildTagMeta(tags) {
  return tags.map((tag) => `<meta property="article:tag" content="${escapeHtml(tag)}">`).join("\n    ");
}

function buildVisibleTags(category, tags) {
  const chips = [category, ...tags].filter(Boolean);
  if (!chips.length) return "";
  return `<div class="flex flex-wrap gap-2 mb-6" aria-label="Article topics">
${chips.map((tag) => `                <span class="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">${escapeHtml(tag)}</span>`).join("\n")}
            </div>`;
}

function buildRelatedPostsHtml(relatedPosts) {
  return relatedPosts.map((post) => `                    <a href="/blog/${escapeHtml(post.slug)}.html" class="group rounded-xl border border-gray-700 bg-white/5 p-4 transition hover:border-primary hover:-translate-y-1">
                        <p class="text-primary text-xs font-semibold mb-2">${escapeHtml(post.category || "SaaS Engineering")}</p>
                        <h3 class="font-bold text-white leading-snug group-hover:text-primary transition">${escapeHtml(post.title)}</h3>
                    </a>`).join("\n");
}

function formatIsoDate(isoDate) {
  return new Date(isoDate).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

function renderPostPage({ template, post, contentHtml, posts }) {
  const category = post.category || "SaaS Engineering";
  const tags = normaliseTags(post);
  const modifiedDateIso = post.modifiedDateIso || post.publishDateIso;
  const { contentHtml: enhancedContent, tocHtml } = addHeadingIdsAndBuildToc(contentHtml);
  const relatedPosts = selectRelatedPosts(post, posts);
  const isUpdated = new Date(modifiedDateIso).getTime() > new Date(post.publishDateIso).getTime();
  const updatedDateHtml = isUpdated
    ? ` · Updated <time datetime="${escapeHtml(modifiedDateIso)}">${escapeHtml(formatIsoDate(modifiedDateIso))}</time>`
    : "";

  const replacements = {
    "{{TITLE}}": post.title,
    "{{META_DESCRIPTION}}": post.metaDescription,
    "{{SLUG}}": post.slug,
    "{{PUBLISH_DATE_ISO}}": post.publishDateIso,
    "{{MODIFIED_DATE_ISO}}": modifiedDateIso,
    "{{PUBLISH_DATE}}": post.publishDate,
    "{{UPDATED_DATE_HTML}}": updatedDateHtml,
    "{{READING_TIME}}": String(post.readingTime),
    "{{HERO_IMAGE_ALT}}": post.heroImageAlt || post.title,
    "{{CATEGORY}}": category,
    "{{ARTICLE_TAG_META}}": buildTagMeta(tags),
    "{{SCHEMA_KEYWORDS}}": JSON.stringify(tags),
    "{{TAGS_HTML}}": buildVisibleTags(category, tags),
    "{{TOC_HTML}}": tocHtml,
    "{{CONTENT_HTML}}": enhancedContent,
    "{{RELATED_POSTS_HTML}}": buildRelatedPostsHtml(relatedPosts),
  };

  return Object.entries(replacements).reduce(
    (html, [placeholder, value]) => html.replaceAll(placeholder, String(value)),
    template
  );
}

function extractArticleContent(html) {
  const marked = html.match(/<!-- ARTICLE_CONTENT_START -->([\s\S]*?)<!-- ARTICLE_CONTENT_END -->/);
  if (marked) return marked[1].trim();

  const legacy = html.match(/<div class="prose prose-invert prose-lg max-w-none[\s\S]*?prose-li:text-gray-300 prose-code:text-primary">([\s\S]*?)<\/div>\s*<div class="mt-16 pt-8 border-t border-gray-700/);
  if (!legacy) throw new Error("Could not locate the article body in a generated blog page.");
  return legacy[1].trim();
}

module.exports = {
  addHeadingIdsAndBuildToc,
  extractArticleContent,
  renderPostPage,
  selectRelatedPosts,
};
