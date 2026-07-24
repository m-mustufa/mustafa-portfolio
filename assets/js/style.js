window.onload = function () {
  const menuToggle = document.getElementById("menuToggle");
  const mainNav = document.getElementById("mainNav");

  menuToggle.addEventListener("click", () => {
    mainNav.classList.toggle("hidden");
  });
  /* ──────────────────
         1.  Typewriter logic
      ─────────────────── */
  const phrases = [
    "& Ship Production AI Products",
    "Multi-Tenant SaaS with React & Node",
    "Real-Time Apps with Supabase",
    "LLM Integrations that Actually Ship",
  ];

  const el = document.getElementById("typewriter");
  let phraseIndex = 0;

  function rotatePhrase() {
    el.classList.add("hero-phrase-exit");
    window.setTimeout(() => {
      phraseIndex = (phraseIndex + 1) % phrases.length;
      el.textContent = phrases[phraseIndex];
      el.classList.remove("hero-phrase-exit");
      el.classList.add("hero-phrase-enter");
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          el.classList.remove("hero-phrase-enter");
        });
      });
    }, 250);
  }

  if (el && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.setInterval(rotatePhrase, 2800);
  }

  /* ──────────────────
         2.  Sticky-header logic
      ─────────────────── */
  const header = document.querySelector("header"); // <── add this line
  window.addEventListener("scroll", () => {
    if (window.scrollY > 20) {
      header.classList.add("bg-gray-900", "shadow-lg", "active");
    } else {
      header.classList.remove("bg-gray-900", "shadow-lg", "active");
    }
  });

  // Swiper library is only loaded on index.html — guard so other pages don't throw
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
};
