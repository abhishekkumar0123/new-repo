"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronRight, ShieldAlert } from "lucide-react";
import {
  checkThreatIntelStatus,
  fetchAllThreatIntel,
  getIOCTypeColor,
  getIOCTypeLabel,
  getSourceLabel,
  getClassificationLabel,
  type IOCRecord,
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

export function ThreatIntelHomePreview() {
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
  const [recentIOCs, setRecentIOCs] = useState<IOCRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        setLoading(true);
        const [intelStatus, iocs] = await Promise.all([
          checkThreatIntelStatus(),
          fetchAllThreatIntel({}),
        ]);
        if (!cancelled) {
          setStatus({
            sources: intelStatus.sources,
            overallAvailable: intelStatus.overallAvailable,
          });
          setRecentIOCs(iocs.slice(0, 5));
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Unable to load threat intelligence.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totalIOCs = recentIOCs.length;
  const byType: Record<string, number> = {};
  for (const ioc of recentIOCs) {
    byType[ioc.type] = (byType[ioc.type] || 0) + 1;
  }
  const availableSourceCount = status?.sources.filter((s) => s.available).length ?? 0;
  const totalSourceCount = status?.sources.length ?? 0;

  return (
    <section id="threat-intelligence" className="px-5 py-24 lg:px-8 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // 12 — threat intelligence preview
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              Threat Intelligence Center
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#9ba8a1]">
              Real indicators of compromise from URLhaus and ThreatFox —
              malicious IPs, domains, URLs, and file hashes for security
              investigation.
            </p>
          </div>
          <Link
            href="/threat-intelligence"
            className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
          >
            <RefreshCwIcon /> Open center
          </Link>
        </div>

        <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[#58d7f7]" size={14} />
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Feed status
                </p>
                <p className={`font-mono text-xs ${
                  error || !status?.overallAvailable
                    ? "text-[#ff9a92]"
                    : "text-[#dfe7e3]"
                }`}>
                  {error
                    ? `Error: ${error}`
                    : loading
                    ? "Loading feed status…"
                    : `${availableSourceCount} of ${totalSourceCount} sources available`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs text-[#9ba8a1]">
              <span>{totalIOCs} IOCs loaded</span>
              {status?.sources.some((s) => s.requiresConfiguration) && (
                <span className="text-[#ffca8a]">· setup required</span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Total IOCs
                </p>
                <span className="font-mono text-xs font-semibold text-[#dfe7e3]">
                  {totalIOCs.toLocaleString()}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#9ba8a1]">
                Indicators in preview dataset
              </p>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Malicious IPs
                </p>
                <span className={`font-mono text-xs font-semibold ${getIOCTypeColor("ip")}`}>
                  {(byType.ip || 0).toLocaleString()}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#9ba8a1]">
                IP address indicators
              </p>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Malicious URLs
                </p>
                <span className={`font-mono text-xs font-semibold ${getIOCTypeColor("url")}`}>
                  {(byType.url || 0).toLocaleString()}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#9ba8a1]">
                Malware / phishing URLs
              </p>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  File Hashes
                </p>
                <span className={`font-mono text-xs font-semibold ${getIOCTypeColor("hash")}`}>
                  {(byType.hash || 0).toLocaleString()}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#9ba8a1]">
                MD5 / SHA-1 / SHA-256
              </p>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Active Sources
                </p>
                <span className={`font-mono text-xs font-semibold ${
                  availableSourceCount === totalSourceCount ? "text-[#00ff91]" : "text-[#ffca8a]"
                }`}>
                  {availableSourceCount} / {totalSourceCount}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#9ba8a1]">
                Configured feeds
              </p>
            </div>
          </div>
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
              <div className="flex items-center justify-between mb-2">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Feed Status
                </p>
                <span className={`font-mono text-xs font-semibold ${
                  status?.overallAvailable ? "text-[#00ff91]" : "text-[#ffca8a]"
                }`}>
                  {status?.overallAvailable ? "Online" : "Configure sources"}
                </span>
              </div>
              <p className="font-mono text-[9px] text-[#9ba8a1]">
                URLhaus + ThreatFox
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {recentIOCs.length === 0 && !loading && !error ? (
            <div className="premium-card glass-panel p-6 text-center">
              <p className="font-mono text-xs text-[#77847e]">
                No IOC data available. Configure threat feed sources to view
                live indicators.
              </p>
            </div>
          ) : (
            recentIOCs.map((ioc) => (
              <article
                key={ioc.id}
                className="p-4 border border-white/[0.05] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors group"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <Link
                    href={`/threat-intelligence?ioc=${encodeURIComponent(ioc.value)}`}
                    className="font-mono text-xs font-semibold tracking-tighter text-[#dfe7e3] hover:text-[#58d7f7] transition-colors truncate block max-w-[40rem]"
                  >
                    {ioc.value}
                  </Link>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${getIOCTypeColor(ioc.type)}/30 bg-${getIOCTypeColor(ioc.type)}/[0.05] text-${getIOCTypeColor(ioc.type)} text-[8px] font-semibold uppercase`}
                  >
                    {getIOCTypeLabel(ioc.type)}
                  </span>
                </div>
                <p className="mb-2 text-xs text-[#9ba8a1] leading-5 truncate max-w-[44rem]">
                  {getClassificationLabel(ioc.classification)} ·{" "}
                  {getSourceLabel(ioc.source)} · {formatDateShort(ioc.firstSeen)}
                </p>
              </article>
            ))
          )}
        </div>

        <div className="mt-8 border-t border-white/[0.06] pt-6 flex items-center justify-between">
          <Link
            href="/threat-intelligence"
            className="inline-flex items-center gap-2 font-mono text-[9px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
          >
            Open full Threat Intelligence Center <ChevronRight size={12} />
          </Link>
          <p className="font-mono text-[9px] text-[#77847e]">
            Data: URLhaus + ThreatFox · Client-side, no credentials stored
          </p>
        </div>
      </div>
    </section>
  );
}

function RefreshCwIcon() {
  return (
    <svg
      className="size-4 animate-spin"
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M1 4v6h6" />
      <path d="M23 20v-6h-6" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15" />
    </svg>
  );
}
