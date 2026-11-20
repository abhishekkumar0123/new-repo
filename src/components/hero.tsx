"use client";

import { motion } from "framer-motion";
import { ArrowDown, Download, Mail, ShieldCheck, Terminal } from "lucide-react";

export function Hero({
  profile,
}: {
  profile?: Record<string, unknown> | null;
}) {
  const name = String(profile?.name || "ABHISHEK");
  const title = String(profile?.title || "Cybersecurity Fresher");
  const introduction = String(
    profile?.introduction ||
      "Building practical skills in security monitoring, incident investigation, networking, and defensive analysis. This portfolio is ready for your verified experience and learning journey.",
  );
  const availability = String(
    profile?.availability || "Available for entry-level opportunities",
  );

  return (
    <section
      id="home"
      className="relative flex min-h-screen items-center overflow-hidden pt-[72px]"
    >
      <div className="grid-fade absolute inset-0" />
      <div className="mx-auto grid w-full max-w-7xl gap-12 px-5 py-20 lg:grid-cols-[1.05fr_.95fr] lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <div className="mb-7 inline-flex items-center gap-2 border border-[#00ff91]/20 bg-[#00ff91]/[0.05] px-3 py-2 font-mono text-[11px] uppercase tracking-[.16em] text-[#00ff91]">
            <span className="size-1.5 animate-pulse rounded-full bg-[#00ff91]" />{" "}
            {availability}
          </div>
          <p className="mb-3 font-mono text-sm text-[#00ff91]">
            &gt; identity.confirmed
          </p>
          <h1 className="max-w-3xl text-5xl font-semibold leading-[1.02] tracking-tight sm:text-6xl lg:text-[72px]">
            {name}
          </h1>
          <p className="mt-5 font-mono text-lg text-[#9ba8a1] sm:text-xl">
            {title} <span className="text-[#00ff91]">/</span> SOC Analyst Focus
          </p>
          <p className="mt-6 max-w-xl text-base leading-7 text-[#b7c2bd] sm:text-lg">
            {introduction}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a
              href="#projects"
              className="inline-flex h-12 items-center gap-2 bg-[#00ff91] px-5 font-mono text-xs font-bold uppercase tracking-wider text-[#06110b] transition hover:bg-[#55ffae]"
            >
              View projects <ArrowDown size={15} />
            </a>
            <a
              href="#contact"
              className="inline-flex h-12 items-center gap-2 border border-[#00ff91]/35 px-5 font-mono text-xs font-bold uppercase tracking-wider text-[#00ff91] transition hover:bg-[#00ff91]/[0.07]"
            >
              <Mail size={15} /> Contact
            </a>
            <button
              disabled
              className="inline-flex h-12 items-center gap-2 border border-white/10 px-5 font-mono text-xs uppercase tracking-wider text-[#77847e]"
              title="Upload a resume from the CMS"
            >
              <Download size={15} /> Resume{" "}
              <span className="text-[9px]">— placeholder</span>
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.97 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.12 }}
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
          <div className="grid min-h-[340px] content-between gap-8 p-3 sm:p-5">
            <div>
              <div className="mb-4 flex items-center gap-2 font-mono text-xs text-[#00ff91]">
                <Terminal size={14} /> portfolio-session
              </div>
              <div className="space-y-3 font-mono text-xs leading-6 text-[#bdc8c2]">
                <p>
                  <span className="text-[#00ff91]">$</span> initializing
                  profile...
                </p>
                <p>
                  <span className="text-[#00ff91]">$</span> loading defensive
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
              ].map(([a, b]) => (
                <div
                  key={a}
                  className="border border-white/[0.07] bg-black/10 p-3"
                >
                  <p className="font-mono text-[9px] text-[#77847e]">{a}</p>
                  <p className="mt-1 font-mono text-xs text-[#00ff91]">{b}</p>
                </div>
              ))}
            </div>
          </div>
          <ShieldCheck
            className="absolute bottom-8 right-8 text-[#00ff91]/10"
            size={110}
          />
        </motion.div>
      </div>
    </section>
  );
}
