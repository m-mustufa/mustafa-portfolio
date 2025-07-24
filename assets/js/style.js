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
    "Scalable Front-Ends for Startups",
    "No-Code Apps with Bubble.io",
    "Pixel-Perfect UI in Angular",
    "Modern Web Apps with Tailwind",
  ];

  const el = document.getElementById("typewriter");
  let phraseIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  function type() {
    const text = phrases[phraseIndex];
    el.textContent = isDeleting
      ? text.substring(0, charIndex--)
      : text.substring(0, charIndex++);

    let delay = isDeleting ? 100 : 70;

    if (!isDeleting && charIndex === text.length + 1) {
      isDeleting = true; // start erasing
      delay = 4000; // hold before erase
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false; // start next phrase
      phraseIndex = (phraseIndex + 1) % phrases.length;
      delay = 1000; // pause before typing
    }
    setTimeout(type, delay);
  }
  type();

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
