"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Mail,
  Copy,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
} from "lucide-react";
import { ContactForm } from "@/components/contact-form";

interface ContactSectionProps {
  profile?: Record<string, unknown> | null;
  links?: Record<string, unknown>[];
  settings?: Record<string, unknown> | null;
}

export function ContactSection({
  profile,
  links = [],
  settings,
}: ContactSectionProps) {
  const [copied, setCopied] = useState<string | null>(null);
  const contactEmail = String(settings?.contact_email || "");
  const resumeUrl = String(profile?.resume_url || "");
  const availability = String(profile?.availability || "");

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

  async function copyToClipboard(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  return (
    <section id="contact" className="px-5 py-24 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="glass-panel grid gap-8 p-7 sm:p-10 lg:grid-cols-2">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // 06 — secure channel
            </p>
            <h2 className="mt-4 text-4xl font-semibold">
              Let&apos;s connect
            </h2>
            <p className="mt-5 max-w-md text-[#9ba8a1]">
              Open to conversations about security operations, defensive
              analysis, and collaborative learning.
            </p>

            <div className="mt-8 space-y-5">
              {contactEmail && (
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-9 place-items-center rounded-md bg-[#00ff91]/[0.08] text-[#00ff91] shrink-0"
                  >
                    <Mail size={16} />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      Email
                    </p>
                    <div className="mt-1 flex items-center gap-2">
                      <span
                        className="font-mono text-sm text-[#bdc8c2] break-all"
                      >
                        {contactEmail}
                      </span>
                      <button
                        type="button"
                        onClick={() => void copyToClipboard(contactEmail, "Email copied")}
                        className="grid size-8 place-items-center border border-white/[0.08] text-[#77847e] hover:border-[#00ff91]/40 hover:text-[#00ff91] transition"
                        aria-label="Copy email address"
                      >
                        {copied === "Email copied" ? (
                          <CheckCircle2 size={13} className="text-[#00ff91]" />
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {availability && (
                <div className="flex items-start gap-3">
                  <div
                    className="grid size-9 place-items-center rounded-md bg-[#58d7f7]/[0.08] text-[#58d7f7] shrink-0"
                  >
                    <Clock size={16} />
                  </div>
                  <div>
                    <p className="font-mono text-[9px] uppercase text-[#77847e]">
                      Availability
                    </p>
                    <p className="mt-1 text-sm text-[#dfe7e3]">
                      {availability}
                    </p>
                  </div>
                </div>
              )}
              {resumeUrl && (
                <a
                  href={resumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 border border-white/[0.07] px-4 py-3 rounded-md transition hover:border-[#00ff91]/40 hover:bg-[#00ff91]/[0.03]"
                >
                  <Download size={15} className="text-[#00ff91]" />
                  <span className="font-mono text-sm text-[#bdc8c2]">
                    Download resume
                  </span>
                  <ExternalLink size={13} className="ml-auto text-[#00ff91]" />
                </a>
              )}
              {socialLinks.length > 0 && (
                <div>
                  <p className="font-mono text-[9px] uppercase text-[#77847e]">
                    Social links
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
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
                          className="grid size-9 place-items-center border border-white/[0.08] text-[#9ba8a1] transition hover:border-[#58d7f7]/40 hover:bg-[#58d7f7]/[0.06] hover:text-[#58d7f7]"
                        >
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div>
            <ContactForm />
          </div>
        </div>
      </div>
    </section>
  );
}
