(function saasMetricsCalculatorModule(root) {
  "use strict";

  function stripNumberFormatting(value) {
    return String(value ?? "").replace(/,/g, "");
  }

  function formatMaskedNumber(value, mode) {
    const integerOnly = mode === "integer";
    let cleaned = stripNumberFormatting(value).replace(integerOnly ? /[^\d]/g : /[^\d.]/g, "");

    if (!integerOnly) {
      const decimalIndex = cleaned.indexOf(".");
      if (decimalIndex !== -1) {
        cleaned = cleaned.slice(0, decimalIndex + 1)
          + cleaned.slice(decimalIndex + 1).replace(/\./g, "").slice(0, 2);
      }
    }

    if (!cleaned) return "";

    const hasDecimal = cleaned.includes(".");
    let [whole, decimals = ""] = cleaned.split(".");
    whole = whole.replace(/^0+(?=\d)/, "") || "0";
    const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");

    return integerOnly ? grouped : `${grouped}${hasDecimal ? `.${decimals}` : ""}`;
  }

  function finiteNumber(value) {
    const number = Number(stripNumberFormatting(value));
    return Number.isFinite(number) ? Math.max(0, number) : 0;
  }

  function calculateMetrics(values) {
    const input = {
      mrr: finiteNumber(values.mrr),
      customers: finiteNumber(values.customers),
      grossMarginPct: Math.min(100, finiteNumber(values.grossMarginPct)),
      customerChurnPct: Math.min(100, finiteNumber(values.customerChurnPct)),
      newMrr: finiteNumber(values.newMrr),
      expansionMrr: finiteNumber(values.expansionMrr),
      contractionMrr: finiteNumber(values.contractionMrr),
      churnedMrr: finiteNumber(values.churnedMrr),
      salesMarketingSpend: finiteNumber(values.salesMarketingSpend),
      newCustomers: finiteNumber(values.newCustomers)
    };

    const grossMargin = input.grossMarginPct / 100;
    const customerChurn = input.customerChurnPct / 100;
    const arr = input.mrr * 12;
    const arpa = input.customers > 0 ? input.mrr / input.customers : null;
    const netNewMrr = input.newMrr + input.expansionMrr - input.contractionMrr - input.churnedMrr;
    const mrrGrowthPct = input.mrr > 0 ? (netNewMrr / input.mrr) * 100 : null;
    const nrrPct = input.mrr > 0
      ? ((input.mrr + input.expansionMrr - input.contractionMrr - input.churnedMrr) / input.mrr) * 100
      : null;
    const cac = input.newCustomers > 0 ? input.salesMarketingSpend / input.newCustomers : null;
    const ltv = arpa !== null && customerChurn > 0
      ? (arpa * grossMargin) / customerChurn
      : null;
    const grossMarginMrrPerCustomer = arpa !== null ? arpa * grossMargin : null;
    const cacPaybackMonths = cac !== null && grossMarginMrrPerCustomer > 0
      ? cac / grossMarginMrrPerCustomer
      : null;
    const ltvToCac = ltv !== null && cac > 0 ? ltv / cac : null;
    const projectedMrr12 = Math.max(0, input.mrr + (netNewMrr * 12));

    return {
      input,
      arr,
      arpa,
      netNewMrr,
      mrrGrowthPct,
      nrrPct,
      cac,
      ltv,
      cacPaybackMonths,
      ltvToCac,
      projectedMrr12
    };
  }

  const api = { calculateMetrics, formatMaskedNumber };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SaaSMetricsCalculator = api;

  if (typeof document === "undefined") return;

  const form = document.querySelector("[data-saas-metrics-form]");
  if (!form) return;

  // Counts real tool use in Google Analytics, once per action per page view,
  // because results update on every keystroke. style.js only sends it after
  // the visitor accepts analytics. Only trusted (real user) events count, so a
  // script or bot that fills the form is ignored. Never include the numbers.
  const trackedActions = new Set();
  function trackToolUse(byUser, action) {
    if (!byUser || trackedActions.has(action)) return;
    const analytics = root.siteAnalytics;
    if (!analytics || typeof analytics.track !== "function") return;
    trackedActions.add(action);
    analytics.track("tool_used", { tool_name: "saas_metrics_calculator", tool_action: action });
  }

  const currencySelect = form.querySelector("[name='currency']");
  const results = document.querySelector("[data-saas-results]");
  const resetButton = document.querySelector("[data-reset-metrics]");
  const sampleButton = document.querySelector("[data-load-metrics-sample]");
  const summary = document.querySelector("[data-metrics-summary]");
  const maskedFields = Array.from(form.querySelectorAll("[data-number-mask]"));

  function applyNumberMask(field) {
    const previousValue = field.value;
    const previousCursor = field.selectionStart ?? previousValue.length;
    const meaningfulCharacters = (previousValue.slice(0, previousCursor).match(/[\d.]/g) || []).length;

    field.value = formatMaskedNumber(previousValue, field.dataset.numberMask);

    let nextCursor = 0;
    let seenCharacters = 0;
    while (nextCursor < field.value.length && seenCharacters < meaningfulCharacters) {
      if (/[\d.]/.test(field.value[nextCursor])) seenCharacters += 1;
      nextCursor += 1;
    }
    field.setSelectionRange(nextCursor, nextCursor);
  }

  function readValues() {
    return Object.fromEntries(new FormData(form).entries());
  }

  function moneyFormatter(currency, compact) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? "compact" : "standard"
    });
  }

  function formatMoney(value, currency, compact) {
    return value === null ? "—" : moneyFormatter(currency, compact).format(value);
  }

  function formatPercent(value) {
    return value === null ? "—" : `${value.toFixed(1)}%`;
  }

  function formatNumber(value, suffix) {
    return value === null ? "—" : `${value.toFixed(1)}${suffix || ""}`;
  }

  function setResult(name, value) {
    const target = results.querySelector(`[data-result='${name}']`);
    if (target) target.textContent = value;
  }

  function buildSummary(metrics) {
    const notes = [];
    if (metrics.mrrGrowthPct === null) {
      notes.push("Add current MRR to calculate growth and net revenue retention.");
    } else if (metrics.netNewMrr > 0) {
      notes.push("Your entered monthly MRR movement is positive after contraction and churn.");
    } else if (metrics.netNewMrr < 0) {
      notes.push("Your entered monthly MRR movement is negative after contraction and churn.");
    } else {
      notes.push("Your entered monthly MRR movement is currently flat.");
    }

    if (metrics.nrrPct !== null) {
      notes.push(metrics.nrrPct >= 100
        ? "Existing-customer expansion covers the entered contraction and churn."
        : "Entered contraction and churn are larger than existing-customer expansion.");
    }

    if (metrics.ltv === null) {
      notes.push("LTV needs customers, gross margin and a monthly customer churn rate above zero.");
    }
    if (metrics.cac === null) {
      notes.push("CAC needs at least one newly acquired customer for the period.");
    }
    return notes;
  }

  function render() {
    const currency = currencySelect.value || "USD";
    const metrics = calculateMetrics(readValues());

    setResult("mrr", formatMoney(metrics.input.mrr, currency, true));
    setResult("arr", formatMoney(metrics.arr, currency, true));
    setResult("arpa", formatMoney(metrics.arpa, currency, false));
    setResult("netNewMrr", formatMoney(metrics.netNewMrr, currency, false));
    setResult("mrrGrowthPct", formatPercent(metrics.mrrGrowthPct));
    setResult("nrrPct", formatPercent(metrics.nrrPct));
    setResult("cac", formatMoney(metrics.cac, currency, false));
    setResult("ltv", formatMoney(metrics.ltv, currency, false));
    setResult("cacPaybackMonths", formatNumber(metrics.cacPaybackMonths, " months"));
    setResult("ltvToCac", metrics.ltvToCac === null ? "—" : `${metrics.ltvToCac.toFixed(1)}×`);
    setResult("projectedMrr12", formatMoney(metrics.projectedMrr12, currency, true));

    summary.innerHTML = "";
    buildSummary(metrics).forEach((note) => {
      const item = document.createElement("li");
      item.textContent = note;
      summary.appendChild(item);
    });
  }

  maskedFields.forEach((field) => {
    field.addEventListener("input", function handleMaskedInput() {
      applyNumberMask(field);
    });
    field.addEventListener("blur", function handleMaskedBlur() {
      if (field.value.endsWith(".")) field.value = field.value.slice(0, -1);
      applyNumberMask(field);
      render();
    });
  });

  // Browsers mark every submit event as trusted, even one started by a script,
  // so remember whether a person actually clicked the submit button.
  let submitClickedByUser = false;
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.addEventListener("click", function handleSubmitClick(event) {
      submitClickedByUser = event.isTrusted;
    });
  }

  form.addEventListener("input", function handleInput(event) {
    render();
    trackToolUse(event.isTrusted, "calculate");
  });
  form.addEventListener("submit", function handleSubmit(event) {
    event.preventDefault();
    render();
    trackToolUse(submitClickedByUser, "calculate");
    submitClickedByUser = false;
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  resetButton.addEventListener("click", function resetMetrics() {
    form.reset();
    maskedFields.forEach(applyNumberMask);
    render();
  });

  sampleButton.addEventListener("click", function loadSample(event) {
    const sample = {
      currency: "USD",
      mrr: 24000,
      customers: 120,
      grossMarginPct: 82,
      customerChurnPct: 2.5,
      newMrr: 4200,
      expansionMrr: 1800,
      contractionMrr: 500,
      churnedMrr: 1200,
      salesMarketingSpend: 18000,
      newCustomers: 18
    };
    Object.entries(sample).forEach(([name, value]) => {
      const field = form.elements.namedItem(name);
      if (field) field.value = value;
    });
    maskedFields.forEach(applyNumberMask);
    render();
    trackToolUse(event.isTrusted, "sample");
  });

  maskedFields.forEach(applyNumberMask);
  render();
})(typeof window !== "undefined" ? window : globalThis);
