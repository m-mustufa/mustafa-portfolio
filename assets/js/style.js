document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  if (menuToggle && mainNav) {
    menuToggle.addEventListener("click", () => {
      const isOpen = !mainNav.classList.toggle("hidden");
      menuToggle.setAttribute("aria-expanded", String(isOpen));
    });

    mainNav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        if (window.innerWidth < 768) {
          mainNav.classList.add("hidden");
          menuToggle.setAttribute("aria-expanded", "false");
        }
      });
    });
  }

  const header = document.querySelector("header");
  if (header) {
    const updateHeader = () => header.classList.toggle("active", window.scrollY > 20);
    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollTopButton = document.getElementById("scrollToTop");

  if (scrollTopButton) {
    const updateScrollTopButton = () => {
      scrollTopButton.classList.toggle("is-visible", window.scrollY > 600);
    };

    updateScrollTopButton();
    window.addEventListener("scroll", updateScrollTopButton, { passive: true });
    scrollTopButton.addEventListener("click", () => {
      window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
    });
  }

  const hero = document.querySelector(".hero-shell");
  const scene = document.getElementById("heroScene");

  if (hero && scene && !reducedMotion) {
    const canTrackPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (canTrackPointer) {
      let pointerFrame = 0;

      hero.addEventListener("pointermove", (event) => {
        if (pointerFrame) window.cancelAnimationFrame(pointerFrame);

        pointerFrame = window.requestAnimationFrame(() => {
          const bounds = hero.getBoundingClientRect();
          const pointerX = event.clientX - bounds.left;
          const pointerY = event.clientY - bounds.top;
          const normalizedX = pointerX / bounds.width - 0.5;
          const normalizedY = pointerY / bounds.height - 0.5;

          hero.style.setProperty("--pointer-x", `${pointerX}px`);
          hero.style.setProperty("--pointer-y", `${pointerY}px`);
          hero.style.setProperty("--ambient-one-x", `${normalizedX * 10}px`);
          hero.style.setProperty("--ambient-one-y", `${normalizedY * 8}px`);
          hero.style.setProperty("--ambient-two-x", `${normalizedX * -7}px`);
          hero.style.setProperty("--ambient-two-y", `${normalizedY * -6}px`);
          hero.classList.add("is-pointer-active");
        });
      });

      hero.addEventListener("pointerleave", () => {
        if (pointerFrame) window.cancelAnimationFrame(pointerFrame);
        pointerFrame = 0;
        hero.classList.remove("is-pointer-active");
        hero.style.setProperty("--ambient-one-x", "0px");
        hero.style.setProperty("--ambient-one-y", "0px");
        hero.style.setProperty("--ambient-two-x", "0px");
        hero.style.setProperty("--ambient-two-y", "0px");
      });
    }

    const updateSceneScroll = () => {
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(-bounds.top / Math.max(bounds.height, 1), 0), 1);
      scene.style.setProperty("--scene-scroll", `${progress * 28}px`);
    };

    updateSceneScroll();
    window.addEventListener("scroll", updateSceneScroll, { passive: true });
  }

  const projectFrame = scene?.querySelector("[data-project-frame]");

  if (scene && projectFrame) {
    const projects = [
      {
        name: "CultureAI",
        kicker: "Flagship SaaS build",
        kind: "AI employee engagement SaaS",
        status: "Live product",
        href: "https://app.startcultureai.com/",
        avif: "assets/img/portfolio/cultureai-ai-employee-engagement-saas-dashboard-banner-600w.avif",
        image: "assets/img/portfolio/cultureai-ai-employee-engagement-saas-dashboard-banner-600w.jpg",
        alt: "CultureAI employee engagement SaaS dashboard and survey analytics",
        badges: [
          ["nextdotjs", "Next.js", "Product UI"],
          ["react", "React", "Interface"],
          ["nodedotjs", "Node.js", "API layer"],
          ["supabase", "Supabase", "Auth + data"],
          ["stripe", "Stripe", "Billing"],
          ["ai", "OpenAI", "Intelligence"],
        ],
      },
      {
        name: "Shopify Social Image Automation",
        kicker: "Shopify automation build",
        kind: "Branded social image app",
        status: "Portfolio project",
        href: "https://aisaaswithmustafa.com/portfolio",
        avif: "assets/img/portfolio/shopify-social-image-automation-whatsapp-open-graph-nodejs-app-600w.avif",
        image: "assets/img/portfolio/shopify-social-image-automation-whatsapp-open-graph-nodejs-app-600w.jpg",
        alt: "Shopify social image automation app generating branded product images for WhatsApp and Open Graph previews",
        badges: [
          ["shopify", "Shopify", "App platform"],
          ["nodedotjs", "Node.js", "Express API"],
          ["graphql", "GraphQL", "Admin API"],
          ["webhook", "Webhooks", "Automation"],
          ["image", "Sharp", "Image rendering"],
          ["vercel", "Vercel", "Deployment"],
        ],
      },
      {
        name: "BWL League",
        kicker: "Production sports build",
        kind: "Multi-role sports platform",
        status: "Live platform",
        href: "https://bwlleague.com/",
        avif: "assets/img/portfolio/football-tournament-dashboard-nextjs-supabase-postgresql-600w.avif",
        image: "assets/img/portfolio/football-tournament-dashboard-nextjs-supabase-postgresql-600w.jpg",
        alt: "BWL League multi-role football tournament dashboard with live standings and team management",
        badges: [
          ["nextdotjs", "Next.js", "Web app"],
          ["supabase", "Supabase", "Backend"],
          ["postgresql", "PostgreSQL", "Database"],
          ["realtime", "Realtime", "Live scores"],
          ["shield", "RLS", "Access control"],
          ["android", "Android", "Mobile support"],
        ],
      },
      {
        name: "AutoLeap",
        kicker: "Enterprise SaaS build",
        kind: "Automotive repair SaaS",
        status: "Production SaaS",
        href: "https://autoleap.com/",
        avif: "assets/img/portfolio/autoleap-dashboard-saas-600w.avif",
        image: "assets/img/portfolio/autoleap-dashboard-saas-600w.jpg",
        alt: "AutoLeap automotive repair SaaS dashboard showing business performance and customer reviews",
        badges: [
          ["angular", "Angular", "Frontend"],
          ["typescript", "TypeScript", "Application"],
          ["nodedotjs", "Node.js", "Services"],
          ["mongodb", "MongoDB", "Data"],
          ["reactivex", "RxJS", "State"],
          ["api", "REST APIs", "Integration"],
        ],
      },
      {
        name: "Apex Logistics",
        kicker: "Offline-first PWA build",
        kind: "GCC logistics platform",
        status: "Live PWA",
        href: "https://apexlogistics.life/",
        avif: "assets/img/portfolio/apex-logistics-driver-job-marketplace-react-tanstack-pwa-600w.avif",
        image: "assets/img/portfolio/apex-logistics-driver-job-marketplace-react-tanstack-pwa-600w.jpg",
        alt: "Apex Logistics GCC freight platform with shipment quotes and driver workflows",
        badges: [
          ["react", "React 19", "Interface"],
          ["tanstack", "TanStack", "Data sync"],
          ["typescript", "TypeScript", "Application"],
          ["firebase", "Firestore", "Cloud data"],
          ["pwa", "PWA", "Offline app"],
          ["database", "IndexedDB", "Local queue"],
        ],
      },
      {
        name: "JobHunter",
        kicker: "AI agent build",
        kind: "AI job application agent",
        status: "Live AI app",
        href: "https://jobhunter-lemon.vercel.app/",
        avif: "assets/img/portfolio/ai-react-nextjs-job-search-agent-banner-600w.avif",
        image: "assets/img/portfolio/ai-react-nextjs-job-search-agent-banner-600w.jpg",
        alt: "JobHunter AI job search and CV tailoring agent built with React and Next.js",
        badges: [
          ["nextdotjs", "Next.js", "Web app"],
          ["typescript", "TypeScript", "Application"],
          ["ai", "AI Agents", "Automation"],
          ["document", "CV Tailoring", "Documents"],
          ["search", "Job Search", "Discovery"],
          ["workflow", "Workflows", "Applications"],
        ],
      },
    ];
    const projectSource = projectFrame.querySelector("[data-project-source]");
    const projectImage = projectFrame.querySelector("[data-project-image]");
    const projectBadges = Array.from(scene.querySelectorAll(".stack-badge"));
    let projectIndex = 0;
    let projectTimer = 0;
    let settleTimer = 0;
    let isSwitchingProject = false;

    const preloadProject = (index) => {
      const preload = new Image();
      preload.src = projects[index].avif;
    };

    if ("requestIdleCallback" in window) {
      window.requestIdleCallback(() => preloadProject(1), { timeout: 1200 });
    } else {
      window.setTimeout(() => preloadProject(1), 500);
    }

    const renderProject = async (nextIndex) => {
      const project = projects[nextIndex];
      projectFrame.href = project.href;
      if (projectSource) projectSource.srcset = project.avif;
      if (projectImage) {
        projectImage.src = project.image;
        projectImage.alt = project.alt;
      }
      scene.querySelectorAll("[data-project-name], [data-project-title]").forEach((element) => {
        element.textContent = project.name;
      });
      const kind = scene.querySelector("[data-project-kind]");
      const status = scene.querySelector("[data-project-status]");
      const kicker = scene.querySelector("[data-project-kicker]");
      const stack = scene.querySelector(".project-stack-badges");
      if (kind) kind.textContent = project.kind;
      if (status) status.textContent = project.status;
      if (kicker) kicker.textContent = project.kicker;
      if (stack) stack.setAttribute("aria-label", `${project.name} technology stack`);
      projectBadges.forEach((badge, index) => {
        const [icon, title, detail] = project.badges[index];
        const badgeIcon = badge.querySelector("img");
        const badgeTitle = badge.querySelector("strong");
        const badgeDetail = badge.querySelector("small");
        if (badgeIcon) {
          badgeIcon.src = `assets/icons/stack/${icon}.svg`;
          badgeIcon.alt = `${title} logo`;
        }
        if (badgeTitle) badgeTitle.textContent = title;
        if (badgeDetail) badgeDetail.textContent = detail;
      });

      if (projectImage) {
        await Promise.race([
          projectImage.decode().catch(() => undefined),
          new Promise((resolve) => window.setTimeout(resolve, 350)),
        ]);
      }

      projectIndex = nextIndex;
      preloadProject((projectIndex + 1) % projects.length);

      if (reducedMotion) {
        isSwitchingProject = false;
        return;
      }
      void scene.offsetWidth;
      scene.classList.replace("is-transitioning", "is-entering");
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        scene.classList.remove("is-entering");
        scene.classList.add("has-advanced");
        isSwitchingProject = false;
      }, 1000);
    };

    const advanceProject = () => {
      if (isSwitchingProject) return;
      if (scene.matches(":hover") || scene.contains(document.activeElement)) {
        projectTimer = window.setTimeout(advanceProject, 350);
        return;
      }
      isSwitchingProject = true;
      const nextIndex = (projectIndex + 1) % projects.length;
      projectTimer = window.setTimeout(advanceProject, 4000);
      if (reducedMotion) {
        renderProject(nextIndex);
        return;
      }
      scene.classList.remove("has-advanced", "is-entering");
      scene.classList.add("is-transitioning");
      window.setTimeout(() => renderProject(nextIndex), 520);
    };

    projectTimer = window.setTimeout(advanceProject, 4000);
  }

  const canvas = document.getElementById("heroParticles");
  if (canvas && hero) {
    const context = canvas.getContext("2d", { alpha: true });
    let width = 0;
    let height = 0;
    let particles = [];
    let animationFrame = 0;
    let isVisible = true;

    const makeParticle = () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      radius: 0.45 + Math.random() * 1.25,
      speedX: (Math.random() - 0.5) * 0.09,
      speedY: -0.025 - Math.random() * 0.08,
      alpha: 0.12 + Math.random() * 0.4,
    });

    const resizeCanvas = () => {
      const bounds = hero.getBoundingClientRect();
      width = Math.max(Math.round(bounds.width), 1);
      height = Math.max(Math.round(bounds.height), 1);
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      const particleCount = width < 768 ? 22 : 42;
      particles = Array.from({ length: particleCount }, makeParticle);
    };

    const drawParticles = () => {
      context.clearRect(0, 0, width, height);

      particles.forEach((particle) => {
        if (!reducedMotion) {
          particle.x += particle.speedX;
          particle.y += particle.speedY;
          if (particle.y < -4) particle.y = height + 4;
          if (particle.x < -4) particle.x = width + 4;
          if (particle.x > width + 4) particle.x = -4;
        }

        context.beginPath();
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        context.fillStyle = `rgba(91, 221, 229, ${particle.alpha})`;
        context.fill();
      });

      if (!reducedMotion && isVisible) {
        animationFrame = window.requestAnimationFrame(drawParticles);
      }
    };

    const startParticles = () => {
      if (!animationFrame && !reducedMotion) {
        animationFrame = window.requestAnimationFrame(drawParticles);
      }
    };

    resizeCanvas();
    drawParticles();
    window.addEventListener("resize", resizeCanvas, { passive: true });

    if ("IntersectionObserver" in window && !reducedMotion) {
      const heroObserver = new IntersectionObserver((entries) => {
        isVisible = entries[0].isIntersecting;
        if (isVisible) {
          startParticles();
        } else if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
      });
      heroObserver.observe(hero);
    }
  }

  const capabilities = document.querySelector(".capabilities-section");

  if (capabilities) {
    const canTrackPointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (canTrackPointer && !reducedMotion) {
      capabilities.querySelectorAll("[data-capability-card]").forEach((card) => {
        let capabilityFrame = 0;

        card.addEventListener("pointermove", (event) => {
          if (capabilityFrame) window.cancelAnimationFrame(capabilityFrame);
          capabilityFrame = window.requestAnimationFrame(() => {
            const bounds = card.getBoundingClientRect();
            const x = (event.clientX - bounds.left) / bounds.width - 0.5;
            const y = (event.clientY - bounds.top) / bounds.height - 0.5;
            card.style.setProperty("--cap-x", `${x * 7}px`);
            card.style.setProperty("--cap-y", `${y * 5}px`);
          });
        });

        card.addEventListener("pointerleave", () => {
          card.style.setProperty("--cap-x", "0px");
          card.style.setProperty("--cap-y", "0px");
        });
      });
    }
  }

  const workSection = document.querySelector(".work-section");

  if (workSection && "IntersectionObserver" in window && !reducedMotion) {
    const workCards = Array.from(workSection.querySelectorAll("[data-work-card]"));
    workSection.classList.add("motion-ready");

    const workObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5%" });

    workCards.forEach((card) => workObserver.observe(card));
  }

  const whySection = document.querySelector(".why-section");

  if (whySection && "IntersectionObserver" in window && !reducedMotion) {
    const whyItems = Array.from(whySection.querySelectorAll("[data-why-card]"));
    whySection.classList.add("motion-ready");

    const whyObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.14, rootMargin: "0px 0px -5%" });

    whyItems.forEach((item) => whyObserver.observe(item));
  }

  const contactSection = document.querySelector(".contact-section");

  if (contactSection && "IntersectionObserver" in window && !reducedMotion) {
    const contactCards = Array.from(contactSection.querySelectorAll("[data-contact-card]"));
    contactSection.classList.add("motion-ready");

    const contactObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -5%" });

    contactCards.forEach((card) => contactObserver.observe(card));
  }

  // Load the testimonial slider only when visitors approach that section.
  const testimonials = document.querySelector(".testimonials-swiper");
  if (testimonials) {
    let swiperRequested = false;

    const loadSwiper = () => {
      if (swiperRequested) return;
      swiperRequested = true;

      const stylesheet = document.createElement("link");
      stylesheet.rel = "stylesheet";
      stylesheet.href = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css";
      document.head.appendChild(stylesheet);

      const script = document.createElement("script");
      script.src = "https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js";
      script.onload = () => {
        new Swiper(".testimonials-swiper", {
          slidesPerView: 1,
          spaceBetween: 20,
          navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          },
          loop: true,
          autoplay: { delay: 6000, disableOnInteraction: true },
          breakpoints: {
            768: { slidesPerView: 2 },
            1024: { slidesPerView: 3 },
          },
        });
      };
      document.head.appendChild(script);
    };

    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          loadSwiper();
        }
      }, { rootMargin: "400px 0px" });
      observer.observe(testimonials);
    } else {
      loadSwiper();
    }
  }
});

