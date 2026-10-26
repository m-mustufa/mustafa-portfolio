#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const homePath = path.join(root, "index.html");
const tailwindPath = path.join(root, "assets", "css", "tailwind.css");
const customPath = path.join(root, "assets", "css", "style.css");
const consentPath = path.join(root, "assets", "css", "cookie-consent.css");
const startMarker = "/* HOME_INLINE_CSS_START */";
const endMarker = "/* HOME_INLINE_CSS_END */";
const consentStartMarker = "/* HOME_COOKIE_CONSENT_CSS_START */";
const consentEndMarker = "/* HOME_COOKIE_CONSENT_CSS_END */";

const home = fs.readFileSync(homePath, "utf8");
const customCss = fs.readFileSync(customPath, "utf8")
  .replace(/\/\* BLOG_ARTICLE_CSS_START \*\/[\s\S]*?\/\* BLOG_ARTICLE_CSS_END \*\//, "")
  .trim();
const css = [
  fs.readFileSync(tailwindPath, "utf8").trim(),
  customCss,
].join("\n");

const pattern = new RegExp(
  `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);
const consentPattern = new RegExp(
  `${consentStartMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${consentEndMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);

if (!pattern.test(home)) {
  throw new Error("Homepage inline CSS markers were not found.");
}

if (!consentPattern.test(home)) {
  throw new Error("Homepage cookie consent CSS markers were not found.");
}

const consentCss = fs.readFileSync(consentPath, "utf8").trim();
const nextHome = home
  .replace(pattern, `${startMarker}\n${css}\n${endMarker}`)
  .replace(consentPattern, `${consentStartMarker}\n${consentCss}\n${consentEndMarker}`);

fs.writeFileSync(
  homePath,
  nextHome
);

console.log("Inlined compiled CSS into index.html");
