// Rates, presets and formulas come from the website's calculator module, so the
// MCP server and https://aisaaswithmustafa.com/tools/ai-api-cost-calculator.html
// always agree. On start the server also tries the site's public rates file, so
// price updates reach users without a new package release.
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const calculator = require("./calculator.cjs");

export const { PRESETS, calculateEstimate, withCurrentRates } = calculator;
export const CALCULATOR_PAGE = "https://aisaaswithmustafa.com/tools/ai-api-cost-calculator.html";
export const LIVE_RATES_URL = "https://aisaaswithmustafa.com/tools/ai-api-pricing.json";

const REFRESH_MS = 12 * 60 * 60 * 1000;
let cache = null;

const isRate = (value) => typeof value === "number" && Number.isFinite(value) && value >= 0;

function isValidModel(model) {
  if (!model || typeof model !== "object") return false;
  if (![model.id, model.provider, model.name, model.source].every((v) => typeof v === "string" && v)) return false;
  if (![model.input, model.cached, model.output].every(isRate)) return false;
  if (model.promo) {
    const { ends, label, after } = model.promo;
    if (typeof ends !== "string" || typeof label !== "string" || !after) return false;
    if (![after.input, after.cached, after.output].every(isRate)) return false;
  }
  return true;
}

function bundledTable() {
  return { verifiedAt: calculator.RATES_VERIFIED, models: calculator.RATE_TABLE, origin: "bundled with the package" };
}

async function fetchLiveTable() {
  const response = await fetch(LIVE_RATES_URL, {
    headers: { Accept: "application/json", "User-Agent": "ai-api-cost-mcp" },
    signal: AbortSignal.timeout(2500),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const data = await response.json();
  if (typeof data.verifiedAt !== "string" || !Array.isArray(data.models) || !data.models.length) throw new Error("bad shape");
  if (!data.models.every(isValidModel)) throw new Error("bad model entry");
  return { verifiedAt: data.verifiedAt, models: data.models, origin: "aisaaswithmustafa.com (live)" };
}

// Returns the newest valid rate table: the live file when it is reachable and at
// least as recent as the bundled copy, otherwise the bundled copy.
export async function getRateTable() {
  if (cache && Date.now() - cache.loadedAt < REFRESH_MS) return cache.table;
  let table = bundledTable();
  if (process.env.AI_API_COST_MCP_OFFLINE !== "1") {
    try {
      const live = await fetchLiveTable();
      if (live.verifiedAt >= table.verifiedAt) table = live;
    } catch {
      // Offline or the site is unreachable: the bundled rates are still valid.
    }
  }
  cache = { table, loadedAt: Date.now() };
  return table;
}

// Applies promotional end dates, exactly like the web page does.
export function currentModels(table, now = new Date()) {
  return table.models.map((model) => withCurrentRates(model, now));
}

export function findModel(models, query) {
  const q = String(query || "").trim().toLowerCase();
  if (!q) return null;
  return (
    models.find((m) => m.id.toLowerCase() === q) ||
    models.find((m) => m.name.toLowerCase() === q) ||
    models.find((m) => m.name.toLowerCase().startsWith(q)) ||
    models.find((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q)) ||
    null
  );
}
