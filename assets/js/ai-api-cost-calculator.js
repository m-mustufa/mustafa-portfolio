(function aiApiCostCalculatorModule(root) {
  "use strict";

  const MODELS = [
    { id: "gpt-6-luna", provider: "OpenAI", name: "GPT-6 Luna", input: 0.10, cached: 0.01, output: 0.50, source: "https://developers.openai.com/api/docs/pricing" },
    { id: "gpt-6.1-terra", provider: "OpenAI", name: "GPT-6.1 Terra", input: 1.00, cached: 0.05, output: 5.00, source: "https://developers.openai.com/api/docs/pricing" },
    { id: "gpt-6.1-sol", provider: "OpenAI", name: "GPT-6.1 Sol", input: 2.00, cached: 0.10, output: 10.00, source: "https://developers.openai.com/api/docs/pricing" },
    { id: "gpt-6-astra", provider: "OpenAI", name: "GPT-6 Astra", input: 10.00, cached: 1.00, output: 50.00, source: "https://developers.openai.com/api/docs/pricing" },
    { id: "claude-haiku-5.5", provider: "Anthropic", name: "Claude Haiku 5.5 (prompts <=100K)", input: 0.10, cached: 0.01, output: 0.50, source: "https://platform.claude.com/docs/en/about-claude/pricing" },
    { id: "claude-sonnet-5.5", provider: "Anthropic", name: "Claude Sonnet 5.5", input: 2.00, cached: 0.10, output: 10.00, source: "https://platform.claude.com/docs/en/about-claude/pricing" },
    { id: "claude-opus-5.5", provider: "Anthropic", name: "Claude Opus 5.5", input: 4.00, cached: 0.20, output: 20.00, source: "https://platform.claude.com/docs/en/about-claude/pricing" },
    { id: "gemini-3.5-flash-lite", provider: "Google", name: "Gemini 3.5 Flash-Lite", input: 0.30, cached: 0.03, output: 2.50, source: "https://ai.google.dev/gemini-api/docs/pricing" },
    { id: "gemini-3.5-flash", provider: "Google", name: "Gemini 3.5 Flash", input: 1.50, cached: 0.15, output: 9.00, source: "https://ai.google.dev/gemini-api/docs/pricing" },
    { id: "gemini-3.8-flash-promo", provider: "Google", name: "Gemini 3.8 Flash (promo through Dec 31, 2026)", input: 0.75, cached: 0.075, output: 3.75, source: "https://ai.google.dev/gemini-api/docs/pricing", note: "Promotional rate ends December 31, 2026." }
  ];

  const PRESETS = {
    chat: { users: 1000, requestsPerUser: 30, inputTokens: 1200, outputTokens: 400, cachePct: 20, pricePerUser: 19, variableCostPerUser: 1.25, fixedCost: 300 },
    support: { users: 1000, requestsPerUser: 80, inputTokens: 2500, outputTokens: 500, cachePct: 40, pricePerUser: 29, variableCostPerUser: 2.50, fixedCost: 500 },
    summarizer: { users: 1000, requestsPerUser: 20, inputTokens: 6000, outputTokens: 700, cachePct: 10, pricePerUser: 15, variableCostPerUser: 1.00, fixedCost: 250 },
    documents: { users: 1000, requestsPerUser: 10, inputTokens: 15000, outputTokens: 1200, cachePct: 0, pricePerUser: 39, variableCostPerUser: 4.00, fixedCost: 750 }
  };

  function cleanNumber(value) {
    const parsed = Number(String(value ?? "").replace(/,/g, ""));
    return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
  }

  function formatMaskedNumber(value, decimals) {
    let cleaned = String(value ?? "").replace(/,/g, "").replace(/[^\d.]/g, "");
    const point = cleaned.indexOf(".");
    if (point !== -1) cleaned = cleaned.slice(0, point + 1) + cleaned.slice(point + 1).replace(/\./g, "").slice(0, decimals);
    if (!cleaned) return "";
    const hasPoint = cleaned.includes(".");
    let [whole, fraction = ""] = cleaned.split(".");
    whole = whole.replace(/^0+(?=\d)/, "") || "0";
    return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (hasPoint ? `.${fraction}` : "");
  }

  function calculateEstimate(values, rates) {
    const users = cleanNumber(values.users);
    const requestsPerUser = cleanNumber(values.requestsPerUser);
    const inputPerRequest = cleanNumber(values.inputTokens);
    const outputPerRequest = cleanNumber(values.outputTokens);
    const cachePct = Math.min(100, cleanNumber(values.cachePct));
    const pricePerUser = cleanNumber(values.pricePerUser);
    const variableCostPerUser = cleanNumber(values.variableCostPerUser);
    const fixedCost = cleanNumber(values.fixedCost);
    const extraCostPerRequest = cleanNumber(values.extraCostPerRequest);
    const monthlyRequests = users * requestsPerUser;
    const totalInputTokens = monthlyRequests * inputPerRequest;
    const cachedInputTokens = totalInputTokens * (cachePct / 100);
    const uncachedInputTokens = totalInputTokens - cachedInputTokens;
    const totalOutputTokens = monthlyRequests * outputPerRequest;
    const inputCost = (uncachedInputTokens / 1000000) * cleanNumber(rates.input);
    const cachedInputCost = (cachedInputTokens / 1000000) * cleanNumber(rates.cached);
    const outputCost = (totalOutputTokens / 1000000) * cleanNumber(rates.output);
    const extraUsageCost = monthlyRequests * extraCostPerRequest;
    const apiCost = inputCost + cachedInputCost + outputCost + extraUsageCost;
    const otherVariableCost = users * variableCostPerUser;
    const totalCost = apiCost + otherVariableCost + fixedCost;
    const revenue = users * pricePerUser;
    const grossProfit = revenue - totalCost;
    const grossMarginPct = revenue > 0 ? (grossProfit / revenue) * 100 : null;
    const apiCostPerRequest = monthlyRequests > 0 ? apiCost / monthlyRequests : null;
    const totalCostPerUser = users > 0 ? totalCost / users : null;
    const breakEvenPrice = users > 0 ? totalCost / users : null;
    const variableCostPerUserTotal = variableCostPerUser + (users > 0 ? apiCost / users : 0);
    const contributionPerUser = pricePerUser - variableCostPerUserTotal;
    const breakEvenUsers = contributionPerUser > 0 ? Math.ceil(fixedCost / contributionPerUser) : null;

    return { users, monthlyRequests, totalInputTokens, cachedInputTokens, uncachedInputTokens, totalOutputTokens, inputCost, cachedInputCost, outputCost, extraUsageCost, apiCost, otherVariableCost, fixedCost, totalCost, revenue, grossProfit, grossMarginPct, apiCostPerRequest, totalCostPerUser, breakEvenPrice, breakEvenUsers };
  }

  function compareModels(values, models) {
    return models.map((model) => ({ model, result: calculateEstimate(values, model) }))
      .sort((a, b) => a.result.apiCost - b.result.apiCost);
  }

  const api = { MODELS, PRESETS, calculateEstimate, compareModels, formatMaskedNumber };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.AiApiCostCalculator = api;
  if (typeof document === "undefined") return;

  const form = document.querySelector("[data-ai-cost-form]");
  if (!form) return;
  const modelSelect = form.elements.model;
  const providerSelect = form.elements.provider;
  const presetSelect = form.elements.preset;
  const results = document.querySelector("[data-ai-cost-results]");
  const comparisonBody = document.querySelector("[data-model-comparison]");
  const sourceLink = document.querySelector("[data-pricing-source]");
  const rateNote = document.querySelector("[data-rate-note]");
  const customFields = document.querySelector("[data-custom-rates]");
  const currencySelect = form.elements.currency;
  const exchangeField = form.elements.usdToAed;
  const exchangeWrap = document.querySelector("[data-exchange-rate]");
  const trackedActions = new Set();

  function trackToolUse(byUser, action) {
    if (!byUser || trackedActions.has(action)) return;
    const analytics = root.siteAnalytics;
    if (!analytics || typeof analytics.track !== "function") return;
    trackedActions.add(action);
    analytics.track("tool_used", { tool_name: "ai_api_cost_calculator", tool_action: action });
  }

  function availableModels() { return MODELS.filter((model) => model.provider === providerSelect.value); }
  function populateModels(preferredId) {
    const models = availableModels();
    modelSelect.innerHTML = "";
    models.forEach((model) => {
      const option = document.createElement("option");
      option.value = model.id;
      option.textContent = model.name;
      modelSelect.appendChild(option);
    });
    const preferred = models.find((model) => model.id === preferredId);
    modelSelect.value = preferred ? preferred.id : models[0].id;
  }
  function selectedModel() { return MODELS.find((model) => model.id === modelSelect.value) || MODELS[0]; }
  function readValues() { return Object.fromEntries(new FormData(form).entries()); }
  function activeRates() {
    if (form.elements.customRates.checked) return { input: form.elements.customInput.value, cached: form.elements.customCached.value, output: form.elements.customOutput.value };
    return selectedModel();
  }
  function currencyFactor() { return currencySelect.value === "AED" ? cleanNumber(exchangeField.value) || 1 : 1; }
  function money(value, digits = 2) {
    const amount = value * currencyFactor();
    return new Intl.NumberFormat("en-US", { style: "currency", currency: currencySelect.value, minimumFractionDigits: digits, maximumFractionDigits: digits }).format(amount);
  }
  function compact(value) { return new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 }).format(value); }
  function setResult(name, value) { const element = results.querySelector(`[data-result='${name}']`); if (element) element.textContent = value; }
  function updateRateDetails() {
    const model = selectedModel();
    sourceLink.href = model.source;
    sourceLink.textContent = `${model.provider} official pricing`;
    rateNote.textContent = model.note || "Standard token rates, per 1 million tokens.";
    customFields.hidden = !form.elements.customRates.checked;
    exchangeWrap.hidden = currencySelect.value !== "AED";
  }
  function renderComparison(values) {
    comparisonBody.innerHTML = "";
    compareModels(values, availableModels()).forEach(({ model, result }) => {
      const row = document.createElement("tr");
      const current = model.id === modelSelect.value ? " <span>Selected</span>" : "";
      row.innerHTML = `<th scope="row">${model.name}${current}</th><td>${money(result.apiCost)}</td><td>${money(result.apiCostPerRequest || 0, 4)}</td>`;
      comparisonBody.appendChild(row);
    });
  }
  function render() {
    updateRateDetails();
    const values = readValues();
    const estimate = calculateEstimate(values, activeRates());
    setResult("monthlyRequests", compact(estimate.monthlyRequests));
    setResult("apiCost", money(estimate.apiCost));
    setResult("totalCost", money(estimate.totalCost));
    setResult("revenue", money(estimate.revenue));
    setResult("grossProfit", money(estimate.grossProfit));
    setResult("grossMargin", estimate.grossMarginPct === null ? "—" : `${estimate.grossMarginPct.toFixed(1)}%`);
    setResult("costPerUser", estimate.totalCostPerUser === null ? "—" : money(estimate.totalCostPerUser));
    setResult("costPerRequest", estimate.apiCostPerRequest === null ? "—" : money(estimate.apiCostPerRequest, 4));
    setResult("breakEvenPrice", estimate.breakEvenPrice === null ? "—" : money(estimate.breakEvenPrice));
    setResult("breakEvenUsers", estimate.breakEvenUsers === null ? "Not reachable" : compact(estimate.breakEvenUsers));
    setResult("uncachedTokens", compact(estimate.uncachedInputTokens));
    setResult("cachedTokens", compact(estimate.cachedInputTokens));
    setResult("outputTokens", compact(estimate.totalOutputTokens));
    setResult("inputCost", money(estimate.inputCost));
    setResult("cachedCost", money(estimate.cachedInputCost));
    setResult("outputCost", money(estimate.outputCost));
    setResult("extraCost", money(estimate.extraUsageCost));
    const verdict = results.querySelector("[data-margin-verdict]");
    verdict.className = "ai-margin-verdict" + (estimate.grossMarginPct !== null && estimate.grossMarginPct < 0 ? " is-negative" : estimate.grossMarginPct !== null && estimate.grossMarginPct < 60 ? " is-warning" : "");
    verdict.textContent = estimate.grossMarginPct === null ? "Add a subscription price to see margin." : estimate.grossMarginPct < 0 ? "This usage plan loses money at the entered price." : estimate.grossMarginPct < 60 ? "Margin is positive, but usage or pricing may need tighter limits." : "The entered price covers the estimated usage with room for overhead.";
    renderComparison(values);
  }

  function applyPreset() {
    const preset = PRESETS[presetSelect.value];
    if (!preset) return;
    Object.entries(preset).forEach(([name, value]) => { if (form.elements[name]) form.elements[name].value = value; });
    form.querySelectorAll("[data-number-mask]").forEach((field) => { field.value = formatMaskedNumber(field.value, Number(field.dataset.decimals || 0)); });
    render();
  }
  function maskField(field) { field.value = formatMaskedNumber(field.value, Number(field.dataset.decimals || 0)); }

  form.querySelectorAll("[data-number-mask]").forEach((field) => field.addEventListener("input", () => maskField(field)));
  providerSelect.addEventListener("change", () => { populateModels(); render(); });
  modelSelect.addEventListener("change", render);
  presetSelect.addEventListener("change", (event) => { applyPreset(); trackToolUse(event.isTrusted, "load_preset"); });
  form.addEventListener("input", render);
  let submitClickedByUser = false;
  const submitButton = form.querySelector('button[type="submit"]');
  submitButton.addEventListener("click", (event) => { submitClickedByUser = event.isTrusted; });
  form.addEventListener("submit", (event) => { event.preventDefault(); render(); trackToolUse(submitClickedByUser, "calculate"); submitClickedByUser = false; results.scrollIntoView({ behavior: "smooth", block: "start" }); });
  document.querySelector("[data-reset-ai-cost]").addEventListener("click", () => { form.reset(); providerSelect.value = "OpenAI"; populateModels("gpt-6.1-sol"); applyPreset(); });

  populateModels("gpt-6.1-sol");
  applyPreset();
})(typeof window !== "undefined" ? window : globalThis);
