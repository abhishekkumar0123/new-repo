"use client";

import { useEffect } from "react";

export function ScrollEffects() {
  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const fineLayout = window.matchMedia("(min-width: 768px)");

    if (reducedMotion.matches) return;

    const revealTargets = Array.from(
      document.querySelectorAll<HTMLElement>(
        "main section:not(#home) h2, main section:not(#home) h3, main section:not(#home) .glass-panel, main section:not(#home) [class*='grid'] > article, main section:not(#home) [class*='grid'] > a.glass-panel",
      ),
    );

    revealTargets.forEach((element, index) => {
      element.classList.add("scroll-reveal");
      const parent = element.parentElement;
      if (parent?.className && String(parent.className).includes("grid")) {
        const siblings = Array.from(parent.children);
        const siblingIndex = siblings.indexOf(element);
        element.style.setProperty(
          "--reveal-delay",
          `${Math.min(siblingIndex, 5) * 55}ms`,
        );
      } else {
        element.style.setProperty(
          "--reveal-delay",
          `${Math.min(index % 4, 3) * 35}ms`,
        );
      }
    });

    document.documentElement.classList.add("scroll-enhancements-ready");

    const revealObserver = new IntersectionObserver(
      (entries, observer) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );

    revealTargets.forEach((element) => revealObserver.observe(element));

    let scrollFrame = 0;
    const progress = document.querySelector<HTMLElement>(
      ".scroll-progress-bar",
    );
    const gridFade = document.querySelector<HTMLElement>(".grid-fade");

    const updateScroll = () => {
      scrollFrame = 0;
      const scrollMax =
        document.documentElement.scrollHeight - window.innerHeight;
      const ratio = scrollMax > 0 ? window.scrollY / scrollMax : 0;
      if (progress)
        progress.style.transform = `scaleX(${Math.min(1, Math.max(0, ratio))})`;

      if (fineLayout.matches && gridFade) {
        const shift = Math.min(18, window.scrollY * 0.018);
        gridFade.style.setProperty("--scroll-parallax", `${shift}px`);
      }
    };

    const onScroll = () => {
      if (!scrollFrame)
        scrollFrame = window.requestAnimationFrame(updateScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    updateScroll();

    const navLinks = Array.from(
      document.querySelectorAll<HTMLAnchorElement>('header a[href^="#"]'),
    );

    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (!visible) return;
        const id = (visible.target as HTMLElement).id;

        navLinks.forEach((link) => {
          const active = link.getAttribute("href") === `#${id}`;
          link.classList.toggle("nav-link-active", active);
          if (active) link.setAttribute("aria-current", "page");
          else link.removeAttribute("aria-current");
        });
      },
      { rootMargin: "-22% 0px -58% 0px", threshold: [0.05, 0.25, 0.5] },
    );

    document
      .querySelectorAll<HTMLElement>("main section[id]")
      .forEach((section) => {
        sectionObserver.observe(section);
      });

    const onMotionChange = () => {
      if (reducedMotion.matches) {
        document.documentElement.classList.remove("scroll-enhancements-ready");
        revealTargets.forEach((element) => element.classList.add("is-visible"));
      }
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      revealObserver.disconnect();
      sectionObserver.disconnect();
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(scrollFrame);
      reducedMotion.removeEventListener("change", onMotionChange);
      document.documentElement.classList.remove("scroll-enhancements-ready");
      revealTargets.forEach((element) => {
        element.classList.remove("scroll-reveal", "is-visible");
        element.style.removeProperty("--reveal-delay");
      });
    };
  }, []);

  return (
    <div className="scroll-progress" aria-hidden="true">
      <span className="scroll-progress-bar" />
    </div>
  );
}
