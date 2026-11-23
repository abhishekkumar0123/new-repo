"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, Globe, Network, ShieldAlert } from "lucide-react";
import {
  checkDomainIntelStatus,
  fetchDomainIntelligence,
  getSourceLabel,
  getSourceColor,
  type DomainIntelligenceResult,
} from "@/lib/cyber-intel";

function formatDateShort(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    });
  } catch {
    return "Not available";
  }
}

export function DomainIntelHomePreview() {
  const [status, setStatus] = useState<{
    sources: Array<{
      source: string;
      available: boolean;
      rateLimited: boolean;
      requiresConfiguration: boolean;
      error: string | null;
    }>;
    overallAvailable: boolean;
  } | null>(null);
  const [recentDomain, setRecentDomain] = useState<DomainIntelligenceResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const [intelStatus, domainData] = await Promise.all([
          checkDomainIntelStatus(),
          fetchDomainIntelligence("cloudflare.com"),
        ]);
        if (!cancelled) {
          setStatus({
            sources: intelStatus.sources,
            overallAvailable: intelStatus.overallAvailable,
          });
          setRecentDomain(domainData);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Unable to load domain intelligence preview.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const availableSourceCount = status?.sources.filter((s) => s.available).length ?? 0;
  const totalSourceCount = status?.sources.length ?? 0;
  const configuredSourceCount = status?.sources.filter((s) => !s.requiresConfiguration).length ?? 0;

  return (
    <section id="domain-intelligence-preview" className="px-5 py-24 lg:px-8 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // 12 — domain intelligence center
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              Domain Intelligence & DNS Investigation
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#9ba8a1]">
              Real-time domain infrastructure analysis — DNS records, RDAP registration data,
              Certificate Transparency logs, and multi-source threat reputation.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <Link
              href="/domain-intelligence"
              className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
            >
              <Globe size={13} />
              Open Tool
            </Link>
          </div>
        </div>

        <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Globe className="text-[#58d7f7]" size={14} />
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Data status
                </p>
                <p className={`font-mono text-xs ${
                  error ? "text-[#ff9a92]" : "text-[#dfe7e3]"
                }`}>
                  {error
                    ? `Error: ${error}`
                    : loading
                    ? "Loading live data…"
                    : `${availableSourceCount}/${totalSourceCount} sources online`
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-right">
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Configured
                </p>
                <p className="font-mono text-xs text-[#dfe7e3]">
                  {configuredSourceCount}/{totalSourceCount} sources
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  DNSSEC
                </p>
                <p className="font-mono text-xs text-[#dfe7e3]">
                  {recentDomain?.security.dnssec === true ? "Enabled" : "Unknown"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {recentDomain && (
          <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md overflow-hidden">
            <div className="p-4 border-b border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Globe className="text-[#58d7f7]" size={14} />
                  <span className="font-mono text-xs font-semibold text-[#dfe7e3]">
                    Live Sample: {recentDomain.domain}
                  </span>
                </div>
                <span className="font-mono text-[9px] text-[#77847e]">
                  Updated {formatDateShort(recentDomain.fetchedAt)}
                </span>
              </div>
            </div>
            <div className="p-4 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="p-3 border border-white/[0.05] bg-black/10 rounded-md">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  IPv4 Addresses
                </p>
                <p className="mt-1 font-mono text-sm text-[#dfe7e3]">
                  {recentDomain.resolvedIps.ipv4.length} resolved
                </p>
              </div>
              <div className="p-3 border border-white/[0.05] bg-black/10 rounded-md">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Nameservers
                </p>
                <p className="mt-1 font-mono text-sm text-[#dfe7e3]">
                  {recentDomain.nameservers.length} configured
                </p>
              </div>
              <div className="p-3 border border-white/[0.05] bg-black/10 rounded-md">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Certificates
                </p>
                <p className="mt-1 font-mono text-sm text-[#dfe7e3]">
                  {recentDomain.certificates.length} in CT logs
                </p>
              </div>
              <div className="p-3 border border-white/[0.05] bg-black/10 rounded-md">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Domain Age
                </p>
                <p className="mt-1 font-mono text-sm text-[#dfe7e3]">
                  {recentDomain.timestamps.domainAge ?? "Unknown"}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="border border-white/[0.06] bg-black/10 rounded-md p-6">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center justify-between">
            <div>
              <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                Investigation capabilities
              </p>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4 font-mono text-xs text-[#9ba8a1]">
                <li className="flex items-center gap-2"><Network size={12} className="text-[#58d7f7]" /> DNS Records (A, AAAA, CNAME, MX, NS, TXT, SOA, CAA)</li>
                <li className="flex items-center gap-2"><ShieldAlert size={12} className="text-[#00ff91]" /> RDAP Registration Data</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#ffca8a]" /> Certificate Transparency</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#bb86fc]" /> Multi-source Reputation</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#ff9a92]" /> Hosting & ASN Intel</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#58d7f7]" /> Security Headers</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#00ff91]" /> DNSSEC Status</li>
                <li className="flex items-center gap-2"><ChevronRight size={12} className="text-[#77847e]" /> JSON Export</li>
              </ul>
            </div>
            <Link
              href="/domain-intelligence"
              className="inline-flex items-center gap-2 border border-white/[0.08] px-4 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] shrink-0"
            >
              Launch Domain Intelligence <ChevronRight size={13} />
            </Link>
          </div>
        </div>

        {status?.sources.some((s) => s.requiresConfiguration) && (
          <div className="mt-4 p-3 border border-[#ffca8a]/20 bg-[#ffca8a]/[0.05] rounded-md">
            <p className="font-mono text-[9px] text-[#ffca8a]">
              Some threat intelligence sources require API keys (VirusTotal, AlienVault OTX, URLhaus/ThreatFox via abuse.ch).
              Configure keys in Supabase Edge Function secrets for full capability.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}