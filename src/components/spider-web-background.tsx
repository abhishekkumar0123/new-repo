"use client";

import { useEffect, useRef } from "react";

interface Particle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  phase: number;
  drift: number;
  seed: number;
}

export function SpiderWebBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let width = window.innerWidth;
    let height = window.innerHeight;
    let animationFrame = 0;
    let particles: Particle[] = [];
    let initialized = false;
    let activePointer = false;

    const pointer = { x: width * 0.5, y: height * 0.5 };
    const focal = { x: width * 0.5, y: height * 0.5 };

    const random = (seed: number) => {
      const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
      return value - Math.floor(value);
    };

    const createParticles = () => {
      const area = width * height;
      const count = Math.max(32, Math.min(92, Math.round(area / 14500)));

      particles = Array.from({ length: count }, (_, index) => {
        const seed = index * 17.31 + width * 0.013 + height * 0.009;
        const baseX = random(seed) * width;
        const baseY = random(seed + 9.1) * height;

        return {
          x: baseX,
          y: baseY,
          baseX,
          baseY,
          vx: 0,
          vy: 0,
          radius: 0.65 + random(seed + 3.7) * 1.25,
          phase: random(seed + 5.2) * Math.PI * 2,
          drift: 0.00035 + random(seed + 11.4) * 0.00055,
          seed,
        };
      });
    };

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      if (!initialized) {
        pointer.x = width * 0.5;
        pointer.y = height * 0.5;
        focal.x = pointer.x;
        focal.y = pointer.y;
        initialized = true;
      }
      createParticles();
    };

    const onPointerMove = (event: PointerEvent) => {
      if (event.pointerType === "touch") {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      } else {
        pointer.x = event.clientX;
        pointer.y = event.clientY;
      }
      activePointer = true;
    };

    const onPointerLeave = () => {
      activePointer = false;
      pointer.x = width * 0.5;
      pointer.y = height * 0.5;
    };

    const drawCurve = (
      startX: number,
      startY: number,
      endX: number,
      endY: number,
      controlX: number,
      controlY: number,
      alpha: number,
    ) => {
      context.beginPath();
      context.moveTo(startX, startY);
      context.quadraticCurveTo(controlX, controlY, endX, endY);
      context.strokeStyle = `rgba(55, 196, 220, ${alpha})`;
      context.stroke();
    };

    const draw = (time: number) => {
      context.clearRect(0, 0, width, height);

      const smoothing = activePointer ? 0.065 : 0.028;
      focal.x += (pointer.x - focal.x) * smoothing;
      focal.y += (pointer.y - focal.y) * smoothing;

      const pointerEnergy = activePointer ? 1 : 0.12;

      for (const particle of particles) {
        const ambientX = Math.sin(time * particle.drift + particle.phase) * 3.2;
        const ambientY =
          Math.cos(time * particle.drift * 0.82 + particle.phase) * 3.2;

        const dx = focal.x - particle.baseX;
        const dy = focal.y - particle.baseY;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const attractionRadius = Math.min(Math.max(width, height) * 0.68, 760);
        const falloff = Math.max(0, 1 - distance / attractionRadius);

        const swirl =
          Math.sin(particle.phase + time * 0.00032) * 10 * pointerEnergy;
        const pull = falloff * (activePointer ? 0.34 : 0.025);
        const targetX =
          particle.baseX + dx * pull + (-dy / distance) * swirl + ambientX;
        const targetY =
          particle.baseY + dy * pull + (dx / distance) * swirl + ambientY;

        particle.vx += (targetX - particle.x) * 0.018;
        particle.vy += (targetY - particle.y) * 0.018;
        particle.vx *= 0.88;
        particle.vy *= 0.88;
        particle.x += particle.vx;
        particle.y += particle.vy;
      }

      context.lineWidth = 0.55;

      for (let i = 0; i < particles.length; i += 1) {
        const particle = particles[i];

        for (let j = i + 1; j < particles.length; j += 1) {
          const neighbor = particles[j];
          const dx = particle.x - neighbor.x;
          const dy = particle.y - neighbor.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 112) {
            const midpointX = (particle.x + neighbor.x) * 0.5;
            const midpointY = (particle.y + neighbor.y) * 0.5;
            const bendSeed = (particle.seed + neighbor.seed) * 0.5;
            const bend =
              Math.sin(time * 0.00018 + bendSeed) *
              (4 + Math.min(distance * 0.035, 8));
            const nx = -(neighbor.y - particle.y) / (distance || 1);
            const ny = (neighbor.x - particle.x) / (distance || 1);

            drawCurve(
              particle.x,
              particle.y,
              neighbor.x,
              neighbor.y,
              midpointX + nx * bend,
              midpointY + ny * bend,
              (1 - distance / 112) * 0.105,
            );
          }
        }

        const toFocalX = particle.x - focal.x;
        const toFocalY = particle.y - focal.y;
        const focalDistance = Math.sqrt(
          toFocalX * toFocalX + toFocalY * toFocalY,
        );

        if (activePointer && focalDistance < 330) {
          const midpointX = (particle.x + focal.x) * 0.5;
          const midpointY = (particle.y + focal.y) * 0.5;
          const bend =
            Math.sin(particle.phase + time * 0.00055) *
            (7 + (330 - focalDistance) * 0.018);
          const nx = -toFocalY / (focalDistance || 1);
          const ny = toFocalX / (focalDistance || 1);

          drawCurve(
            focal.x,
            focal.y,
            particle.x,
            particle.y,
            midpointX + nx * bend,
            midpointY + ny * bend,
            (1 - focalDistance / 330) * 0.24,
          );
        }
      }

      if (activePointer) {
        const spokes = width < 600 ? 9 : 13;
        const maxSpoke = Math.min(Math.max(width, height) * 0.42, 430);

        for (let index = 0; index < spokes; index += 1) {
          const angle =
            (index / spokes) * Math.PI * 2 +
            Math.sin(time * 0.00015 + index * 2.13) * 0.18;
          const length = maxSpoke * (0.58 + random(index + 31) * 0.42);
          const endX = focal.x + Math.cos(angle) * length;
          const endY = focal.y + Math.sin(angle) * length;
          const controlX =
            focal.x +
            Math.cos(angle + 0.42 * Math.sin(index * 1.7)) * length * 0.52;
          const controlY =
            focal.y +
            Math.sin(angle + 0.34 * Math.cos(index * 1.3)) * length * 0.52;

          drawCurve(focal.x, focal.y, endX, endY, controlX, controlY, 0.16);
        }

        const glow = context.createRadialGradient(
          focal.x,
          focal.y,
          0,
          focal.x,
          focal.y,
          46,
        );
        glow.addColorStop(0, "rgba(102, 226, 255, 0.16)");
        glow.addColorStop(0.42, "rgba(40, 184, 218, 0.07)");
        glow.addColorStop(1, "rgba(40, 184, 218, 0)");
        context.fillStyle = glow;
        context.beginPath();
        context.arc(focal.x, focal.y, 46, 0, Math.PI * 2);
        context.fill();
      }

      for (const particle of particles) {
        const dx = particle.x - focal.x;
        const dy = particle.y - focal.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const nearby = activePointer ? Math.max(0, 1 - distance / 250) : 0;

        if (nearby > 0) {
          context.fillStyle = `rgba(91, 213, 235, ${0.32 + nearby * 0.5})`;
          context.beginPath();
          context.arc(
            particle.x,
            particle.y,
            particle.radius + nearby * 0.9,
            0,
            Math.PI * 2,
          );
          context.fill();
        } else {
          context.fillStyle = "rgba(112, 205, 203, 0.34)";
          context.beginPath();
          context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
          context.fill();
        }
      }

      if (activePointer) {
        context.fillStyle = "rgba(176, 244, 255, 0.88)";
        context.beginPath();
        context.arc(focal.x, focal.y, 1.5, 0, Math.PI * 2);
        context.fill();
      }

      if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const restart = () => {
      window.cancelAnimationFrame(animationFrame);
      animationFrame = window.requestAnimationFrame(draw);
    };

    resize();
    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.documentElement.addEventListener("mouseleave", onPointerLeave);
    reducedMotion.addEventListener("change", restart);

    restart();

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onPointerMove);
      document.documentElement.removeEventListener(
        "mouseleave",
        onPointerLeave,
      );
      reducedMotion.removeEventListener("change", restart);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="spider-web-background"
      aria-hidden="true"
    />
  );
}
