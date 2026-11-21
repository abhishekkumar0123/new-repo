"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDown, Download, Mail, ShieldCheck, Terminal } from "lucide-react";

const professionalRoles = [
  "Cybersecurity Enthusiast",
  "SOC Analyst Aspirant",
  "Security Researcher",
  "Linux Explorer",
];

export function Hero({
  profile,
  links = [],
}: {
  profile?: Record<string, unknown> | null;
  links?: Record<string, unknown>[];
}) {
  const name = String(profile?.name || "ABHISHEK");
  const title = String(profile?.title || "Cybersecurity Fresher");
  const introduction = String(
    profile?.introduction ||
      "Building practical skills in security monitoring, incident investigation, networking, and defensive analysis.",
  );
  const availability = String(
    profile?.availability || "Open to opportunities & internships",
  );
  const resumeUrl = String(profile?.resume_url || "");
  const [roleIndex, setRoleIndex] = useState(0);
  const [visibleRole, setVisibleRole] = useState(professionalRoles[0]);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let timeout = 0;
    let cancel = false;

    const rotateRole = () => {
      setVisibleRole("");
      timeout = window.setTimeout(() => {
        if (cancel) return;
        const nextIndex = (roleIndex + 1) % professionalRoles.length;
        setRoleIndex(nextIndex);
        setVisibleRole(professionalRoles[nextIndex]);
      }, 280);
    };

    const interval = window.setInterval(rotateRole, 3200);
    return () => {
      cancel = true;
      window.clearInterval(interval);
      window.clearTimeout(timeout);
    };
  }, [roleIndex]);

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

  return (
    <section
      id="home"
      className="relative flex min-h-[calc(100vh-72px)] items-center overflow-hidden pt-[72px]"
    >
      <div className="grid-fade absolute inset-0" />
      <div className="mx-auto grid w-full max-w-7xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1.08fr_.92fr] lg:gap-12 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <motion.div
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.08 }}
            className="mb-7 inline-flex items-center gap-2 border border-[#00ff91]/20 bg-[#00ff91]/[0.05] px-3 py-2 font-mono text-[10px] uppercase tracking-[.16em] text-[#00ff91] sm:text-[11px]"
          >
            <span className="relative size-1.5 rounded-full bg-[#00ff91]">
              <span className="absolute inset-0 animate-ping rounded-full bg-[#00ff91] opacity-60" />
            </span>
            {availability}
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.12 }}
            className="mb-3 font-mono text-sm text-[#00ff91]"
          >
            &gt; identity.confirmed
          </motion.p>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.65, delay: 0.16 }}
            className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[72px]"
          >
            Hi, I’m <span className="text-[#58d7f7]">{name}</span>
            <span className="mt-3 block max-w-2xl text-xl font-medium leading-tight text-[#dfe8e3] sm:text-2xl lg:text-[30px]">
              Securing systems. Investigating threats.
            </span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.24 }}
            className="mt-5 flex min-h-8 items-center gap-2 font-mono text-sm text-[#9ba8a1] sm:text-lg"
          >
            <span className="text-[#58d7f7]">{title}</span>
            <span className="text-[#77847e]">/</span>
            <span className="hero-role" aria-live="polite">
              {visibleRole}
              <span className="role-caret" aria-hidden="true" />
            </span>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.32 }}
            className="mt-5 max-w-xl text-base leading-7 text-[#b7c2bd] sm:text-lg"
          >
            {introduction}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.38 }}
            className="mt-8 flex flex-wrap gap-3"
          >
            <a
              data-magnetic
              href="#projects"
              className="hero-cta hero-cta-primary"
            >
              View Projects <ArrowDown size={15} />
            </a>
            <a
              data-magnetic
              href="#contact"
              className="hero-cta hero-cta-secondary"
            >
              <Mail size={15} /> Contact Me
            </a>
            {resumeUrl ? (
              <a
                data-magnetic
                href={resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="hero-cta hero-cta-secondary"
                aria-label="Download resume"
              >
                <Download size={15} /> Download Resume
              </a>
            ) : (
              <button
                disabled
                className="hero-cta border border-white/10 text-[#77847e]"
                title="Add a resume PDF from the CMS"
              >
                <Download size={15} /> Resume
              </button>
            )}
          </motion.div>

          {socialLinks.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.55, delay: 0.46 }}
              className="mt-7 flex items-center gap-2"
              aria-label="Social links"
            >
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
                    className="grid size-10 place-items-center border border-white/[0.08] text-[#9ba8a1] transition hover:border-[#58d7f7]/40 hover:bg-[#58d7f7]/[0.06] hover:text-[#58d7f7]"
                  >
                    {label}
                  </a>
                );
              })}
            </motion.div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97, x: 12 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.18 }}
          className="glass-panel scanlines relative overflow-hidden p-3 sm:p-5"
        >
          <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#ff5f57]" />
              <span className="size-2.5 rounded-full bg-[#febc2e]" />
              <span className="size-2.5 rounded-full bg-[#28c840]" />
            </div>
            <span className="font-mono text-[10px] uppercase tracking-[.18em] text-[#77847e]">
              system / status
            </span>
          </div>
          <div className="grid min-h-[300px] content-between gap-8 p-3 sm:min-h-[340px] sm:p-5">
            <div>
              <div className="mb-4 flex items-center gap-2 font-mono text-xs text-[#58d7f7]">
                <Terminal size={14} /> portfolio-session
              </div>
              <div className="space-y-3 font-mono text-xs leading-6 text-[#bdc8c2]">
                <p>
                  <span className="text-[#58d7f7]">$</span> initializing
                  profile...
                </p>
                <p>
                  <span className="text-[#58d7f7]">$</span> loading defensive
                  modules
                </p>
                <p className="text-[#77847e]">[OK] networking fundamentals</p>
                <p className="text-[#77847e]">[OK] security monitoring</p>
                <p className="text-[#77847e]">[OK] evidence-based analysis</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {[
                ["SYSTEM", "READY"],
                ["MODE", "LEARN"],
                ["FOCUS", "SOC"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="border border-white/[0.07] bg-black/10 p-3"
                >
                  <p className="font-mono text-[9px] text-[#77847e]">{label}</p>
                  <p className="mt-1 font-mono text-xs text-[#58d7f7]">
                    {value}
                  </p>
                </div>
              ))}
            </div>
          </div>
          <ShieldCheck
            className="absolute bottom-8 right-8 text-[#58d7f7]/10"
            size={110}
          />
        </motion.div>
      </div>

      <a
        href="#about"
        className="hero-scroll-indicator"
        aria-label="Scroll to about section"
      >
        <span>SCROLL</span>
        <ArrowDown size={13} />
      </a>
    </section>
  );
}
