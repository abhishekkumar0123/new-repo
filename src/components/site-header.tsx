"use client";

import Link from "next/link";
import { useCallback, useRef, useState } from "react";
import { Menu, Shield, X, Terminal } from "lucide-react";
import { KonamiEasterEgg } from "@/components/konami-easter-egg";

const links = [
  ["Home", "#home"],
  ["About", "#about"],
  ["Timeline", "#timeline"],
  ["Skills", "#skills"],
  ["Projects", "#projects"],
  ["Writeups", "#writeups"],
  ["Certifications", "#certifications"],
  ["Contact", "#contact"],
];

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [logoSecret, setLogoSecret] = useState(0);
  const logoClicks = useRef<number>(0);
  const logoTimeout = useRef<number | null>(null);

  const handleLogoClick = useCallback(() => {
    logoClicks.current += 1;
    if (logoTimeout.current) {
      window.clearTimeout(logoTimeout.current);
    }
    logoTimeout.current = window.setTimeout(() => {
      logoClicks.current = 0;
    }, 1500);

    if (logoClicks.current === 5) {
      logoClicks.current = 0;
      setLogoSecret((prev) => prev + 1);
    }
  }, []);

  return (
    <>
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.06] bg-[#090c0b]/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 lg:px-8">
          <Link
            href="#home"
            onClick={handleLogoClick}
            className="flex items-center gap-3 font-mono text-sm font-semibold tracking-[.18em] text-white"
          >
            <span className="grid size-9 place-items-center border border-[#00ff91]/30 bg-[#00ff91]/[0.07] text-[#00ff91]">
              <Shield size={17} />
            </span>
            ABHISHEK
          </Link>
          <nav
            className="hidden items-center gap-1 lg:flex"
            aria-label="Primary navigation"
          >
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                className="rounded-md px-3 py-2 font-mono text-xs text-[#9ba8a1] transition hover:bg-[#00ff91]/[0.06] hover:text-[#00ff91]"
              >
                {label}
              </Link>
            ))}
          </nav>
          <button
            onClick={() => setOpen(!open)}
            className="grid size-10 place-items-center border border-white/10 text-white lg:hidden"
            aria-expanded={open}
            aria-label="Toggle navigation"
          >
            {open ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {open && (
          <nav className="grid border-t border-white/[0.06] bg-[#090c0b] px-5 py-3 lg:hidden">
            {links.map(([label, href]) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="border-b border-white/[0.05] py-3 font-mono text-sm text-[#b5c0ba]"
              >
                {label}
              </Link>
            ))}
          </nav>
        )}
      </header>
      {logoSecret > 0 && (
        <div
          className="fixed top-[72px] left-0 right-0 z-[60] border-b border-white/[0.06] bg-[#070b10]/90 backdrop-blur-md"
        >
          <div className="mx-auto max-w-7xl px-5 py-3 flex items-center justify-between font-mono text-[10px] uppercase">
            <span className="text-[#00ff91]">
              Secret mode activated · {logoSecret} time{logoSecret === 1 ? "" : "s"}
            </span>
            <span className="text-[#77847e]">Type in the terminal: matrix · secret · decrypt · easteregg · 42 · whoami --secret</span>
          </div>
        </div>
      )}
    </>
  );
}
