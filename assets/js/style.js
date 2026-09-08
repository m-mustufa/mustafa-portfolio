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
        scene.style.setProperty("--scene-ry", `${x * 7}deg`);
        scene.style.setProperty("--scene-rx", `${y * -5}deg`);
      });
    });

    hero.addEventListener("pointerleave", () => {
      scene.style.setProperty("--scene-ry", "0deg");
      scene.style.setProperty("--scene-rx", "0deg");
    });

    const updateSceneScroll = () => {
      const bounds = hero.getBoundingClientRect();
      const progress = Math.min(Math.max(-bounds.top / Math.max(bounds.height, 1), 0), 1);
      scene.style.setProperty("--scene-scroll", `${progress * 28}px`);
    };

    updateSceneScroll();
    window.addEventListener("scroll", updateSceneScroll, { passive: true });
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
            1024: { slidesPerView: 4 },
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
