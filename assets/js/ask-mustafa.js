(function () {
  "use strict";

  const app = document.querySelector("[data-ask-mustafa]");
  if (!app) return;

  const form = app.querySelector("[data-ask-form]");
  const input = app.querySelector("[data-ask-input]");
  const panel = app.querySelector("[data-ask-panel]");
  const closeButton = app.querySelector("[data-ask-close]");
  const dismissButton = app.querySelector("[data-ask-dismiss]");
  const openButton = app.querySelector("[data-ask-open]");
  const conversation = app.querySelector("[data-ask-conversation]");
  const status = app.querySelector("[data-ask-status]");
  const submit = app.querySelector("[data-ask-submit]");
  const history = [];
  const isLocalPreview = window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const placeholderQuestions = [
    "How many years of full-stack experience do you have?",
    "Tell me about your Angular expertise.",
    "Which SaaS and AI products have you built?",
    "Are you available for a UAE project?"
  ];
  let isSending = false;
  let placeholderQuestionIndex = 0;
  let placeholderCharacterIndex = 0;
  let isDeletingPlaceholder = false;
  let placeholderTimer = null;
  let launcherTimer = null;

  const sampleAnswers = [
    {
      terms: ["angular", "rxjs", "ngrx", "legacy", "upgrade", "migration"],
      answer: "I’ve worked extensively with Angular in production, including complex AutoLeap frontends, RxJS and NgRx state flows, framework upgrades, debugging and performance work. I can help with new Angular development or careful modernization of an existing application."
    },
    {
      terms: ["ai assistant", "ai agent", "rag", "openai", "automation", "artificial intelligence"],
      answer: "Yes, I can build AI features connected to real SaaS workflows, including assistants, RAG search, scoring, summaries and automation. I also handle the production concerns around the model: tenant isolation, permissions, secure APIs, approval steps, testing and cost controls."
    },
    {
      terms: ["stripe", "billing", "subscription", "payment", "per-seat"],
      answer: "I work with Stripe subscriptions, per-seat billing, Customer Portal flows and webhook-driven payment synchronization. CultureAI is a relevant example because its subscription logic is connected to multi-tenant access and product permissions."
    },
    {
      terms: ["supabase", "postgres", "database", "rls", "authentication", "rbac", "permission"],
      answer: "I build tenant-aware data and access layers with Supabase, PostgreSQL, Row Level Security, authentication and RBAC. CultureAI and BWL League both required multi-role product flows rather than a simple single-user database."
    },
    {
      terms: ["backend", "api", "node.js", "nodejs", "integration"],
      answer: "I build Node.js APIs, backend integrations and product services with clear ownership and maintainable data flows. That includes authentication, third-party APIs, webhooks, databases and the operational work needed after launch."
    },
    {
      terms: ["react", "next.js", "nextjs", "frontend", "pwa", "offline"],
      answer: "I build React and Next.js product interfaces with TypeScript, responsive components and practical state management. Apex Logistics is a relevant example: it uses TanStack Query and offline-ready PWA behavior for freight and driver workflows."
    },
    {
      terms: ["shopify", "store", "ecommerce", "e-commerce"],
      answer: "Yes, Shopify storefronts and ecommerce integrations are part of my published work. I can help with storefront development, integrations and the surrounding product workflows, depending on what already exists and what the store needs to achieve."
    },
    {
      terms: ["price", "pricing", "cost", "charge", "budget", "rate"],
      answer: "Pricing depends on the scope, current codebase, integrations and delivery risk. Share what you want to build, what already exists and your target timeline; I can then recommend a focused milestone or a complete-product engagement."
    },
    {
      terms: ["experience", "years", "long"],
      answer: "I’m Mustafa, a senior full-stack SaaS and AI engineer with 11+ years of experience building and maintaining production software."
    },
    {
      terms: ["product", "products", "built", "project", "projects", "portfolio"],
      answer: "I’ve worked on products including CultureAI, AutoLeap, BWL League, Apex Logistics and JobHunter. My work covers multi-tenant SaaS, AI workflows, enterprise applications, realtime platforms and offline-ready PWAs."
    },
    {
      terms: ["technology", "technologies", "tech stack", "skills"],
      answer: "My core stack includes React, Next.js, TypeScript, Node.js, Angular, Supabase, PostgreSQL and MongoDB. I also work with Stripe billing, authentication, RBAC, APIs, PWAs and practical AI integrations."
    },
    {
      terms: ["uae", "available", "availability", "hire", "dubai", "abu dhabi"],
      answer: "Yes, I work with UAE businesses and remote product teams. Share your project scope through the contact section and I can confirm availability, approach and the right engagement model."
    },
    {
      terms: ["cultureai", "culture ai"],
      answer: "I built CultureAI as a multi-tenant employee-engagement SaaS product with surveys, AI summaries, role-based access and Stripe subscription billing."
    }
  ];

  function addMessage(role, text) {
    const row = document.createElement("div");
    row.className = "ask-mustafa-message ask-mustafa-message-" + role;

    if (role === "assistant") {
      const avatar = document.createElement("span");
      avatar.className = "ask-mustafa-avatar";
      avatar.textContent = "M";
      avatar.setAttribute("aria-hidden", "true");
      row.appendChild(avatar);
    }

    const body = document.createElement("p");
    body.textContent = text;
    row.appendChild(body);
    conversation.appendChild(row);
    conversation.scrollTop = conversation.scrollHeight;
  }

  function getSampleAnswer(question) {
    const normalized = question.toLowerCase();
    const match = sampleAnswers.find(function (item) {
      return item.terms.some(function (term) { return normalized.includes(term); });
    });

    return match
      ? match.answer
      : "This local preview currently uses sample answers. Once the design is approved, the Groq-powered version will answer verified questions about my work and direct anything unconfirmed to the contact form.";
  }

  function setSending(sending) {
    isSending = sending;
    input.disabled = sending;
    submit.disabled = sending;
    status.textContent = sending ? "Mustafa’s assistant is thinking…" : "";

    if (sending) {
      window.clearTimeout(placeholderTimer);
    } else if (!input.value) {
      startPlaceholderAnimation(500);
    }
  }

  function animatePlaceholder() {
    if (reduceMotion || input.value || isSending) return;

    const question = placeholderQuestions[placeholderQuestionIndex];
    const visibleText = question.slice(0, placeholderCharacterIndex);
    input.placeholder = visibleText;

    if (!isDeletingPlaceholder && placeholderCharacterIndex < question.length) {
      placeholderCharacterIndex += 1;
      placeholderTimer = window.setTimeout(animatePlaceholder, 42);
      return;
    }

    if (!isDeletingPlaceholder) {
      isDeletingPlaceholder = true;
      placeholderTimer = window.setTimeout(animatePlaceholder, 1800);
      return;
    }

    if (placeholderCharacterIndex > 0) {
      placeholderCharacterIndex -= 1;
      placeholderTimer = window.setTimeout(animatePlaceholder, 22);
      return;
    }

    isDeletingPlaceholder = false;
    placeholderQuestionIndex = (placeholderQuestionIndex + 1) % placeholderQuestions.length;
    placeholderTimer = window.setTimeout(animatePlaceholder, 380);
  }

  function startPlaceholderAnimation(delay) {
    window.clearTimeout(placeholderTimer);
    if (reduceMotion) {
      input.placeholder = placeholderQuestions[0];
      return;
    }
    if (input.value || isSending) return;
    placeholderTimer = window.setTimeout(animatePlaceholder, delay || 0);
  }

  async function submitQuestion(question) {
    panel.hidden = false;
    addMessage("user", question);

    if (isLocalPreview) {
      status.textContent = "Local preview — sample answer, no API request made.";
      window.setTimeout(function () {
        addMessage("assistant", getSampleAnswer(question));
      }, 280);
      return;
    }

    setSending(true);

    try {
      const controller = new AbortController();
      const timeout = window.setTimeout(function () { controller.abort(); }, 25000);
      const response = await fetch("/.netlify/functions/ask-mustafa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: question, history: history.slice(-6) }),
        signal: controller.signal
      });
      window.clearTimeout(timeout);

      const data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.answer) {
        throw new Error(data.error || "The assistant could not answer right now.");
      }

      addMessage("assistant", data.answer);
      history.push(
        { role: "user", content: question },
        { role: "assistant", content: data.answer }
      );
      if (history.length > 8) history.splice(0, history.length - 8);
    } catch (error) {
      const message = error.name === "AbortError"
        ? "The request timed out. Please try again."
        : "I’m temporarily unavailable. Please try again, or contact Mustafa using the form below.";
      addMessage("assistant", message);
    } finally {
      setSending(false);
      input.focus();
    }
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const question = input.value.trim();
    if (!question || isSending) return;
    input.value = "";
    startPlaceholderAnimation(550);
    submitQuestion(question);
  });

  input.addEventListener("input", function () {
    if (input.value) {
      window.clearTimeout(placeholderTimer);
      return;
    }

    placeholderCharacterIndex = 0;
    isDeletingPlaceholder = false;
    startPlaceholderAnimation(300);
  });

  closeButton.addEventListener("click", function () {
    panel.hidden = true;
    input.focus();
  });

  dismissButton.addEventListener("click", function () {
    panel.hidden = true;
    window.clearTimeout(launcherTimer);
    openButton.hidden = false;
    window.requestAnimationFrame(function () {
      app.classList.add("is-collapsed");
      openButton.focus();
    });
  });

  openButton.addEventListener("click", function () {
    app.classList.remove("is-collapsed");
    if (conversation.children.length) panel.hidden = false;
    input.focus();
    launcherTimer = window.setTimeout(function () {
      openButton.hidden = true;
    }, 320);
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape" && !panel.hidden) {
      panel.hidden = true;
      input.focus();
    }
  });

  input.placeholder = "";
  startPlaceholderAnimation(450);
})();
