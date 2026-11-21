"use client";

import { BookOpen, ShieldAlert, Clock, Target } from "lucide-react";

interface AboutSectionProps {
  profile?: Record<string, unknown> | null;
}

export function AboutSection({ profile }: AboutSectionProps) {
  const biography = String(
    profile?.biography ||
      "I am a cybersecurity fresher developing foundational knowledge for a SOC Analyst role. My current focus is on understanding networks, security telemetry, alert investigation, and clear documentation.",
  );
  const objective = String(
    profile?.objective || "Secure an entry-level cybersecurity opportunity",
  );
  const learningFocus = String(
    profile?.learning_focus || "SOC workflows and defensive analysis",
  );
  const availability = String(
    profile?.availability || "Available for entry-level opportunities",
  );

  const interests = [
    { label: "Network security", desc: "TCP/IP, traffic analysis, packet evidence" },
    { label: "SOC analysis", desc: "Alert triage, telemetry, incident investigation" },
    { label: "Linux", desc: "Command-line, system navigation, security hardening" },
    { label: "Defensive security", desc: "Threat hunting, log monitoring, risk awareness" },
  ];

  return (
    <section id="about" className="border-y border-white/[0.06] px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10">
          <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
            // 01 — profile
          </p>
          <h2 className="mt-4 text-4xl font-semibold">About me</h2>
          <p className="mt-3 max-w-xl text-sm text-[#9ba8a1]">
            A candid look at where I am, what I am learning, and where I am headed.
          </p>
        </div>

        <div className="grid gap-12 lg:grid-cols-[1.15fr_1fr]">
          <div>
            <div className="glass-panel scanlines p-7 sm:p-9 relative overflow-hidden">
              <div className="mb-4 flex items-center justify-between border-b border-white/[0.07] pb-3">
                <div className="flex gap-1.5" aria-hidden="true">
                  <span className="size-2.5 rounded-full bg-[#ff5f57]" />
                  <span className="size-2.5 rounded-full bg-[#febc2e]" />
                  <span className="size-2.5 rounded-full bg-[#28c840]" />
                </div>
                <span className="font-mono text-[10px] uppercase text-[#77847e]">
                  biography / profile
                </span>
              </div>
              <p className="font-mono text-sm leading-7 text-[#bdc8c2]">
                {biography}
              </p>
              <div className="mt-8">
                <p className="mb-3 font-mono text-[9px] uppercase text-[#77847e]">
                  Technical interests
                </p>
                <div className="flex flex-wrap gap-2">
                  {interests.map((interest) => (
                    <span
                      key={interest.label}
                      className="border border-white/[0.07] px-3 py-1 font-mono text-[9px] text-[#9ba8a1] hover:border-[#00ff91]/40 hover:text-[#00ff91] transition"
                    >
                      {interest.label}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-5">
            <div className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-md bg-[#00ff91]/[0.08] text-[#00ff91] shrink-0">
                  <Target size={16} className="text-[#00ff91]" />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Current focus
                  </p>
                  <p className="mt-2 text-sm text-[#dfe7e3]">
                    {objective}
                  </p>
                </div>
              </div>
            </div>
            <div className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-md bg-[#58d7f7]/[0.08] text-[#58d7f7] shrink-0">
                  <BookOpen size={16} />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Learning direction
                  </p>
                  <p className="mt-2 text-sm text-[#dfe7e3]">
                    {learningFocus}
                  </p>
                </div>
              </div>
            </div>
            <div className="glass-panel p-6">
              <div className="flex items-start gap-3">
                <div className="grid size-8 place-items-center rounded-md bg-[#a855f7]/[0.08] text-[#a855f7] shrink-0">
                  <Clock size={16} />
                </div>
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Availability
                  </p>
                  <p className="mt-2 text-sm text-[#dfe7e3]">
                    {availability}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 glass-panel p-8 sm:p-10">
          <div className="flex items-start gap-4">
            <div className="grid size-9 place-items-center rounded-md bg-[#58d7f7]/[0.08] text-[#58d7f7] shrink-0">
              <ShieldAlert size={18} />
            </div>
            <div>
              <p className="font-mono text-[9px] uppercase text-[#77847e]">
                Working philosophy
              </p>
              <p className="mt-2 text-sm leading-7 text-[#bdc8c2]">
                I believe in practical, evidence-based security work. Learning
                through labs, documenting findings clearly, and building
                defensive skills one investigation at a time. No exaggerated
                titles—just steady, honest progress toward a SOC analyst role.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

