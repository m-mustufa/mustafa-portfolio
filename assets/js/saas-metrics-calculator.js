(function saasMetricsCalculatorModule(root) {
  "use strict";

  function finiteNumber(value) {
    const number = Number(value);
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

  const api = { calculateMetrics };
  if (typeof module !== "undefined" && module.exports) module.exports = api;
  root.SaaSMetricsCalculator = api;

  if (typeof document === "undefined") return;

  const form = document.querySelector("[data-saas-metrics-form]");
  if (!form) return;

  const currencySelect = form.querySelector("[name='currency']");
  const results = document.querySelector("[data-saas-results]");
  const resetButton = document.querySelector("[data-reset-metrics]");
  const sampleButton = document.querySelector("[data-load-metrics-sample]");
  const summary = document.querySelector("[data-metrics-summary]");

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

  form.addEventListener("input", render);
  form.addEventListener("submit", function handleSubmit(event) {
    event.preventDefault();
    render();
    results.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  resetButton.addEventListener("click", function resetMetrics() {
    form.reset();
    render();
  });

  sampleButton.addEventListener("click", function loadSample() {
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
    render();
  });

  render();
})(typeof window !== "undefined" ? window : globalThis);
