#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const homePath = path.join(root, "index.html");
const tailwindPath = path.join(root, "assets", "css", "tailwind.css");
const customPath = path.join(root, "assets", "css", "style.css");
const startMarker = "/* HOME_INLINE_CSS_START */";
const endMarker = "/* HOME_INLINE_CSS_END */";

const home = fs.readFileSync(homePath, "utf8");
const css = [
  fs.readFileSync(tailwindPath, "utf8").trim(),
  fs.readFileSync(customPath, "utf8").trim(),
].join("\n");

const pattern = new RegExp(
  `${startMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[\\s\\S]*?${endMarker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`
);

if (!pattern.test(home)) {
  throw new Error("Homepage inline CSS markers were not found.");
}

fs.writeFileSync(
  homePath,
  home.replace(pattern, `${startMarker}\n${css}\n${endMarker}`)
);

console.log("Inlined compiled CSS into index.html");
