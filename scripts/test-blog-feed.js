// Tests for scripts/blog-feed.js, plus a check that the committed feed matches
// the manifest (run build:feed or new-post.js if it fails).
const assert = require("assert");
const fs = require("fs");
const path = require("path");
const { absolutizeHtml, buildFeed, cleanArticleHtml } = require("./blog-feed");

const page = "https://aisaaswithmustafa.com/blog/a.html";
assert.strictEqual(
  absolutizeHtml('<img src="images/a.jpg"> <a href="/tools/x.html">x</a> <a href="#part">p</a> <a href="https://dev.to/">d</a> <a href="mailto:a@b.c">m</a>', page),
  '<img src="https://aisaaswithmustafa.com/blog/images/a.jpg"> <a href="https://aisaaswithmustafa.com/tools/x.html">x</a> <a href="https://aisaaswithmustafa.com/blog/a.html#part">p</a> <a href="https://dev.to/">d</a> <a href="mailto:a@b.c">m</a>',
);
assert.strictEqual(cleanArticleHtml('<h2 class="scroll-mt-28" id="intro">Intro</h2>'), "<h2>Intro</h2>");

const posts = [
  { slug: "a", title: "A & B", metaDescription: "Desc <x>", publishDateIso: "2026-11-12T01:00:00.000Z", category: "Web", tags: ["Web", "JS"] },
  { slug: "b", title: "Older", metaDescription: "Old", publishDateIso: "2026-11-01T01:00:00.000Z", heroImageFile: "b-hero.jpg" },
];
const pages = {
  "blog/a.html": '<!-- ARTICLE_CONTENT_START --><p>Hi <a href="/x">x</a> ]]> end</p><!-- ARTICLE_CONTENT_END -->',
  "blog/b.html": "<!-- ARTICLE_CONTENT_START --><p>Old</p><!-- ARTICLE_CONTENT_END -->",
};
const xml = buildFeed(posts, { readFile: (f) => pages[f], fileSize: () => 1234 });
assert.ok(xml.includes("<title>A &amp; B</title>"));
assert.ok(xml.includes("<description>Desc &lt;x&gt;</description>"));
assert.ok(xml.includes("<pubDate>Thu, 12 Nov 2026 01:00:00 GMT</pubDate>"));
assert.ok(xml.includes("<lastBuildDate>Thu, 12 Nov 2026 01:00:00 GMT</lastBuildDate>"), "build date comes from the newest post");
assert.strictEqual((xml.match(/<category>Web<\/category>/g) || []).length, 1, "no duplicate categories");
assert.ok(xml.includes('<enclosure url="https://aisaaswithmustafa.com/blog/images/b-hero.jpg" length="1234" type="image/jpeg"/>'));
assert.ok(xml.includes('href="https://aisaaswithmustafa.com/x"'));
assert.ok(xml.includes("]]]]><![CDATA[>"), "CDATA terminators inside content are split");
assert.ok(xml.indexOf("<title>A &amp; B</title>") < xml.indexOf("<title>Older</title>"), "newest first");

// The committed feed must be up to date with the manifest.
const root = path.join(__dirname, "..");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "blog", "posts.json"), "utf8"));
const committed = fs.readFileSync(path.join(root, "blog", "feed.xml"), "utf8").replace(/\r\n/g, "\n");
const fresh = buildFeed(manifest, {
  readFile: (f) => fs.readFileSync(path.join(root, f), "utf8"),
  fileSize: (f) => fs.statSync(path.join(root, f)).size,
});
assert.strictEqual(committed, fresh, "blog/feed.xml is stale: run npm run build:feed");
console.log("Blog feed tests passed.");
