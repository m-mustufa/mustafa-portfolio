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
  const modeButtons = Array.from(app.querySelectorAll("[data-ask-mode]"));
  const scopeIntro = app.querySelector("[data-ask-scope-intro]");
  const scopeShortcut = app.querySelector("[data-ask-scope-shortcut]");
  const exampleButton = app.querySelector("[data-ask-example]");
  const histories = { ask: [], scope: [] };
  const isLocalPreview = window.location.protocol === "file:" || window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const minimumThinkingTime = 750;
  const placeholderQuestions = {
    ask: [
      "How many years of full-stack experience do you have?",
      "Tell me about your Angular expertise.",
      "Which SaaS and AI products have you built?",
      "Are you available for a UAE project?"
    ],
    scope: [
      "Describe your product, users, must-have workflow and deadline...",
      "Paste the rough idea. I will separate MVP from nice-to-have features..."
    ]
  };
  let isSending = false;
  let placeholderQuestionIndex = 0;
  let placeholderCharacterIndex = 0;
  let isDeletingPlaceholder = false;
  let placeholderTimer = null;
  let launcherTimer = null;
  let currentMode = "ask";

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

  function addMessage(role, text, options) {
    const messageOptions = options || {};
    const row = document.createElement("div");
    row.className = "ask-mustafa-message ask-mustafa-message-" + role;

    if (role === "assistant") {
      const avatar = document.createElement("span");
      avatar.className = "ask-mustafa-avatar";
      avatar.setAttribute("aria-hidden", "true");

      const avatarImage = document.createElement("img");
      avatarImage.src = "assets/img/logo-2-128.webp";
      avatarImage.alt = "";
      avatarImage.width = 128;
      avatarImage.height = 156;
      avatar.appendChild(avatarImage);
      row.appendChild(avatar);
    }

    const content = document.createElement("div");
    content.className = "ask-mustafa-message-content";
    const body = document.createElement("p");
    body.textContent = text;
    content.appendChild(body);

    if (role === "assistant" && messageOptions.copyable) {
      const copyButton = document.createElement("button");
      copyButton.type = "button";
      copyButton.className = "ask-mustafa-copy";
      copyButton.textContent = "Copy brief";
      copyButton.addEventListener("click", async function () {
        try {
          await navigator.clipboard.writeText(text);
          copyButton.textContent = "Copied";
          window.setTimeout(function () { copyButton.textContent = "Copy brief"; }, 1800);
        } catch (_error) {
          copyButton.textContent = "Select and copy";
        }
      });
      content.appendChild(copyButton);
    }

    row.appendChild(content);
    conversation.appendChild(row);
    conversation.scrollTop = conversation.scrollHeight;
    return row;
  }

  function addThinkingMessage() {
    const row = addMessage("assistant", "");
    const body = row.querySelector("p");
    const label = document.createElement("span");
    const dots = document.createElement("span");

    row.classList.add("is-thinking");
    body.setAttribute("role", "status");
    body.setAttribute("aria-label", "Mustafa’s assistant is thinking");
    label.textContent = "Thinking";
    dots.className = "ask-mustafa-thinking-dots";
    dots.setAttribute("aria-hidden", "true");

    for (let index = 0; index < 3; index += 1) {
      dots.appendChild(document.createElement("i"));
    }

    body.append(label, dots);
    return row;
  }

  function wait(milliseconds) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, milliseconds);
    });
  }

  async function finishThinking(startedAt) {
    const elapsed = performance.now() - startedAt;
    await wait(Math.max(0, minimumThinkingTime - elapsed));
  }

  function getSampleAnswer(question) {
    if (currentMode === "scope") {
      return "WHAT YOU ARE BUILDING\nA focused SaaS product based on the idea you pasted.\n\nMVP NOW\n- One clear user role and core workflow\n- Secure sign-in and tenant-aware data\n- The single action that proves the product is useful\n- Basic admin visibility and error tracking\n\nPOSTPONE\n- Advanced analytics\n- Multiple billing plans\n- Broad integrations\n\nCOMPLEXITY\nMedium - the core workflow is focused, but permissions and data ownership need careful design.\n\nFIRST MILESTONE\nA clickable workflow backed by real authentication and test data.\n\nOPEN QUESTIONS\n- Who is the first paying user?\n- Which result must they get in the first session?";
    }
    const normalized = question.toLowerCase();
    const match = sampleAnswers.find(function (item) {
      return item.terms.some(function (term) { return normalized.includes(term); });
    });

    return match
      ? match.answer
      : "This local preview uses sample answers. On Netlify, Gemini answers first and Groq takes over automatically if Gemini is unavailable.";
  }

  function activePlaceholders() {
    return placeholderQuestions[currentMode];
  }

  function resizeInput() {
    input.style.height = "";
    if (input.scrollHeight > input.clientHeight) {
      input.style.height = (input.scrollHeight + 2) + "px";
    }
  }

  function setMode(mode, revealPanel) {
    currentMode = mode === "scope" ? "scope" : "ask";
    app.classList.toggle("is-scope-mode", currentMode === "scope");
    input.maxLength = currentMode === "scope" ? 1200 : 300;
    scopeIntro.hidden = currentMode !== "scope";
    scopeShortcut.textContent = currentMode === "scope" ? "Ask me" : "Scope idea";
    scopeShortcut.setAttribute("aria-label", currentMode === "scope" ? "Switch to Ask Mustafa" : "Open Scope Doctor");

    modeButtons.forEach(function (button) {
      const active = button.getAttribute("data-ask-mode") === currentMode;
      button.classList.toggle("is-active", active);
      button.setAttribute("aria-pressed", String(active));
    });

    placeholderQuestionIndex = 0;
    placeholderCharacterIndex = 0;
    isDeletingPlaceholder = false;
    input.placeholder = "";
    startPlaceholderAnimation(120);

    if (revealPanel || currentMode === "scope") panel.hidden = false;
    resizeInput();
    input.focus();
  }

  function setSending(sending) {
    isSending = sending;
    input.disabled = sending;
    submit.disabled = sending;
    scopeShortcut.disabled = sending;
    exampleButton.disabled = sending;
    modeButtons.forEach(function (button) { button.disabled = sending; });
    status.textContent = "";

    if (sending) {
      window.clearTimeout(placeholderTimer);
    } else if (!input.value) {
      startPlaceholderAnimation(500);
    }
  }

  function animatePlaceholder() {
    if (reduceMotion || input.value || isSending) return;

    const questions = activePlaceholders();
    const question = questions[placeholderQuestionIndex];
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
    placeholderQuestionIndex = (placeholderQuestionIndex + 1) % questions.length;
    placeholderTimer = window.setTimeout(animatePlaceholder, 380);
  }

  function startPlaceholderAnimation(delay) {
    window.clearTimeout(placeholderTimer);
    if (reduceMotion) {
      input.placeholder = activePlaceholders()[0];
      return;
    }
    if (input.value || isSending) return;
    placeholderTimer = window.setTimeout(animatePlaceholder, delay || 0);
  }

  async function submitQuestion(question) {
    panel.hidden = false;
    addMessage("user", question);
    const thinkingMessage = addThinkingMessage();
    const thinkingStartedAt = performance.now();
    setSending(true);

    try {
      if (isLocalPreview) {
        await finishThinking(thinkingStartedAt);
        thinkingMessage.remove();
        addMessage("assistant", getSampleAnswer(question), { copyable: currentMode === "scope" });
        status.textContent = "Local preview — sample answer, no API request made.";
        return;
      }

      const controller = new AbortController();
      const timeout = window.setTimeout(function () { controller.abort(); }, 25000);
      const response = await fetch("/.netlify/functions/ask-mustafa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: question,
          mode: currentMode,
          history: histories[currentMode].slice(-6)
        }),
        signal: controller.signal
      });
      window.clearTimeout(timeout);

      const data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data.answer) {
        throw new Error(data.error || "The assistant could not answer right now.");
      }

      await finishThinking(thinkingStartedAt);
      thinkingMessage.remove();
      addMessage("assistant", data.answer, { copyable: currentMode === "scope" });
      histories[currentMode].push(
        { role: "user", content: question },
        { role: "assistant", content: data.answer }
      );
      if (histories[currentMode].length > 8) {
        histories[currentMode].splice(0, histories[currentMode].length - 8);
      }
      status.textContent = data.provider
        ? "Answered with " + (data.provider === "gemini" ? "Gemini" : "Groq") + ". Automatic fallback is enabled."
        : "";
    } catch (error) {
      await finishThinking(thinkingStartedAt);
      thinkingMessage.remove();
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
    resizeInput();
    startPlaceholderAnimation(550);
    submitQuestion(question);
  });

  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      form.requestSubmit();
    }
  });

  input.addEventListener("input", function () {
    resizeInput();
    if (input.value) {
      window.clearTimeout(placeholderTimer);
      return;
    }

    placeholderCharacterIndex = 0;
    isDeletingPlaceholder = false;
    startPlaceholderAnimation(300);
  });

  modeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      setMode(button.getAttribute("data-ask-mode"), true);
    });
  });

  scopeShortcut.addEventListener("click", function () {
    setMode(currentMode === "scope" ? "ask" : "scope", true);
  });

  exampleButton.addEventListener("click", function () {
    setMode("scope", true);
    input.value = "A multi-tenant SaaS for small service businesses. Owners invite staff, assign customer jobs, track status and charge a monthly subscription. I need a useful first version without building every report and integration.";
    window.clearTimeout(placeholderTimer);
    resizeInput();
    input.focus();
  });

  function closePanel() {
    panel.hidden = true;
    // An empty Scope Doctor bar shrinks back to the compact Ask bar once the panel closes.
    if (currentMode === "scope" && !input.value.trim()) setMode("ask", false);
  }

  closeButton.addEventListener("click", function () {
    closePanel();
    input.focus();
  });

  dismissButton.addEventListener("click", function () {
    closePanel();
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
      closePanel();
      input.focus();
    }
  });

  input.placeholder = "";
  setMode("ask", false);
  startPlaceholderAnimation(450);
})();
