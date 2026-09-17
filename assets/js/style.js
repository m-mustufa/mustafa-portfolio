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
    let pointerFrame = 0;

    hero.addEventListener("pointermove", (event) => {
      if (window.innerWidth < 901) return;
      if (pointerFrame) window.cancelAnimationFrame(pointerFrame);

      pointerFrame = window.requestAnimationFrame(() => {
        const bounds = hero.getBoundingClientRect();
        const x = (event.clientX - bounds.left) / bounds.width - 0.5;
        const y = (event.clientY - bounds.top) / bounds.height - 0.5;
        scene.style.setProperty("--scene-x", `${x * 14}px`);
        scene.style.setProperty("--scene-y", `${y * 10}px`);
      });
    });

    hero.addEventListener("pointerleave", () => {
      scene.style.setProperty("--scene-x", "0px");
      scene.style.setProperty("--scene-y", "0px");
    });

    const updateSceneScroll = () => {
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(-bounds.top / Math.max(bounds.height, 1), 0), 1);
      scene.style.setProperty("--scene-scroll", `${progress * 28}px`);
    };

    updateSceneScroll();
    window.addEventListener("scroll", updateSceneScroll, { passive: true });
  }

  const heroProject = scene?.querySelector("[data-hero-project]");

  if (heroProject) {
    const showcaseProjects = [
      {
        name: "CultureAI",
        description: "AI employee engagement SaaS",
        status: "Live SaaS",
        href: "https://app.startcultureai.com/",
        avif: "assets/img/portfolio/cultureai-ai-employee-engagement-saas-dashboard-banner-600w.avif",
        image: "assets/img/portfolio/cultureai-ai-employee-engagement-saas-dashboard-banner-600w.jpg",
        alt: "CultureAI employee engagement SaaS dashboard and survey analytics",
        ariaLabel: "View the live CultureAI SaaS platform",
      },
      {
        name: "BWL League",
        description: "Realtime sports platform",
        status: "Live Platform",
        href: "https://bwlleague.com/",
        avif: "assets/img/portfolio/football-tournament-dashboard-nextjs-supabase-postgresql-600w.avif",
        image: "assets/img/portfolio/football-tournament-dashboard-nextjs-supabase-postgresql-600w.jpg",
        alt: "BWL League sports platform dashboard and Android application",
        ariaLabel: "View the live BWL League platform",
      },
      {
        name: "AutoLeap",
        description: "Automotive SaaS platform",
        status: "Production SaaS",
        href: "https://autoleap.com/",
        avif: "assets/img/portfolio/autoleap-dashboard-saas-600w.avif",
        image: "assets/img/portfolio/autoleap-dashboard-saas-600w.jpg",
        alt: "AutoLeap automotive repair SaaS dashboard showing sales, reviews and business performance",
        ariaLabel: "View AutoLeap's automotive repair SaaS platform",
      },
      {
        name: "Apex Logistics",
        description: "GCC logistics PWA",
        status: "Live PWA",
        href: "https://apexlogistics.life/",
        avif: "assets/img/portfolio/apex-logistics-driver-job-marketplace-react-tanstack-pwa-600w.avif",
        image: "assets/img/portfolio/apex-logistics-driver-job-marketplace-react-tanstack-pwa-600w.jpg",
        alt: "Apex Logistics GCC freight quotation platform",
        ariaLabel: "View the live Apex Logistics platform",
      },
      {
        name: "JobHunter",
        description: "AI job application agent",
        status: "Live AI App",
        href: "https://jobhunter-lemon.vercel.app/",
        avif: "assets/img/portfolio/jobhunter-abu-dhabi-ai-job-application-agent-600w.avif",
        image: "assets/img/portfolio/jobhunter-abu-dhabi-ai-job-application-agent-600w.jpg",
        alt: "JobHunter AI job application agent showing Abu Dhabi vacancies and CV tailoring",
        ariaLabel: "View the live JobHunter AI application agent",
      },
    ];
    const source = heroProject.querySelector("[data-hero-project-source]");
    const image = heroProject.querySelector("[data-hero-project-image]");
    const windowName = heroProject.querySelector("[data-hero-project-window]");
    const windowStatus = heroProject.querySelector("[data-hero-project-status]");
    const projectName = heroProject.querySelector("[data-hero-project-name]");
    const projectDescription = heroProject.querySelector("[data-hero-project-description]");
    const projectCount = heroProject.querySelector("[data-hero-project-count]");
    const progress = scene.querySelector("[data-hero-project-progress]");
    const triggers = Array.from(scene.querySelectorAll("[data-hero-project-trigger]"));
    const intervalDuration = 5600;
    let activeProject = 0;
    let projectTimer = 0;
    let changeTimer = 0;

    showcaseProjects.slice(1).forEach((project) => {
      const preload = new Image();
      preload.src = project.image;
    });

    const restartProgress = () => {
      if (!progress || reducedMotion) return;
      progress.classList.remove("is-running");
      void progress.offsetWidth;
      progress.classList.add("is-running");
    };

    const renderProject = (index, animate = true) => {
      const project = showcaseProjects[index];
      const update = () => {
        heroProject.href = project.href;
        heroProject.target = "_blank";
        heroProject.rel = "noopener noreferrer";
        heroProject.setAttribute("aria-label", project.ariaLabel);
        if (source) source.srcset = project.avif;
        if (image) { image.src = project.image; image.alt = project.alt; }
        if (windowName) windowName.textContent = project.name;
        if (windowStatus) windowStatus.textContent = project.status;
        if (projectName) projectName.textContent = project.name;
        if (projectDescription) projectDescription.textContent = project.description;
        if (projectCount) projectCount.textContent = `${String(index + 1).padStart(2, "0")} / ${String(showcaseProjects.length).padStart(2, "0")}`;
        triggers.forEach((trigger, triggerIndex) => trigger.setAttribute("aria-selected", String(triggerIndex === index)));
        heroProject.classList.remove("is-changing");
        restartProgress();
      };

      window.clearTimeout(changeTimer);
      if (animate && !reducedMotion) {
        heroProject.classList.add("is-changing");
        changeTimer = window.setTimeout(update, 300);
      } else {
        update();
      }
    };

    const scheduleProject = () => {
      window.clearInterval(projectTimer);
      if (reducedMotion) return;
      projectTimer = window.setInterval(() => {
        if (scene.matches(":hover") || scene.contains(document.activeElement)) return;
        activeProject = (activeProject + 1) % showcaseProjects.length;
        renderProject(activeProject);
      }, intervalDuration);
    };

    triggers.forEach((trigger, index) => {
      trigger.addEventListener("click", () => {
        activeProject = index;
        renderProject(activeProject);
        scheduleProject();
      });
    });

    restartProgress();
    scheduleProject();
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
