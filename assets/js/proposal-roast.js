(function proposalRoastModule(root) {
  "use strict";

  const STOP_WORDS = new Set([
    "about", "after", "again", "all", "also", "and", "any", "are", "been", "before", "being", "between", "both",
    "but", "can", "client", "could", "each", "for", "from", "had", "has", "have", "how", "into", "its", "just",
    "more", "most", "need", "not", "our", "out", "per", "please", "project", "should", "some", "such", "than", "that",
    "the", "their", "them", "then", "there", "these", "they", "this", "through", "using", "very", "want", "was",
    "were", "what", "when", "where", "which", "while", "who", "why", "will", "with", "work", "would", "your", "you"
  ]);

  const GENERIC_JOB_WORDS = new Set([
    "application", "candidate", "developer", "development", "experience", "expert", "freelancer", "help", "hours",
    "already", "current", "explain", "finish", "first", "include", "includes", "looking", "main", "requirements",
    "required", "similar", "skills", "someone", "team", "working"
  ]);

  const CLICHES = [
    "dear hiring manager",
    "dear sir",
    "hope you are doing well",
    "i am writing to",
    "i would love to",
    "i have read your job",
    "i can do this job",
    "i am an expert",
    "perfect fit",
    "best candidate",
    "give me a chance",
    "100% satisfaction",
    "kindly consider",
    "hardworking"
  ];

  const CATEGORY_LABELS = {
    relevance: "Relevance",
    opening: "Opening",
    evidence: "Proof",
    clarity: "Clarity",
    nextStep: "Next step",
    trust: "Trust"
  };

  const CATEGORY_MAX = {
    relevance: 25,
    opening: 20,
    evidence: 20,
    clarity: 15,
    nextStep: 10,
    trust: 10
  };

  function tokenize(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/next\.?js/g, "nextjs")
      .replace(/node\.?js/g, "nodejs")
      .replace(/react\.?js/g, "react")
      .match(/[a-z0-9+#-]{2,}/g) || [];
  }

  function countWords(value) {
    return String(value || "").trim().split(/\s+/).filter(Boolean).length;
  }

  function extractKeywords(value, limit) {
    const frequencies = new Map();
    tokenize(value).forEach((token, index) => {
      if (token.length < 3 || STOP_WORDS.has(token) || GENERIC_JOB_WORDS.has(token) || /^\d+$/.test(token)) return;
      const current = frequencies.get(token) || { count: 0, firstIndex: index };
      current.count += 1;
      frequencies.set(token, current);
    });
    return [...frequencies.entries()]
      .sort((a, b) => b[1].count - a[1].count || a[1].firstIndex - b[1].firstIndex)
      .slice(0, limit)
      .map(([token]) => token);
  }

  function findCliches(proposal) {
    const lower = proposal.toLowerCase();
    return CLICHES.filter((phrase) => lower.includes(phrase));
  }

  function hasAny(value, expressions) {
    return expressions.some((expression) => expression.test(value));
  }

  function displayTerm(value) {
    const knownTerms = { api: "API", nextjs: "Next.js", nodejs: "Node.js", rls: "RLS", saas: "SaaS" };
    return knownTerms[value] || value;
  }

  function naturalList(items) {
    const displayItems = items.map(displayTerm);
    if (!displayItems.length) return "the core deliverable";
    if (displayItems.length === 1) return displayItems[0];
    if (displayItems.length === 2) return `${displayItems[0]} and ${displayItems[1]}`;
    return `${displayItems.slice(0, -1).join(", ")}, and ${displayItems[displayItems.length - 1]}`;
  }

  function buildVerdict(score) {
    if (score >= 80) {
      return {
        label: "Strong and specific",
        summary: "This reads like a tailored response. Tighten any remaining weak section, verify every claim and submit it in your own voice."
      };
    }
    if (score >= 65) {
      return {
        label: "Competitive draft",
        summary: "The proposal has useful signals, but one or two sections still feel easy to skim past. Fix the weakest category first."
      };
    }
    if (score >= 45) {
      return {
        label: "Needs sharper focus",
        summary: "There is a workable draft here, but the client may not quickly see the match, proof or next step."
      };
    }
    return {
      label: "Too generic",
      summary: "The proposal currently sounds reusable. Rebuild it around the client's exact outcome and one truthful piece of evidence."
    };
  }

  function analyzeProposal(jobPost, proposal) {
    const job = String(jobPost || "").trim();
    const pitch = String(proposal || "").trim();
    const proposalLower = pitch.toLowerCase();
    const proposalTokens = new Set(tokenize(pitch));
    const jobKeywords = extractKeywords(job, 16);
    const matchedKeywords = jobKeywords.filter((keyword) => proposalTokens.has(keyword));
    const missingKeywords = jobKeywords.filter((keyword) => !proposalTokens.has(keyword)).slice(0, 6);
    const cliches = findCliches(pitch);
    const words = countWords(pitch);
    const openingText = pitch.split(/\s+/).slice(0, 45).join(" ").toLowerCase();
    const firstSentence = pitch.split(/[.!?]/).find((sentence) => sentence.trim()) || pitch;
    const firstSentenceWords = countWords(firstSentence);
    const openingKeywordMatches = jobKeywords.filter((keyword) => openingText.includes(keyword)).length;

    const relevanceTarget = Math.max(1, Math.min(7, jobKeywords.length));
    const relevance = Math.round(25 * Math.min(matchedKeywords.length / relevanceTarget, 1));

    let opening = Math.min(10, openingKeywordMatches * 3);
    if (!cliches.some((phrase) => openingText.includes(phrase))) opening += 5;
    if (/\b(your|you|brief|goal|outcome|deliverable)\b/.test(openingText)) opening += 3;
    if (firstSentenceWords >= 6 && firstSentenceWords <= 35) opening += 2;
    opening = Math.min(20, opening);

    let evidence = 0;
    if (/\b\d+(?:\.\d+)?\s*(?:%|x|hours?|days?|weeks?|months?|users?|clients?|projects?)?\b/i.test(pitch)) evidence += 7;
    const evidenceSignals = [
      /\b(built|delivered|implemented|integrated|launched|migrated|shipped)\b/i,
      /\b(reduced|increased|improved|saved|grew|cut|fixed)\b/i,
      /\b(similar|example|case study|production|live)\b/i
    ].filter((expression) => expression.test(pitch)).length;
    evidence += Math.min(7, evidenceSignals * 3);
    evidence += Math.min(6, matchedKeywords.length);
    evidence = Math.min(20, evidence);

    let clarity = words >= 80 && words <= 250 ? 8 : words >= 50 && words <= 320 ? 5 : 2;
    const paragraphs = pitch.split(/\n\s*\n/).filter((paragraph) => paragraph.trim()).length;
    clarity += paragraphs >= 2 && paragraphs <= 6 ? 4 : 2;
    const sentences = pitch.split(/[.!?]+/).filter((sentence) => sentence.trim());
    const averageSentenceLength = sentences.length ? words / sentences.length : words;
    clarity += averageSentenceLength >= 6 && averageSentenceLength <= 28 ? 3 : 1;
    clarity = Math.min(15, clarity);

    let nextStep = /\?/.test(pitch) ? 6 : 0;
    if (hasAny(proposalLower, [
      /\b(can we|could we|would you|are you)\b/,
      /\b(schedule|discuss|share|send|call|confirm|available|milestone|setup|next step)\b/
    ])) nextStep += 4;
    nextStep = Math.min(10, nextStep);

    const hypeSignals = [
      /\bguarantee(?:d)?\b/i,
      /\bunlimited revisions\b/i,
      /\bcheapest\b/i,
      /!{2,}/
    ].filter((expression) => expression.test(pitch)).length;
    const trust = Math.max(0, 10 - Math.min(6, cliches.length * 2) - Math.min(4, hypeSignals * 2));

    const categories = { relevance, opening, evidence, clarity, nextStep, trust };
    const score = Object.values(categories).reduce((total, value) => total + value, 0);
    const verdict = buildVerdict(score);
    const strengths = [];
    const fixes = [];

    if (relevance >= 18) strengths.push(`You reflect ${matchedKeywords.length} useful terms from the job instead of ignoring the brief.`);
    else fixes.push(`Bring the client's actual priorities into the proposal. Missing terms include ${naturalList(missingKeywords.slice(0, 3))}.`);

    if (opening >= 14) strengths.push("The opening gets to the client's context quickly instead of spending the first lines on a biography.");
    else fixes.push("Rewrite the first two lines around the client's outcome. Remove greetings and self-focused setup.");

    if (evidence >= 14) strengths.push("You include concrete proof signals such as tools, delivery actions, outcomes or numbers.");
    else fixes.push("Add one truthful example with what you built, what changed and the result. Named tools alone are not proof.");

    if (clarity >= 12) strengths.push(`The ${words}-word length and paragraph structure are easy to scan.`);
    else if (words > 320) fixes.push(`Cut the proposal from ${words} words. Keep the strongest proof, approach and question.`);
    else if (words < 50) fixes.push(`At ${words} words, the proposal needs enough detail to show approach and proof without becoming long.`);
    else fixes.push("Break the proposal into short paragraphs and shorten the longest sentences.");

    if (nextStep >= 8) strengths.push("The ending creates a clear next step instead of stopping with a passive sign-off.");
    else if (/\?/.test(pitch)) fixes.push("Make the closing question more specific to the client's setup, decision or first milestone.");
    else fixes.push("End with one job-specific question that makes it easy for the client to reply.");

    if (!cliches.length && !hypeSignals) strengths.push("The language avoids common proposal clichés and risky guarantees.");
    if (cliches.length) fixes.push(`Remove generic phrases such as “${cliches.slice(0, 2).join("” and “")}”.`);
    if (hypeSignals) fixes.push("Remove guarantees, price-first claims or excessive punctuation that can reduce trust.");

    while (strengths.length < 2) {
      strengths.push(strengths.length ? "The draft can improve quickly because the main gaps are identifiable." : "You have a complete draft that can now be tailored against the job.");
    }
    while (fixes.length < 2) {
      fixes.push("Replace one broad claim with a specific, truthful example from your own work.");
    }

    const focusTerms = jobKeywords.slice(0, 3);
    const questionTerm = displayTerm(focusTerms[0] || "the main deliverable");
    const hook = `Your brief centers on ${naturalList(focusTerms)}. I would start by confirming the main deliverable, then turn it into a small first milestone you can review quickly. Is ${questionTerm} already part of the current setup, or should it be included from the start?`;

    return {
      score,
      verdict,
      categories,
      categoryLabels: CATEGORY_LABELS,
      categoryMax: CATEGORY_MAX,
      strengths: strengths.slice(0, 4),
      fixes: fixes.slice(0, 5),
      cliches,
      missingKeywords,
      matchedKeywords,
      hook,
      wordCount: words
    };
  }

  const core = { analyzeProposal, countWords, extractKeywords };
  if (typeof module !== "undefined" && module.exports) module.exports = core;
  root.ProposalRoastCore = core;

  if (typeof document === "undefined") return;

  const form = document.getElementById("proposalRoastForm");
  if (!form) return;

  // Counts real tool use in Google Analytics. style.js only sends it after the
  // visitor accepts analytics. Never include the job post or proposal text.
  function trackToolUse(action, result) {
    const analytics = root.siteAnalytics;
    if (!analytics || typeof analytics.track !== "function") return;
    const params = { tool_name: "upwork_proposal_roast", tool_action: action };
    if (result) params.tool_result = result;
    analytics.track("tool_used", params);
  }

  const jobPost = document.getElementById("jobPost");
  const proposal = document.getElementById("proposal");
  const jobCount = document.getElementById("jobCount");
  const proposalCount = document.getElementById("proposalCount");
  const formError = document.getElementById("formError");
  const results = document.getElementById("roastResults");
  const scoreRing = document.getElementById("scoreRing");
  const scoreValue = document.getElementById("scoreValue");
  const scoreLabel = document.getElementById("scoreLabel");
  const scoreSummary = document.getElementById("scoreSummary");
  const scoreBreakdown = document.getElementById("scoreBreakdown");
  const strengthsList = document.getElementById("strengthsList");
  const fixesList = document.getElementById("fixesList");
  const hookSuggestion = document.getElementById("hookSuggestion");
  const clicheChips = document.getElementById("clicheChips");
  const keywordChips = document.getElementById("keywordChips");
  const actionStatus = document.getElementById("actionStatus");
  let latestAnalysis = null;

  function updateCounts() {
    jobCount.textContent = `${countWords(jobPost.value)} words`;
    proposalCount.textContent = `${countWords(proposal.value)} words`;
  }

  function setStatus(message) {
    actionStatus.textContent = message;
    window.clearTimeout(setStatus.timer);
    setStatus.timer = window.setTimeout(() => { actionStatus.textContent = ""; }, 3500);
  }

  function replaceList(list, items) {
    list.replaceChildren(...items.map((item) => {
      const li = document.createElement("li");
      li.textContent = item;
      return li;
    }));
  }

  function replaceChips(container, items, type, emptyLabel) {
    const values = items.length ? items : [emptyLabel];
    container.replaceChildren(...values.map((value) => {
      const chip = document.createElement("span");
      chip.className = items.length ? `tool-chip ${type === "keyword" ? "tool-chip-keyword" : ""}`.trim() : "tool-chip tool-chip-empty";
      chip.textContent = type === "keyword" && items.length ? displayTerm(value) : value;
      return chip;
    }));
  }

  function renderBreakdown(analysis) {
    scoreBreakdown.replaceChildren(...Object.entries(analysis.categories).map(([key, value]) => {
      const row = document.createElement("div");
      row.className = "tool-meter-row";

      const label = document.createElement("span");
      label.textContent = analysis.categoryLabels[key];

      const meter = document.createElement("div");
      meter.className = "tool-meter";
      const fill = document.createElement("span");
      fill.style.setProperty("--meter-width", `${Math.round((value / analysis.categoryMax[key]) * 100)}%`);
      meter.appendChild(fill);

      const number = document.createElement("strong");
      number.textContent = `${value}/${analysis.categoryMax[key]}`;

      row.append(label, meter, number);
      return row;
    }));
  }

  function renderAnalysis(analysis) {
    latestAnalysis = analysis;
    scoreRing.style.setProperty("--score", analysis.score);
    scoreValue.textContent = analysis.score;
    scoreLabel.textContent = analysis.verdict.label;
    scoreSummary.textContent = analysis.verdict.summary;
    renderBreakdown(analysis);
    replaceList(strengthsList, analysis.strengths);
    replaceList(fixesList, analysis.fixes);
    hookSuggestion.textContent = analysis.hook;
    replaceChips(clicheChips, analysis.cliches, "cliche", "No obvious clichés found");
    replaceChips(keywordChips, analysis.missingKeywords, "keyword", "Core job terms are covered");
    results.hidden = false;
    results.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
  }

  function validateInputs() {
    const errors = [];
    const jobValid = jobPost.value.trim().length >= 80;
    const proposalValid = proposal.value.trim().length >= 40;
    jobPost.setAttribute("aria-invalid", String(!jobValid));
    proposal.setAttribute("aria-invalid", String(!proposalValid));
    if (!jobValid) errors.push("Paste at least 80 characters from the job post.");
    if (!proposalValid) errors.push("Paste at least 40 characters from your proposal.");
    formError.textContent = errors.join(" ");
    formError.hidden = !errors.length;
    if (errors.length) (jobValid ? proposal : jobPost).focus();
    return !errors.length;
  }

  async function copyText(value, successMessage) {
    try {
      await navigator.clipboard.writeText(value);
      setStatus(successMessage);
    } catch (error) {
      const temporary = document.createElement("textarea");
      temporary.value = value;
      temporary.setAttribute("readonly", "");
      temporary.style.position = "fixed";
      temporary.style.opacity = "0";
      document.body.appendChild(temporary);
      temporary.select();
      document.execCommand("copy");
      temporary.remove();
      setStatus(successMessage);
    }
  }

  function feedbackText() {
    if (!latestAnalysis) return "";
    const categoryLines = Object.entries(latestAnalysis.categories)
      .map(([key, value]) => `${latestAnalysis.categoryLabels[key]}: ${value}/${latestAnalysis.categoryMax[key]}`)
      .join("\n");
    return [
      `Upwork Proposal Roast: ${latestAnalysis.score}/100 (${latestAnalysis.verdict.label})`,
      "",
      categoryLines,
      "",
      "What works:",
      ...latestAnalysis.strengths.map((item) => `- ${item}`),
      "",
      "Fix first:",
      ...latestAnalysis.fixes.map((item) => `- ${item}`),
      "",
      "Suggested opening:",
      latestAnalysis.hook,
      "",
      "Scored free at https://aisaaswithmustafa.com/tools/upwork-proposal-roast.html"
    ].join("\n");
  }

  jobPost.addEventListener("input", updateCounts);
  proposal.addEventListener("input", updateCounts);

  form.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!validateInputs()) return;
    const analysis = analyzeProposal(jobPost.value, proposal.value);
    renderAnalysis(analysis);
    trackToolUse("roast", analysis.verdict.label.toLowerCase().replace(/\s+/g, "_"));
  });

  document.getElementById("loadSample").addEventListener("click", () => {
    jobPost.value = "We need a Next.js developer to finish a subscription SaaS dashboard. The work includes Stripe webhooks, Supabase row level security, an admin view and deployment checks. You should have production experience with TypeScript, payment idempotency and multi-tenant permissions. Please explain a similar project and how you would reduce launch risk.";
    proposal.value = "Your launch risk is mainly in the Stripe and tenant-permission boundaries. I recently implemented a multi-tenant SaaS billing flow with Next.js, TypeScript and verified Stripe webhooks, including idempotent processing and reconciliation checks.\n\nI would first review the current subscription states and Supabase RLS policies, then finish the admin workflow behind explicit role checks. After that I would test retries, duplicate events and failed payments before deployment.\n\nIs the Stripe webhook endpoint already receiving production events, or should the first milestone include the full payment-event setup?";
    updateCounts();
    formError.hidden = true;
    jobPost.removeAttribute("aria-invalid");
    proposal.removeAttribute("aria-invalid");
    jobPost.focus();
  });

  document.getElementById("resetRoast").addEventListener("click", () => {
    latestAnalysis = null;
    results.hidden = true;
    form.reset();
    updateCounts();
    formError.hidden = true;
    jobPost.removeAttribute("aria-invalid");
    proposal.removeAttribute("aria-invalid");
    jobPost.focus();
    window.scrollTo({ top: document.querySelector(".tool-workspace").offsetTop - 90, behavior: "smooth" });
  });

  document.getElementById("copyHook").addEventListener("click", () => {
    if (latestAnalysis) copyText(latestAnalysis.hook, "Opening copied.");
  });

  document.getElementById("copyFeedback").addEventListener("click", () => {
    if (latestAnalysis) copyText(feedbackText(), "Full feedback copied.");
  });

  document.getElementById("shareScore").addEventListener("click", async () => {
    if (!latestAnalysis) return;
    const shareData = {
      title: "My Upwork Proposal Roast",
      text: `My Upwork proposal scored ${latestAnalysis.score}/100: ${latestAnalysis.verdict.label}. Roast yours free.`,
      url: "https://aisaaswithmustafa.com/tools/upwork-proposal-roast.html"
    };
    if (navigator.share) {
      try {
        await navigator.share(shareData);
        setStatus("Score shared.");
        return;
      } catch (error) {
        if (error.name === "AbortError") return;
      }
    }
    copyText(`${shareData.text} ${shareData.url}`, "Share text copied.");
  });

  updateCounts();
}(typeof window !== "undefined" ? window : globalThis));