// Privacy-conscious site measurement. The Google tag only loads on the
// production domain, and EEA/UK visitors are measured only after the existing
// Google CMP reports analytics consent. Event metadata never includes form
// values, assistant questions, email addresses, or other user-provided text.
(function initializeSiteAnalytics() {
  "use strict";

  if (window.__mustafaAnalyticsInitialized) return;
  window.__mustafaAnalyticsInitialized = true;

  const measurementId = "G-7YQ91FHWS6";
  const productionHosts = new Set([
    "aisaaswithmustafa.com",
    "www.aisaaswithmustafa.com"
  ]);
  const startedForms = new WeakSet();
  let analyticsReady = false;
  let consentListenerRegistered = false;

  function track(eventName, parameters) {
    if (!analyticsReady || typeof window.gtag !== "function") return;
    window.gtag("event", eventName, parameters || {});
  }

  window.siteAnalytics = Object.freeze({ track });

  function loadGoogleTag() {
    if (analyticsReady || !productionHosts.has(window.location.hostname)) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function gtag() {
      window.dataLayer.push(arguments);
    };

    window.gtag("consent", "default", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      send_page_view: true
    });

    const googleTag = document.createElement("script");
    googleTag.async = true;
    googleTag.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    document.head.appendChild(googleTag);
    analyticsReady = true;
  }

  function useConsentData(tcData, success) {
    if (!success || !tcData) return;

    if (tcData.gdprApplies === false) {
      loadGoogleTag();
      return;
    }

    if (tcData.gdprApplies !== true) return;
    if (tcData.eventStatus !== "tcloaded" && tcData.eventStatus !== "useractioncomplete") return;

    const purposeConsent = tcData.purpose && tcData.purpose.consents;
    const vendorConsent = tcData.vendor && tcData.vendor.consents;
    const googleVendorId = 755;
    if (purposeConsent && purposeConsent[1] === true && vendorConsent && vendorConsent[googleVendorId] === true) {
      loadGoogleTag();
    }
  }

  function registerConsentListener() {
    if (consentListenerRegistered || typeof window.__tcfapi !== "function") return false;
    consentListenerRegistered = true;
    window.__tcfapi("addEventListener", 2, useConsentData);
    return true;
  }

  function startMeasurement() {
    if (!productionHosts.has(window.location.hostname)) return;
    if (registerConsentListener()) return;

    let attempts = 0;
    const consentPoll = window.setInterval(function pollForConsentManager() {
      attempts += 1;
      if (registerConsentListener()) {
        window.clearInterval(consentPoll);
        return;
      }

      if (attempts >= 10) {
        window.clearInterval(consentPoll);
        loadGoogleTag();
      }
    }, 250);
  }

  document.addEventListener("focusin", function handleFormStart(event) {
    const form = event.target.closest("form");
    if (!form || startedForms.has(form)) return;

    if (form.matches("[data-ask-form]")) {
      startedForms.add(form);
      track("ask_mustafa_open", { interaction_type: "input_focus" });
      return;
    }

    if (form.action && form.action.includes("formspree.io")) {
      startedForms.add(form);
      track("contact_form_start", { form_name: "project_request" });
    }
  });

  document.addEventListener("submit", function handleTrackedSubmit(event) {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;

    if (form.matches("[data-ask-form]")) {
      track("ask_mustafa_question", { assistant_name: "ask_mustafa" });
      return;
    }

    if (form.action && form.action.includes("formspree.io")) {
      track("contact_form_submit", { form_name: "project_request" });
    }
  }, true);

  document.addEventListener("click", function handleTrackedClick(event) {
    const target = event.target.closest("a, button");
    if (!target) return;

    if (target.matches("[data-ask-open]")) {
      track("ask_mustafa_open", { interaction_type: "launcher" });
      return;
    }

    if (!(target instanceof HTMLAnchorElement)) return;
    const href = target.href || "";

    if (target.hasAttribute("download")) {
      track("file_download", {
        file_name: href.split("/").pop() || "download",
        link_text: (target.textContent || "").trim().slice(0, 80)
      });
      return;
    }

    const contactChannels = [
      ["upwork.com", "upwork"],
      ["linkedin.com", "linkedin"],
      ["wa.me/", "whatsapp"],
      ["calendly.com", "calendly"],
      ["mailto:", "email"],
      ["tel:", "phone"]
    ];
    const channel = contactChannels.find(function findChannel(entry) {
      return href.includes(entry[0]);
    });

    if (channel) {
      track("contact_channel_click", { channel: channel[1] });
      return;
    }

    if (href.endsWith("#contact") || href.includes("/#contact")) {
      track("contact_cta_click", {
        link_text: (target.textContent || "").trim().slice(0, 80)
      });
    }
  });

  if (window.location.pathname === "/thanks.html" || window.location.pathname === "/thanks") {
    document.addEventListener("DOMContentLoaded", function trackConfirmedLead() {
      track("generate_lead", { form_name: "project_request" });
    }, { once: true });
  }

  startMeasurement();
})();
