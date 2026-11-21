"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Terminal, ShieldAlert } from "lucide-react";

const KONAMI_SEQUENCE = [
  "ArrowUp",
  "ArrowUp",
  "ArrowDown",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowLeft",
  "ArrowRight",
  "b",
  "a",
];

const ASCII_ART = [
  "  ___  ___  _   _  ____  _____  ",
  " / _ \\| __| / \\ | |/ ___|| ____| ",
  "| | | | _| / _ \\| \\___ \\|  _|   ",
  "| |_| | |_/_/\\ \\___ ) | |___    ",
  " \\___/|____/_/   \\____/|_____|   ",
  "                                  ",
  "  ACQUIRED: CLEARANCE LEVEL 9     ",
  "  SYSTEM: CLASSIFIED // CORE      ",
];

export function KonamiEasterEgg() {
  const [active, setActive] = useState(false);
  const buffer = useRef<string[]>([]);

  const dismiss = useCallback(() => {
    setActive(false);
  }, []);

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

    const onKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (
        target?.closest("input, textarea, [contenteditable='true'], select")
      ) {
        buffer.current = [];
        return;
      }

      buffer.current.push(event.key.toLowerCase());
      if (buffer.current.length > KONAMI_SEQUENCE.length) {
        buffer.current.shift();
      }

      if (
        buffer.current.length === KONAMI_SEQUENCE.length &&
        buffer.current.every((key, index) => key === KONAMI_SEQUENCE[index])
      ) {
        buffer.current = [];
        setActive(true);
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => window.removeEventListener("keydown", onKeydown);
  }, []);

  if (!active) return null;

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#070b10]/95 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="Secret terminal access"
    >
      <div className="absolute inset-0 grid place-items-center p-6">
        <div
          className="glass-panel max-w-lg p-8 sm:p-10 border-[#58d7f7]/30"
        >
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <button
              type="button"
              onClick={dismiss}
              className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e] hover:text-[#ff7b72]"
              aria-label="Close secret access"
            >
              <X size={16} />
            </button>
          </div>
          <div className="mb-4 font-mono text-[10px] leading-6 text-[#00ff91]">
            {ASCII_ART.map((line) => (
              <div key={line} className="tab-num">
                {line}
              </div>
            ))}
          </div>
          <div className="mb-6 space-y-3 font-mono text-sm text-[#bdc8c2]">
            <p>
              <Terminal size={14} className="mr-2 inline text-[#58d7f7]" />
              $ <span className="text-[#dfe7e3]">access granted // clearance level 9</span>
            </p>
            <p>
              <span className="text-[#58d7f7]">$</span> <span className="text-[#dfe7e3]">cat /secret/cybernote.txt</span>
            </p>
            <p>
              <span className="text-[#77847e]">[OK]</span>
              <span className="text-[#dfe7e3]"> &quot;The best defense is understanding how the attack works. Keep learning, keep documenting.&quot;</span>
            </p>
          </div>
          <p className="font-mono text-[9px] uppercase tracking-wider text-[#77847e]">
            Konami sequence detected · secret terminal unlocked
          </p>
        </div>
      </div>
      <ShieldAlert
        className="absolute bottom-8 right-8 text-[#58d7f7]/10"
        size={140}
        aria-hidden="true"
      />
    </div>
  );
}
