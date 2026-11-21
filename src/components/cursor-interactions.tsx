"use client";

import { useEffect, useRef } from "react";

export function CursorInteractions() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const dotRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const finePointer = window.matchMedia("(pointer: fine)");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    if (!finePointer.matches || reducedMotion.matches) return;

    const cursor = cursorRef.current;
    const dot = dotRef.current;
    const glow = glowRef.current;
    if (!cursor || !dot || !glow) return;

    document.documentElement.classList.add("cursor-effects-enabled");

    const trail = Array.from(
      document.querySelectorAll<HTMLElement>("[data-cursor-trail]"),
    );
    const trailPositions = trail.map(() => ({ x: -100, y: -100 }));

    let frame = 0;
    let visible = false;
    let glowVisible = false;
    let targetX = -100;
    let targetY = -100;
    let ringX = -100;
    let ringY = -100;

    const magneticElements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-magnetic]:not([disabled])"),
    ).map((element) => ({ element, x: 0, y: 0 }));

    const premiumCards = Array.from(
      document.querySelectorAll<HTMLElement>("[data-premium-card]"),
    ).map((element) => ({
      element,
      tiltX: 0,
      tiltY: 0,
      active: false,
    }));

    const setCursorState = (element: HTMLElement | null) => {
      cursor.classList.remove("is-hovering", "is-card", "is-input", "is-text");
      dot.classList.remove("is-interactive", "is-card", "is-input");

      if (!element) {
        glowVisible = false;
        return;
      }

      const textTarget = element.closest(
        "input, textarea, [contenteditable='true']",
      ) as HTMLElement | null;
      if (textTarget) {
        glowVisible = false;
        cursor.classList.add("is-input");
        dot.classList.add("is-input");
        cursor.style.opacity = "0";
        dot.style.opacity = "0";
        return;
      }

      const interactiveTarget = element.closest(
        "a, button, [role='button'], [role='link'], summary, label, [data-magnetic], [data-premium-card], [tabindex]:not([tabindex='-1'])",
      ) as HTMLElement | null;

      if (interactiveTarget) {
        glowVisible = true;
        const cardTarget = interactiveTarget.closest(
          "article[data-premium-card], a[data-premium-card], [data-card]",
        );
        if (cardTarget) {
          cursor.classList.add("is-card");
          dot.classList.add("is-card");
        } else {
          cursor.classList.add("is-hovering");
          dot.classList.add("is-interactive");
        }
      } else {
        glowVisible = false;
      }
    };

    const onPointerMove = (event: Event) => {
      const detail = (event as CustomEvent<{ x: number; y: number }>).detail;
      targetX = detail.x;
      targetY = detail.y;
      visible = true;
    };

    const onPointerLeave = () => {
      visible = false;
      glowVisible = false;
      for (const item of magneticElements) {
        item.x = 0;
        item.y = 0;
      }
      for (const card of premiumCards) {
        card.active = false;
        card.tiltX = 0;
        card.tiltY = 0;
      }
    };

    const onPointerOver = (event: PointerEvent) => {
      const target =
        event.target instanceof HTMLElement
          ? event.target
          : event.target instanceof SVGElement
            ? (event.target.closest(
                "a, button, [role='button']",
              ) as HTMLElement | null)
            : null;
      setCursorState(target);
    };

    const onPointerOut = (event: PointerEvent) => {
      const nextTarget =
        event.relatedTarget instanceof HTMLElement ? event.relatedTarget : null;
      setCursorState(nextTarget);
    };

    const onClick = (event: MouseEvent) => {
      if (event.detail === 0) return;
      cursor.classList.add("is-pressed");
      window.setTimeout(() => cursor.classList.remove("is-pressed"), 110);
      const ripple = document.createElement("span");
      ripple.className = "cursor-click-ripple";
      ripple.style.left = `${event.clientX}px`;
      ripple.style.top = `${event.clientY}px`;
      document.body.appendChild(ripple);
      window.setTimeout(() => ripple.remove(), 620);
    };

    const animate = () => {
      ringX += (targetX - ringX) * 0.22;
      ringY += (targetY - ringY) * 0.22;

      cursor.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      cursor.style.opacity = visible ? "1" : "0";
      dot.style.transform = `translate3d(${targetX}px, ${targetY}px, 0)`;
      dot.style.opacity = visible ? "1" : "0";
      glow.style.transform = `translate3d(${ringX}px, ${ringY}px, 0)`;
      glow.style.opacity = visible && glowVisible ? "1" : "0";

      trailPositions.forEach((position, index) => {
        const previous =
          index === 0 ? { x: targetX, y: targetY } : trailPositions[index - 1];
        const speed = 0.34 - index * 0.035;
        position.x += (previous.x - position.x) * speed;
        position.y += (previous.y - position.y) * speed;

        const node = trail[index];
        node.style.transform = `translate3d(${position.x}px, ${position.y}px, 0)`;
        node.style.opacity = visible
          ? `${Math.max(0.08, 0.28 - index * 0.045)}`
          : "0";
      });

      for (const item of magneticElements) {
        const rect = item.element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const dx = targetX - centerX;
        const dy = targetY - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const radius = 88;

        if (visible && distance < radius) {
          const strength = (1 - distance / radius) * 0.16;
          item.x += (dx * strength - item.x) * 0.24;
          item.y += (dy * strength - item.y) * 0.24;
        } else {
          item.x *= 0.78;
          item.y *= 0.78;
        }

        if (Math.abs(item.x) < 0.05) item.x = 0;
        if (Math.abs(item.y) < 0.05) item.y = 0;
        item.element.style.transform = `translate3d(${item.x}px, ${item.y}px, 0)`;
      }

      for (const card of premiumCards) {
        const rect = card.element.getBoundingClientRect();
        const inside =
          targetX >= rect.left &&
          targetX <= rect.right &&
          targetY >= rect.top &&
          targetY <= rect.bottom;

        card.active = visible && inside;

        if (card.active) {
          const localX = targetX - rect.left;
          const localY = targetY - rect.top;
          card.element.style.setProperty("--spotlight-x", `${localX}px`);
          card.element.style.setProperty("--spotlight-y", `${localY}px`);

          if (card.element.hasAttribute("data-tilt") && finePointer.matches) {
            const nextTiltY = (localX / rect.width - 0.5) * 4;
            const nextTiltX = (0.5 - localY / rect.height) * 4;
            card.tiltX += (nextTiltX - card.tiltX) * 0.18;
            card.tiltY += (nextTiltY - card.tiltY) * 0.18;
          } else {
            card.tiltX = 0;
            card.tiltY = 0;
          }
        } else {
          card.tiltX *= 0.82;
          card.tiltY *= 0.82;
          card.element.style.removeProperty("--spotlight-x");
          card.element.style.removeProperty("--spotlight-y");
        }

        if (Math.abs(card.tiltX) < 0.05) card.tiltX = 0;
        if (Math.abs(card.tiltY) < 0.05) card.tiltY = 0;
        card.element.style.setProperty(
          "--card-tilt-x",
          `${card.tiltX.toFixed(2)}deg`,
        );
        card.element.style.setProperty(
          "--card-tilt-y",
          `${card.tiltY.toFixed(2)}deg`,
        );
      }

      frame = window.requestAnimationFrame(animate);
    };

    window.addEventListener("portfolio-pointer-move", onPointerMove);
    window.addEventListener("portfolio-pointer-leave", onPointerLeave);
    document.addEventListener("pointerover", onPointerOver, { passive: true });
    document.addEventListener("pointerout", onPointerOut, { passive: true });
    document.addEventListener("click", onClick, { passive: true });
    frame = window.requestAnimationFrame(animate);

    const onMotionChange = () => {
      if (reducedMotion.matches) {
        window.cancelAnimationFrame(frame);
        document.documentElement.classList.remove("cursor-effects-enabled");
        onPointerLeave();
      }
    };
    reducedMotion.addEventListener("change", onMotionChange);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("portfolio-pointer-move", onPointerMove);
      window.removeEventListener("portfolio-pointer-leave", onPointerLeave);
      document.removeEventListener("pointerover", onPointerOver);
      document.removeEventListener("click", onClick);
      reducedMotion.removeEventListener("change", onMotionChange);
      document.documentElement.classList.remove("cursor-effects-enabled");
      for (const item of magneticElements) item.element.style.transform = "";
      for (const card of premiumCards) {
        card.element.style.removeProperty("--spotlight-x");
        card.element.style.removeProperty("--spotlight-y");
        card.element.style.removeProperty("--card-tilt-x");
        card.element.style.removeProperty("--card-tilt-y");
      }
    };
  }, []);

  return (
    <>
      <div ref={glowRef} className="cursor-hover-glow" aria-hidden="true" />
      <div ref={cursorRef} className="cursor-ring" aria-hidden="true" />
      <div ref={dotRef} className="cursor-dot" aria-hidden="true" />
      {[0, 1, 2, 3, 4, 5].map((index) => (
        <span
          key={index}
          data-cursor-trail=""
          className="cursor-trail-node"
          aria-hidden="true"
        />
      ))}
    </>
  );
}
