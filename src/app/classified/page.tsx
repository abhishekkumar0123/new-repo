"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { X, Terminal, ShieldAlert, Keyboard, ArrowLeft } from "lucide-react";
import Link from "next/link";

const CLEARANCE_LINES = [
  "INITIALIZING SECURE TERMINAL...",
  "VERIFYING BIOMETRIC CLEARANCE...",
  "CLEARANCE LEVEL: UNCLASSIFIED // PENDING",
  "BYPASSING PROTOCOL...",
  "CLEARANCE LEVEL: CONFIRMED // TS/SCI",
  "ACCESS GRANTED",
  "",
  "WELCOME TO THE CLASSIFIED ARCHIVE",
  "ALL CONTENT IS SIMULATED FOR PORTFOLIO DEMONSTRATION",
  "NO REAL CREDENTIALS, KEYS, OR SENSITIVE DATA ARE STORED HERE",
  "",
];

const CASE_FILES = [
  {
    id: "CF-001",
    title: "Project Aegis - Network Hardening",
    classification: "CONFIDENTIAL",
    summary:
      "Simulated network segmentation and firewall rule audit for a fictional training environment.",
  },
  {
    id: "CF-002",
    title: "Operation Silent Log - SIEM Correlation",
    classification: "SECRET",
    summary:
      "Fictional SIEM rule tuning exercise demonstrating alert correlation and false-positive reduction.",
  },
  {
    id: "CF-003",
    title: "Red Team Exercise - Blue Response",
    classification: "TOP SECRET",
    summary:
      "Simulated defensive response to a fictional red team engagement. All indicators are training data.",
  },
];

export default function ClassifiedPage() {
  const [booted, setBooted] = useState(false);
  const [lineIndex, setLineIndex] = useState(0);
  const [selectedCase, setSelectedCase] = useState<string | null>(null);
  const bootRef = useRef<number | null>(null);

  const startBoot = useCallback(() => {
    const interval = window.setInterval(() => {
      setLineIndex((prev) => (prev + 1 < CLEARANCE_LINES.length ? prev + 1 : prev));
      if (lineIndex >= CLEARANCE_LINES.length - 1) {
        window.clearInterval(interval);
        setBooted(true);
      }
    }, 120);
    bootRef.current = interval;
  }, [lineIndex]);

  useEffect(() => {
    startBoot();
    return () => {
      if (bootRef.current) window.clearInterval(bootRef.current);
    };
  }, [startBoot]);

  if (!booted) {
    return (
      <main className="min-h-screen bg-[#070b10] font-mono text-[10px] text-[#00ff91] p-5 lg:px-8">
        <div className="glass-panel mx-auto max-w-lg p-7 border-[#00ff91]/20">
          <div className="space-y-1" aria-live="polite">
            {CLEARANCE_LINES.slice(0, lineIndex + 1).map((line, index) => (
              <div key={index}>{line}</div>
            ))}
          </div>
          <div className="mt-4">
            <span className="animate-pulse">█</span>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#070b10] font-mono text-xs p-5 lg:px-8">
      <Link
        href="/"
        className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-1.5 text-[#77847e] hover:border-[#00ff91]/40 hover:text-[#00ff91] transition mb-6"
      >
        <ArrowLeft size={13} /> Return to portfolio
      </Link>

      <div className="glass-panel max-w-4xl mx-auto overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.07] px-5 py-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="text-[#58d7f7]" size={16} />
            <span className="text-[#58d7f7]">CLASSIFIED // SIMULATED ARCHIVE</span>
          </div>
          <button
            type="button"
            onClick={() => window.location.replace("/")}
            className="grid size-9 place-items-center border border-white/[0.08] text-[#77847e] hover:text-[#ff7b72]"
            aria-label="Exit classified archive"
          >
            <X size={14} />
          </button>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr] p-6">
          <aside className="space-y-3">
            <p className="font-mono text-[9px] uppercase text-[#77847e]">
              Case files
            </p>
            {CASE_FILES.map((file) => (
              <button
                key={file.id}
                type="button"
                onClick={() => setSelectedCase(file.id)}
                className={`flex items-center justify-between border px-3 py-2 text-left transition ${selectedCase === file.id ? "border-[#00ff91]/40 bg-[#00ff91]/[0.05] text-[#00ff91]" : "border-white/[0.08] text-[#9ba8a1]"}`}
              >
                <span>{file.id}</span>
                <span className="text-[#77847e]">{file.classification}</span>
              </button>
            ))}
          </aside>

          <section className="border-l border-white/[0.06] lg:border-l lg:pl-6">
            {selectedCase ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-white/[0.07] pb-3">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {CASE_FILES.find((f) => f.id === selectedCase)?.title}
                    </h2>
                    <span className="inline-flex border px-2 py-1 font-mono text-[9px] uppercase text-[#77847e]">
                      {CASE_FILES.find((f) => f.id === selectedCase)?.classification}
                    </span>
                  </div>
                </div>
                <p className="text-sm leading-7 text-[#bdc8c2]">
                  {CASE_FILES.find((f) => f.id === selectedCase)?.summary}
                </p>
                <div className="mt-5 border border-white/[0.07] p-4 bg-black/10">
                  <p className="font-mono text-[9px] uppercase text-[#58d7f7]">
                    Simulated notes
                  </p>
                  <p className="mt-2 text-sm text-[#9ba8a1]">
                    This case file is a fictional training artifact. No real
                    systems, credentials, or classified information are
                    referenced.
                  </p>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 text-center">
                <Terminal className="mx-auto mb-4 text-[#58d7f7]/30" size={48} />
                <h3 className="text-lg font-semibold">Select a case file</h3>
                <p className="mt-2 text-sm text-[#9ba8a1]">
                  Choose from the archive on the left to view simulated case
                  details.
                </p>
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-white/[0.06] px-6 py-4">
          <Keyboard className="mr-2 inline text-[#77847e]" size={13} />
          <span className="text-[9px] text-[#77847e]">
            All content simulated · fictional only · press Esc to exit
          </span>
        </div>
      </div>
    </main>
  );
}
