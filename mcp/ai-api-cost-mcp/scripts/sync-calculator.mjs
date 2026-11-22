// Copies the website's calculator module into this package so the MCP server
// runs exactly the same rates, presets and formulas as the web page.
// Runs automatically before `npm pack` / `npm publish` (see "prepack").
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const source = path.resolve(here, "../../../assets/js/ai-api-cost-calculator.js");
const target = path.resolve(here, "../src/calculator.cjs");

if (!fs.existsSync(source)) {
  if (fs.existsSync(target)) {
    console.log("Website calculator not found; keeping the bundled copy.");
    process.exit(0);
  }
  throw new Error(`Calculator source not found: ${source}`);
}

const header =
  "// GENERATED: copied from assets/js/ai-api-cost-calculator.js by scripts/sync-calculator.mjs.\n" +
  "// Edit the website file, then run `npm run sync`.\n";
fs.writeFileSync(target, header + fs.readFileSync(source, "utf8"));
console.log(`Synced calculator into ${path.relative(process.cwd(), target)}`);
