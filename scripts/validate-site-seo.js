#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const errors = [];
const pages = [
  { file: "index.html", canonical: "https://mustcode.netlify.app/" },
  {
    file: "full-stack-developer-uae.html",
    canonical: "https://mustcode.netlify.app/full-stack-developer-uae.html",
    primaryPhrase: "full-stack",
  },
];

function countMatches(value, pattern) {
  return (value.match(pattern) || []).length;
}

function plainText(value) {
  return value.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ").trim();
}

for (const page of pages) {
  const pagePath = path.join(ROOT, page.file);
  const html = fs.readFileSync(pagePath, "utf8");
  const title = plainText(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
  const description = html.match(/<meta name="description"\s+content="([^"]+)"/i)?.[1] || "";
  const h1 = plainText(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const checks = [
    [countMatches(html, /<title>/gi) === 1, "must contain exactly one title"],
    [title.length >= 30 && title.length <= 65, `title length is ${title.length}, expected 30-65`],
    [description.length >= 120 && description.length <= 170, `description length is ${description.length}, expected 120-170`],
    [countMatches(html, /<h1[\s>]/gi) === 1, "must contain exactly one h1"],
    [countMatches(html, /<main[\s>]/gi) === 1, "must contain exactly one main landmark"],
    [html.includes(`<link rel="canonical" href="${page.canonical}">`), "canonical is missing or incorrect"],
    [html.includes(`<meta property="og:url" content="${page.canonical}">`), "Open Graph URL is missing or incorrect"],
    [html.includes('name="robots" content="index, follow, max-image-preview:large"'), "robots meta is missing"],
    [countMatches(html, /<script type="application\/ld\+json">/g) >= 1, "JSON-LD is missing"],
  ];

  if (page.primaryPhrase) {
    checks.push([title.toLowerCase().includes(page.primaryPhrase), "primary phrase is missing from title"]);
    checks.push([h1.toLowerCase().includes(page.primaryPhrase), "primary phrase is missing from h1"]);
  }

  for (const [passed, message] of checks) if (!passed) errors.push(`${page.file}: ${message}`);

  for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try {
      JSON.parse(match[1]);
    } catch (error) {
      errors.push(`${page.file}: invalid JSON-LD (${error.message})`);
    }
  }

  for (const match of html.matchAll(/<img\s+([^>]+)>/gi)) {
    const attributes = match[1];
    if (!/\salt="[^"]+"/i.test(` ${attributes}`)) errors.push(`${page.file}: image has missing or empty alt text`);
    if (!/\swidth="\d+"/i.test(` ${attributes}`) || !/\sheight="\d+"/i.test(` ${attributes}`)) {
      errors.push(`${page.file}: image is missing numeric width or height`);
    }
  }

  for (const match of html.matchAll(/<a\s+([^>]*target="_blank"[^>]*)>/gi)) {
    if (!/rel="[^"]*noopener[^"]*noreferrer[^"]*"/i.test(match[1])) {
      errors.push(`${page.file}: target=_blank link is missing noopener noreferrer`);
    }
  }

  for (const match of html.matchAll(/href="(\/[^"?#]*)(?:[?#][^"]*)?"/g)) {
    const urlPath = match[1];
    const localPath = urlPath === "/" ? "index.html" : urlPath.replace(/^\//, "");
    if (!fs.existsSync(path.join(ROOT, localPath))) {
      errors.push(`${page.file}: broken internal link ${urlPath}`);
    }
  }
}

const landingHtml = fs.readFileSync(path.join(ROOT, "full-stack-developer-uae.html"), "utf8");
if (/"@type":\s*"LocalBusiness"/.test(landingHtml)) {
  errors.push("full-stack-developer-uae.html: must not claim LocalBusiness without a physical UAE location");
}
if (!/"@type":\s*"Service"/.test(landingHtml) || !/"@type":\s*"FAQPage"/.test(landingHtml)) {
  errors.push("full-stack-developer-uae.html: Service or FAQPage structured data is missing");
}

const homeHtml = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
if (!homeHtml.includes('href="/full-stack-developer-uae.html"')) {
  errors.push("index.html: UAE service landing page is not internally linked");
}

const sitemap = fs.readFileSync(path.join(ROOT, "sitemap.xml"), "utf8");
if (!sitemap.includes("https://mustcode.netlify.app/full-stack-developer-uae.html")) {
  errors.push("sitemap.xml: UAE service landing page is missing");
}

if (errors.length) {
  console.error(`Site SEO validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Validated homepage and UAE service page SEO, schema, images, links and sitemap entry.");
