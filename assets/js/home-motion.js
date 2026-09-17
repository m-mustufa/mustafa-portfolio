/* Homepage-only motion. No dependency, scroll interception or content fetching. */
document.addEventListener("DOMContentLoaded", () => {
  const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const desktopQuery = window.matchMedia("(min-width: 1051px) and (min-height: 650px)");
  const canvas = document.getElementById("heroArchitecture");
  const hero = canvas?.closest(".hero-shell");
  const context = canvas?.getContext("2d", { alpha: true });

  if (context && hero) {
    let width = 0, height = 0, frame = 0, lastPaint = 0;
    let visible = false;
    const roundedRect = (x, y, boxWidth, boxHeight, radius) => {
      const r = Math.min(radius, boxWidth / 2, boxHeight / 2);
      context.beginPath();
      context.moveTo(x + r, y);
      context.arcTo(x + boxWidth, y, x + boxWidth, y + boxHeight, r);
      context.arcTo(x + boxWidth, y + boxHeight, x, y + boxHeight, r);
      context.arcTo(x, y + boxHeight, x, y, r);
      context.arcTo(x, y, x + boxWidth, y, r);
      context.closePath();
    };
    const curvePoint = (from, to, bend, progress) => {
      const control = { x: (from.x + to.x) / 2 + bend, y: (from.y + to.y) / 2 };
      const inverse = 1 - progress;
      return {
        x: inverse * inverse * from.x + 2 * inverse * progress * control.x + progress * progress * to.x,
        y: inverse * inverse * from.y + 2 * inverse * progress * control.y + progress * progress * to.y,
      };
    };
    const drawConnection = (from, to, bend) => {
      const controlX = (from.x + to.x) / 2 + bend;
      const controlY = (from.y + to.y) / 2;
      context.beginPath();
      context.moveTo(from.x, from.y);
      context.quadraticCurveTo(controlX, controlY, to.x, to.y);
      context.stroke();
    };
    const paint = (time) => {
      context.clearRect(0, 0, width, height);
      const compact = width < 760;
      const systemLeft = compact ? width * 0.08 : width * 0.57;
      const systemRight = compact ? width * 0.92 : width - 48;
      const hub = { x: compact ? width * 0.72 : width * 0.755, y: height * 0.5 };
      const nodes = compact ? [
        { label: "React", x: width * 0.12, y: height * 0.2 },
        { label: "Node.js API", x: width * 0.88, y: height * 0.25 },
        { label: "OpenAI", x: width * 0.91, y: height * 0.56 },
        { label: "Supabase", x: width * 0.78, y: height * 0.82 },
        { label: "Stripe", x: width * 0.12, y: height * 0.78 },
      ] : [
        { label: "REACT", detail: "Interface", x: systemLeft, y: height * 0.16 },
        { label: "NEXT.JS", detail: "Web apps", x: systemLeft + 190, y: height * 0.12 },
        { label: "TYPESCRIPT", detail: "Product logic", x: systemRight - 300, y: height * 0.16 },
        { label: "NODE.JS API", detail: "Services", x: systemRight - 90, y: height * 0.25 },
        { label: "OPENAI", detail: "Intelligence", x: systemRight - 20, y: height * 0.54 },
        { label: "POSTGRESQL", detail: "Data layer", x: systemRight - 140, y: height * 0.84 },
        { label: "SUPABASE", detail: "Auth + data", x: systemRight - 360, y: height * 0.88 },
        { label: "STRIPE", detail: "Billing", x: systemLeft + 20, y: height * 0.8 },
        { label: "ANGULAR", detail: "Enterprise UI", x: systemLeft - 30, y: height * 0.52 },
      ];
      const edges = compact ? [
        [nodes[0], nodes[1], -26],
        [nodes[1], nodes[2], 20],
        [nodes[1], nodes[3], -18],
        [nodes[2], hub, -16],
        [nodes[3], hub, 28],
        [nodes[4], nodes[3], 18],
        [nodes[0], hub, 26],
      ] : [
        [nodes[0], nodes[1], -22],
        [nodes[1], nodes[2], 18],
        [nodes[2], nodes[3], -20],
        [nodes[3], nodes[4], 22],
        [nodes[4], nodes[5], -16],
        [nodes[5], nodes[6], 18],
        [nodes[6], nodes[7], -20],
        [nodes[7], nodes[8], 18],
        [nodes[8], nodes[0], -16],
        [nodes[1], hub, 22],
        [nodes[3], hub, -18],
        [nodes[4], hub, 18],
        [nodes[6], hub, -22],
        [nodes[8], hub, 24],
      ];

      context.save();
      context.lineWidth = compact ? 0.8 : 1.35;
      context.strokeStyle = compact ? "rgba(76, 228, 222, 0.16)" : "rgba(76, 228, 222, 0.28)";
      context.setLineDash([4, 10]);
      edges.forEach(([from, to, bend]) => drawConnection(from, to, bend));
      context.setLineDash([]);

      edges.forEach(([from, to, bend], index) => {
        const progress = (time * 0.00016 + index * 0.145) % 1;
        const point = curvePoint(from, to, bend, progress);
        context.shadowColor = "#53efe5";
        context.shadowBlur = compact ? 4 : 11;
        context.fillStyle = "rgba(97, 245, 235, 0.88)";
        context.beginPath();
        context.arc(point.x, point.y, compact ? 1.7 : 3, 0, Math.PI * 2);
        context.fill();
      });
      context.shadowBlur = 0;

      nodes.forEach((node, index) => {
        const boxWidth = compact ? 10 : 156;
        const boxHeight = compact ? 10 : 46;
        const x = node.x - boxWidth / 2;
        const y = node.y - boxHeight / 2;
        roundedRect(x, y, boxWidth, boxHeight, compact ? 5 : 7);
        context.fillStyle = compact ? "rgba(76, 228, 222, 0.42)" : "rgba(7, 28, 43, 0.82)";
        context.fill();
        context.strokeStyle = `rgba(${index % 2 ? "84, 173, 240" : "76, 228, 222"}, 0.5)`;
        context.lineWidth = 1;
        context.stroke();
        if (!compact) {
          context.fillStyle = index % 2 ? "#79c7f2" : "#62e8df";
          context.beginPath();
          context.arc(x + 15, node.y, 3.5, 0, Math.PI * 2);
          context.fill();
          context.font = "800 11px ui-monospace, SFMono-Regular, Consolas, monospace";
          context.fillStyle = "rgba(232, 247, 255, 0.95)";
          context.fillText(node.label, x + 28, y + 18);
          context.font = "550 9.5px ui-monospace, SFMono-Regular, Consolas, monospace";
          context.fillStyle = "rgba(150, 183, 201, 0.75)";
          context.fillText(node.detail, x + 28, y + 34);
        }
      });

      context.shadowColor = "#4ce4de";
      context.shadowBlur = compact ? 6 : 12;
      context.fillStyle = "rgba(76, 228, 222, 0.08)";
      context.strokeStyle = "rgba(76, 228, 222, 0.48)";
      context.lineWidth = 1.2;
      context.beginPath();
      context.arc(hub.x, hub.y, compact ? 8 : 14 + Math.sin(time * 0.002) * 1.5, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.restore();
    };
    const animate = (time) => {
      frame = 0;
      if (!visible || document.hidden || motionQuery.matches) return;
      if (time - lastPaint > 32) { paint(time); lastPaint = time; }
      frame = window.requestAnimationFrame(animate);
    };
    const sync = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      if (motionQuery.matches) context.clearRect(0, 0, width, height);
      else if (visible && !document.hidden) frame = window.requestAnimationFrame(animate);
    };
    const resize = () => {
      width = hero.clientWidth;
      height = hero.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!motionQuery.matches) paint(lastPaint);
      sync();
    };
    if ("ResizeObserver" in window) new ResizeObserver(resize).observe(hero);
    else window.addEventListener("resize", resize, { passive: true });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; sync(); }).observe(hero);
    } else { visible = true; }
    document.addEventListener("visibilitychange", sync);
    motionQuery.addEventListener("change", sync);
    resize();
  }

  const capabilities = document.querySelector(".capabilities-section");
  if (capabilities && !motionQuery.matches) {
    const cards = Array.from(capabilities.querySelectorAll("[data-capability-card]"));
    const cta = capabilities.querySelector(".uae-capability-cta");
    const phaseNumber = capabilities.querySelector("[data-capability-phase-number]");
    const phaseLabel = capabilities.querySelector("[data-capability-phase-label]");
    const phaseNames = ["Build the product", "Run the platform", "Scale with confidence"];
    let capabilityFrame = 0;
    let capabilityVisible = true;
    let activePhase = -1;

    const clamp = (value) => Math.min(1, Math.max(0, value));
    const setPhase = (phase) => {
      if (phase === activePhase) return;
      activePhase = phase;
      capabilities.dataset.capabilityPhase = String(phase);
      cards.forEach((card, index) => card.classList.toggle("is-phase-active", Math.floor(index / 3) === phase));
      if (phaseNumber) phaseNumber.textContent = `0${phase + 1}`;
      if (phaseLabel) phaseLabel.textContent = phaseNames[phase];
    };
    const updateCapabilities = () => {
      capabilityFrame = 0;
      if (!capabilityVisible || motionQuery.matches) return;

      const viewportHeight = window.innerHeight;
      const sectionBounds = capabilities.getBoundingClientRect();
      const sectionTravel = Math.max(sectionBounds.height - viewportHeight * 0.35, 1);
      const sectionProgress = clamp((viewportHeight * 0.72 - sectionBounds.top) / sectionTravel);
      capabilities.style.setProperty("--capability-progress", String(sectionProgress));

      let phase = 0;
      [0, 3, 6].forEach((cardIndex, groupIndex) => {
        const card = cards[cardIndex];
        if (card && card.getBoundingClientRect().top < viewportHeight * 0.62) phase = groupIndex;
      });
      setPhase(phase);

      cards.forEach((card, index) => {
        const bounds = card.getBoundingClientRect();
        const columnDelay = (index % 3) * 0.07;
        const reveal = clamp((viewportHeight * (0.9 - columnDelay) - bounds.top) / (viewportHeight * 0.44));
        const eased = 1 - Math.pow(1 - reveal, 3);
        card.style.setProperty("--cap-scroll-y", `${(1 - eased) * 58}px`);
        card.style.setProperty("--cap-scroll-z", `${(1 - eased) * -110}px`);
        card.style.setProperty("--cap-scroll-scale", String(0.92 + eased * 0.08));
        card.style.setProperty("--cap-scroll-opacity", String(0.08 + eased * 0.92));
        card.style.setProperty("--cap-scroll-blur", `${(1 - eased) * 5}px`);
        card.style.setProperty("--cap-icon-scale", String(0.62 + eased * 0.38));
        card.style.setProperty("--cap-icon-rotate", `${(1 - eased) * -12}deg`);
      });

      if (cta) {
        const ctaBounds = cta.getBoundingClientRect();
        const ctaProgress = clamp((viewportHeight * 0.94 - ctaBounds.top) / (viewportHeight * 0.34));
        const easedCta = 1 - Math.pow(1 - ctaProgress, 3);
        cta.style.setProperty("--cta-scroll-y", `${(1 - easedCta) * 46}px`);
        cta.style.setProperty("--cta-scroll-opacity", String(easedCta));
      }
    };
    const scheduleCapabilities = () => {
      if (!capabilityFrame) capabilityFrame = window.requestAnimationFrame(updateCapabilities);
    };

    capabilities.classList.add("capabilities-scroll-ready");
    setPhase(0);
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(([entry]) => {
        capabilityVisible = entry.isIntersecting;
        if (capabilityVisible) scheduleCapabilities();
      }, { rootMargin: "30% 0px" }).observe(capabilities);
    }
    window.addEventListener("scroll", scheduleCapabilities, { passive: true });
    window.addEventListener("resize", scheduleCapabilities, { passive: true });
    window.addEventListener("pageshow", scheduleCapabilities);
    scheduleCapabilities();
  }

  const story = document.querySelector(".build-story");
  if (!story) return;
  const pin = story.querySelector(".build-story-pin");
  const tabs = Array.from(story.querySelectorAll("[data-build-tab]"));
  const panels = Array.from(story.querySelectorAll("[data-build-panel]"));
  let active = -1, scrollMode = false, scrollFrame = 0;
  const select = (index) => {
    if (active === index) return;
    // Do not leave keyboard focus inside a panel that becomes hidden on scroll.
    const hadPanelFocus = panels.some((panel) => panel.contains(document.activeElement));
    active = index;
    tabs.forEach((tab, i) => {
      tab.setAttribute("aria-selected", String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    story.dataset.activeBuild = String(index);
    if (hadPanelFocus) tabs[index].focus({ preventScroll: true });
  };
  const travel = () => Math.max(story.offsetHeight - pin.offsetHeight, 1);
  const update = () => {
    scrollFrame = 0;
    if (!scrollMode) return;
    const top = parseFloat(getComputedStyle(pin).top) || 0;
    const progress = Math.min(1, Math.max(0, (top - story.getBoundingClientRect().top) / travel()));
    select(Math.min(tabs.length - 1, Math.floor(progress * tabs.length)));
    story.style.setProperty("--build-progress", String(progress));
  };
  const schedule = () => {
    if (scrollMode && !scrollFrame) scrollFrame = window.requestAnimationFrame(update);
  };
  const configure = () => {
    scrollMode = desktopQuery.matches && !motionQuery.matches;
    story.classList.toggle("is-scroll-driven", scrollMode);
    // Short windows, zoom and large text must not pin content below the viewport.
    if (scrollMode && pin.offsetHeight > window.innerHeight - 100) {
      scrollMode = false;
      story.classList.remove("is-scroll-driven");
    }
    story.querySelector("[role=tablist]").setAttribute("aria-orientation", desktopQuery.matches ? "vertical" : "horizontal");
    update();
  };
  const activate = (index) => {
    if (scrollMode) {
      const top = parseFloat(getComputedStyle(pin).top) || 0;
      const target = window.scrollY + story.getBoundingClientRect().top - top + travel() * (index + 0.15) / tabs.length;
      // Direct positioning keeps click/keyboard selection in sync with scroll state.
      window.scrollTo({ top: target, behavior: "instant" });
    }
    select(index);
    schedule();
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => activate(index));
    tab.addEventListener("keydown", (event) => {
      let next;
      if (["ArrowDown", "ArrowRight"].includes(event.key)) next = (index + 1) % tabs.length;
      if (["ArrowUp", "ArrowLeft"].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
      if (event.key === "Home") next = 0;
      if (event.key === "End") next = tabs.length - 1;
      if (next === undefined) return;
      event.preventDefault();
      activate(next);
      tabs[next].focus({ preventScroll: true });
    });
  });
  story.classList.add("is-ready");
  select(0);
  configure();
  window.addEventListener("scroll", schedule, { passive: true });
  window.addEventListener("resize", configure, { passive: true });
  window.addEventListener("pageshow", schedule);
  motionQuery.addEventListener("change", configure);
  desktopQuery.addEventListener("change", configure);
});
