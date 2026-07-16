#!/usr/bin/env node
/**
 * Generates a hero image for a blog post.
 *
 * Tries OpenAI's Images API if OPENAI_API_KEY is set in the environment.
 * Falls back to a free, zero-cost generated SVG banner (rasterized via
 * ImageMagick) in the site's own visual language when no key is present,
 * or if the API call fails for any reason.
 *
 * Usage:
 *   node scripts/generate-image.js --slug my-post-slug --title "Post Title" --prompt "a description for the AI image"
 *
 * Output: blog/images/<slug>.jpg (1200x675)
 */

const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith("--")) {
      const key = argv[i].slice(2);
      const value = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : true;
      args[key] = value;
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const slug = args.slug;
const title = args.title || slug;
const prompt = args.prompt || `A clean, modern, abstract tech illustration representing: ${title}`;

if (!slug) {
  console.error("Usage: node scripts/generate-image.js --slug <slug> --title <title> [--prompt <prompt>]");
  process.exit(1);
}

const outDir = path.join(__dirname, "..", "blog", "images");
fs.mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, `${slug}.jpg`);

async function tryOpenAI() {
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    console.log("No OPENAI_API_KEY set — using free fallback banner.");
    return false;
  }
  try {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-image-1",
        prompt,
        size: "1536x1024",
        quality: "medium",
        n: 1,
      }),
    });
    if (!res.ok) {
      const errText = await res.text();
      console.warn(`OpenAI image request failed (${res.status}): ${errText}. Using free fallback banner.`);
      return false;
    }
    const data = await res.json();
    const b64 = data.data && data.data[0] && data.data[0].b64_json;
    if (!b64) {
      console.warn("OpenAI response had no image data. Using free fallback banner.");
      return false;
    }
    const tmpPng = outPath.replace(/\.jpg$/, "-openai-raw.png");
    fs.writeFileSync(tmpPng, Buffer.from(b64, "base64"));
    execFileSync("magick", [
      tmpPng,
      "-resize", "1200x675^",
      "-gravity", "center",
      "-extent", "1200x675",
      "-strip",
      "-quality", "85",
      outPath,
    ]);
    fs.unlinkSync(tmpPng);
    console.log(`Generated via OpenAI: ${outPath}`);
    return true;
  } catch (err) {
    console.warn(`OpenAI image generation errored: ${err.message}. Using free fallback banner.`);
    return false;
  }
}

// --- Free fallback: generated SVG banner, rasterized with ImageMagick ---

function wrapText(text, maxCharsPerLine) {
  const words = text.split(" ");
  const lines = [];
  let current = "";
  for (const word of words) {
    if ((current + " " + word).trim().length > maxCharsPerLine) {
      if (current) lines.push(current.trim());
      current = word;
    } else {
      current = (current + " " + word).trim();
    }
  }
  if (current) lines.push(current);
  return lines;
}

function escapeXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildFallbackSvg(titleText) {
  const width = 1200;
  const height = 675;
  const lines = wrapText(titleText, 26).slice(0, 4);
  const fontSize = 56;
  const lineHeight = 68;
  const totalTextHeight = lines.length * lineHeight;
  const startY = height / 2 - totalTextHeight / 2 + fontSize / 2;

  const tspans = lines
    .map((line, i) => `<tspan x="90" dy="${i === 0 ? 0 : lineHeight}">${escapeXml(line)}</tspan>`)
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" />
      <stop offset="55%" stop-color="#111827" />
      <stop offset="100%" stop-color="#106473" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" fill="url(#bg)" />
  <circle cx="1080" cy="90" r="140" fill="#106473" opacity="0.35" />
  <circle cx="1150" cy="580" r="220" fill="#0d9488" opacity="0.18" />
  <circle cx="120" cy="600" r="90" fill="#106473" opacity="0.25" />
  <g font-family="Arial, Helvetica, sans-serif" font-weight="800" fill="#ffffff">
    <text x="90" y="${startY}" font-size="${fontSize}">${tspans}</text>
  </g>
  <text x="90" y="${height - 50}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#5eead4">Muhammad Mustafa</text>
</svg>`;
}

function generateFallback() {
  const svg = buildFallbackSvg(title);
  const tmpSvg = outPath.replace(/\.jpg$/, "-fallback.svg");
  fs.writeFileSync(tmpSvg, svg);
  execFileSync("magick", [tmpSvg, "-strip", "-quality", "85", outPath]);
  fs.unlinkSync(tmpSvg);
  console.log(`Generated free fallback banner: ${outPath}`);
}

(async () => {
  const ok = await tryOpenAI();
  if (!ok) generateFallback();
})();
