"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Mail, ArrowUp } from "lucide-react";

interface FooterSectionProps {
  links: Record<string, unknown>[];
  settings?: Record<string, unknown> | null;
  profile?: Record<string, unknown> | null;
}

export function FooterSection({
  links,
  settings,
  profile,
}: FooterSectionProps) {
  const [scrolled, setScrolled] = useState(false);
  const contactEmail = String(settings?.contact_email || "");
  const availability = String(profile?.availability || "");
  const currentYear = new Date().getFullYear();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 200);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const socialLinks = links.filter((link) => {
    const platform = String(link.platform || "").toLowerCase();
    return (
      platform.includes("github") ||
      platform.includes("linkedin") ||
      platform.includes("twitter") ||
      platform.includes("x") ||
      platform.includes("website") ||
      platform.includes("email")
    );
  });

  const navLinks = [
    ["Home", "#home"],
    ["About", "#about"],
    ["Timeline", "#timeline"],
    ["Skills", "#skills"],
    ["Projects", "#projects"],
    ["Writeups", "#writeups"],
    ["Certifications", "#certifications"],
    ["Contact", "#contact"],
  ];

  return (
    <>
      {scrolled && (
        <button
          type="button"
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 z-40 grid size-12 place-items-center border border-white/[0.12] bg-[#0d161d]/90 backdrop-blur-md text-[#bdc8c2] hover:border-[#00ff91]/50 hover:text-[#00ff91] hover:bg-[#00ff91]/[0.08] transition rounded-lg"
          aria-label="Scroll to top"
        >
          <ArrowUp size={16} />
          <span className="sr-only">Back to top</span>
        </button>
      )}
      <footer className="border-t border-white/[0.06] px-5 py-7 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-6 md:grid-cols-4">
            <div className="col-span-4 md:col-span-1">
              <p className="font-mono text-xs uppercase tracking-wider text-[#00ff91]">
                ABHISHEK
              </p>
              <p className="mt-2 text-sm text-[#bdc8c2]">
                Cybersecurity portfolio — SOC analyst aspirant
              </p>
              {availability && (
                <p className="mt-3 font-mono text-[10px] text-[#58d7f7]">
                  {availability}
                </p>
              )}
            </div>
            <div className="md:col-span-2">
              <p className="font-mono text-xs uppercase tracking-wider text-[#77847e]">
                Navigation
              </p>
              <div className="mt-3 grid gap-2">
                {navLinks.map(([label, href]) => (
                  <Link
                    key={href}
                    href={href}
                    className="font-mono text-xs text-[#9ba8a1] hover:text-[#00ff91] transition"
                  >
                    {label}
                  </Link>
                ))}
              </div>
            </div>
            <div className="md:col-span-1">
              <p className="font-mono text-xs uppercase tracking-wider text-[#77847e]">
                Connect
              </p>
              <div className="mt-3 flex gap-2">
                {socialLinks.map((link) => {
                  const platform = String(link.platform || "social");
                  const lower = platform.toLowerCase();
                  const label = lower.includes("github")
                    ? "GH"
                    : lower.includes("linkedin")
                      ? "IN"
                      : platform.slice(0, 2).toUpperCase();
                  return (
                    <a
                      key={String(link.id || link.url)}
                      href={String(link.url)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={platform}
                      className="grid size-8 place-items-center border border-white/[0.08] text-[#9ba8a1] transition hover:border-[#58d7f7]/40 hover:bg-[#58d7f7]/[0.06] hover:text-[#58d7f7]"
                    >
                      {label}
                    </a>
                  );
                })}
              </div>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="mt-2 inline-flex items-center gap-2 font-mono text-[10px] text-[#58d7f7] hover:text-[#00ff91] transition"
                >
                  <Mail size={13} /> {contactEmail}
                </a>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-white/[0.06] flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#77847e]">
              © {currentYear} Abhishek. All rights reserved.
            </p>
            <p className="font-mono text-[10px] uppercase tracking-wider text-[#77847e]">
              Built with Next.js, Tailwind, and Supabase
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
