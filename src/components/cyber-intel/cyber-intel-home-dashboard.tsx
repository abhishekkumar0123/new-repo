"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronRight,
  Clock2,
  RefreshCw,
  ShieldAlert,
} from "lucide-react";
import {
  fetchNvdCveList,
  getCachedKevFeed,
  fetchEpssBatch,
  formatDate,
  formatEpssScore,
  formatEpssPercentile,
  highestCvssScore,
  highestCvssSeverity,
  type CveRecord,
  type EpssInfo,
  CVSS_SEVERITY_COLORS,
  CVSS_SEVERITY_LABELS,
} from "@/lib/cyber-intel";

const FETCH_COUNT = 20;
const THIRTY_DAYS_AGO = Date.now() - 30 * 24 * 60 * 60 * 1000;

interface HomeDashboardState {
  cves: CveRecord[];
  totalAvailable: number;
  kevFeed: {
    vulnerabilities: Array<{
      cveID: string;
      vulnerabilityName: string;
      vendorProject: string;
      product: string;
      dateAdded: string;
      dueDate: string | null;
      knownRansomwareCampaignUse: string;
    }>;
    vulnerabilityCount: number;
    dateReleased: string;
    catalogVersion: string;
  } | null;
  epssMap: Map<string, EpssInfo | null>;
  loading: boolean;
  refreshing: boolean;
  error: string | null;
  lastUpdated: string | null;
}

function severityColor(severity: string | null): string {
  const colors: Record<string, string> = {
    NONE: "#77847e",
    LOW: "#00ff91",
    MEDIUM: "#fbbf24",
    HIGH: "#ffca8a",
    CRITICAL: "#ff7b72",
  };
  return severity ? (colors[severity] ?? "#77847e") : "#77847e";
}

function severityLabel(severity: string | null): string {
  const labels: Record<string, string> = {
    NONE: "None",
    LOW: "Low",
    MEDIUM: "Medium",
    HIGH: "High",
    CRITICAL: "Critical",
  };
  return severity ? (labels[severity] ?? "Unknown") : "Unknown";
}

export function CyberIntelHomeDashboard() {
  const [state, setState] = useState<HomeDashboardState>({
    cves: [],
    totalAvailable: 0,
    kevFeed: null,
    epssMap: new Map(),
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  });
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setState((s) => ({ ...s, loading: true, error: null }));
    } else {
      setState((s) => ({ ...s, refreshing: true, error: null }));
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [nvdResult, kevFeed] = await Promise.all([
        fetchNvdCveList({
          resultsPerPage: FETCH_COUNT,
          startIndex: 0,
        }),
        getCachedKevFeed(),
      ]);

      if (controller.signal.aborted) return;

      const cves = nvdResult.cves;
      const cveIds = cves.map((c) => c.cveId);

      let epssMap = new Map<string, EpssInfo | null>();
      if (cveIds.length > 0) {
        epssMap = await fetchEpssBatch(cveIds, { signal: controller.signal });
      }

      if (controller.signal.aborted) return;

      if (!mountedRef.current) return;

      const now = Date.now();
      setState({
        cves,
        totalAvailable: nvdResult.totalResults,
        kevFeed: kevFeed ?? null,
        epssMap,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date(now).toISOString(),
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error:
          err instanceof Error ? err.message : "Failed to load intelligence data.",
      }));
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchData();

    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchData]);

  const {
    cves,
    totalAvailable,
    kevFeed,
    epssMap,
    loading,
    refreshing,
    error,
    lastUpdated,
  } = state;

  const cveStats = useMemo(() => {
    let critical = 0;
    let high = 0;
    let newRecently = 0;
    let kevCount = 0;
    let ransomwareCount = 0;

    const kevIds = new Set(
      kevFeed?.vulnerabilities.map((v) => v.cveID.toUpperCase()) ?? [],
    );

    for (const cve of cves) {
      const severity = highestCvssSeverity(cve);
      if (severity === "CRITICAL") critical++;
      if (severity === "HIGH") high++;

      const published = cve.publishedDate
        ? new Date(cve.publishedDate).getTime()
        : 0;
      if (published > THIRTY_DAYS_AGO) newRecently++;

      if (kevIds.has(cve.cveId.toUpperCase())) {
        kevCount++;
        const kevEntry = kevFeed?.vulnerabilities.find(
          (v) => v.cveID.toUpperCase() === cve.cveId.toUpperCase(),
        );
        if (kevEntry?.knownRansomwareCampaignUse === "Known") {
          ransomwareCount++;
        }
      }
    }

    return { critical, high, newRecently, kevCount, ransomwareCount };
  }, [cves, kevFeed]);

  const latestCves = useMemo(() => {
    return [...cves]
      .sort(
        (a, b) =>
          new Date(b.publishedDate ?? 0).getTime() -
          new Date(a.publishedDate ?? 0).getTime(),
      )
      .slice(0, 8);
  }, [cves]);

  const criticalCves = useMemo(() => {
    return cves
      .filter((c) => highestCvssSeverity(c) === "CRITICAL")
      .sort(
        (a, b) =>
          new Date(b.publishedDate ?? 0).getTime() -
          new Date(a.publishedDate ?? 0).getTime(),
      )
      .slice(0, 6);
  }, [cves]);

  const recentKev = useMemo(() => {
    if (!kevFeed) return [];
    return [...kevFeed.vulnerabilities]
      .sort(
        (a, b) =>
          new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
      )
      .slice(0, 6);
  }, [kevFeed]);

  const highEpssCves = useMemo(() => {
    const withEpss: Array<{
      cve: CveRecord;
      epss: EpssInfo;
    }> = [];
    for (const cve of cves) {
      const epss = epssMap.get(cve.cveId);
      if (epss && epss.score !== null) {
        withEpss.push({ cve, epss });
      }
    }
    return withEpss
      .sort((a, b) => (b.epss.score ?? 0) - (a.epss.score ?? 0))
      .slice(0, 6);
  }, [cves, epssMap]);

  const activityFeed = useMemo(() => {
    const feed: Array<{
      type: "published" | "modified" | "kev-added";
      cveId: string;
      date: string;
      label: string;
      href: string;
    }> = [];

    for (const cve of cves) {
      const published = cve.publishedDate ?? "";
      const modified = cve.lastModifiedDate ?? "";
      if (published) {
        feed.push({
          type: "published",
          cveId: cve.cveId,
          date: published,
          label: "New CVE published",
          href: `/vulnerabilities?cveId=${encodeURIComponent(cve.cveId)}`,
        });
      }
      if (modified && modified !== published) {
        feed.push({
          type: "modified",
          cveId: cve.cveId,
          date: modified,
          label: "CVE record modified",
          href: `/vulnerabilities?cveId=${encodeURIComponent(cve.cveId)}`,
        });
      }
    }

    if (kevFeed) {
      for (const v of kevFeed.vulnerabilities.slice(0, 6)) {
        feed.push({
          type: "kev-added",
          cveId: v.cveID,
          date: v.dateAdded,
          label: "Added to CISA KEV catalog",
          href: `/vulnerabilities?cveId=${encodeURIComponent(v.cveID)}`,
        });
      }
    }

    return feed
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 10);
  }, [cves, kevFeed]);

  const handleRefresh = useCallback(() => {
    void fetchData({ silent: false });
  }, [fetchData]);

  const statCards = [
    {
      label: "Total CVEs (dataset)",
      value: totalAvailable.toLocaleString(),
      sublabel: "Available via NVD query",
      color: "#58d7f7",
    },
    {
      label: "Critical",
      value: cveStats.critical.toString(),
      sublabel: "CVSS CRITICAL severity",
      color: "#ff7b72",
    },
    {
      label: "High",
      value: cveStats.high.toString(),
      sublabel: "CVSS HIGH severity",
      color: "#ffca8a",
    },
    {
      label: "New (30 days)",
      value: cveStats.newRecently.toString(),
      sublabel: "Published recently",
      color: "#00ff91",
    },
    {
      label: "KEV",
      value: cveStats.kevCount.toString(),
      sublabel: "CISA exploited",
      color: "#ffca8a",
    },
    {
      label: "Ransomware",
      value: cveStats.ransomwareCount.toString(),
      sublabel: "Ransomware-linked KEV",
      color: "#ff7b72",
    },
  ];

  const renderStatCard = (card: {
    label: string;
    value: string;
    sublabel: string;
    color: string;
  }) => (
    <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
      <div className="flex items-center justify-between mb-2">
        <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
          {card.label}
        </p>
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[8px] font-semibold uppercase border ${
            card.color === "#77847e"
              ? "border-white/[0.10] bg-white/[0.05] text-[#77847e]"
              : `border-${card.color}/30 bg-${card.color}/[0.1] text-${card.color}`
          }`}
        >
          {card.value}
        </span>
      </div>
      <p className="font-mono text-[9px] text-[#9ba8a1]">{card.sublabel}</p>
    </div>
  );

  const renderCveItem = (cve: CveRecord) => {
    const severity = highestCvssSeverity(cve);
    const score = highestCvssScore(cve);
    const epss = epssMap.get(cve.cveId) ?? null;
    const kevIn = cve.kev.inKev;
    const color = severityColor(severity);
    const label = severityLabel(severity);

    return (
      <article
        key={cve.cveId}
        className="p-4 border border-white/[0.06] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors group"
      >
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-2">
            <Link
              href={`/vulnerabilities?cveId=${encodeURIComponent(cve.cveId)}`}
              className="font-mono text-xs font-semibold tracking-tighter text-[#dfe7e3] hover:text-[#58d7f7] transition-colors"
            >
              {cve.cveId}
            </Link>
            {kevIn && (
              <span className="px-2 py-0.5 rounded-md border border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a] font-mono text-[8px] font-semibold uppercase">
                CISA KEV
              </span>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[8px] font-semibold uppercase border ${
              severity
                ? `border-${color}/30 bg-${color}/[0.1] text-${color}`
                : "border-white/[0.10] bg-white/[0.05] text-[#77847e]"
            }`}
          >
            {label}
          </span>
        </div>
        <p className="mb-3 text-sm leading-5 text-[#9ba8a1] truncate max-w-[42rem]">
          {cve.description ?? "No description available."}
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
              CVSS
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
              {score === null ? "N/A" : score.toString()}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
              EPSS
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
              {formatEpssScore(epss?.score ?? null)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
              Published
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
              {formatDate(cve.publishedDate)}
            </p>
          </div>
          <div>
            <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
              Percentile
            </p>
            <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
              {formatEpssPercentile(epss?.percentile ?? null)}
            </p>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section id="live-intelligence" className="px-5 py-24 lg:px-8 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // 11 — live intelligence dashboard
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              Live Cybersecurity Intelligence
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#9ba8a1]">
              Real-time vulnerability intelligence from NVD, CISA KEV, and FIRST
              EPSS — refreshed on demand, no credentials required.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh data"}
            </button>
          </div>
        </div>

        <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[#58d7f7]" size={14} />
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
                    : lastUpdated
                    ? `Last updated: ${new Date(lastUpdated).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}`
                    : "No data yet"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 font-mono text-xs text-[#9ba8a1]">
              <span>
                NVD: {totalAvailable.toLocaleString()} CVEs available
              </span>
              {kevFeed && (
                <span>
                  KEV: {kevFeed.vulnerabilityCount} exploited
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="mb-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
          {statCards.map((card, idx) => (
            <div key={idx} className="col-span-1 md:col-span-2 lg:col-span-1">
              {renderStatCard(card)}
            </div>
          ))}
        </div>

        <div className="mb-10 border border-white/[0.06] bg-black/10 rounded-md p-6">
          <div className="flex items-center justify-between mb-6">
            <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">
              Quick actions
            </p>
            <Link
              href="/vulnerabilities"
              className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
            >
              Open CVE Explorer <ChevronRight size={12} />
            </Link>
          </div>
          <div className="grid gap-3 md:grid-cols-6">
            {[
              { label: "Search CVE", href: "/vulnerabilities", icon: "search" },
              { label: "Browse All CVEs", href: "/vulnerabilities", icon: "list" },
              { label: "KEV Catalog", href: "/kev", icon: "shield" },
              {
                label: "Critical CVEs",
                href: "/vulnerabilities?severity=CRITICAL",
                icon: "alert",
              },
              {
                label: "High EPSS",
                href: "/vulnerabilities?epssRange=75-100",
                icon: "trend",
              },
              { label: "Ransomware KEV", href: "/kev?ransomware=Yes", icon: "alert" },
            ].map((action, idx) => (
              <a
                key={idx}
                href={action.href}
                className="flex items-center gap-2 border border-white/[0.06] bg-black/10 rounded-md p-3 font-mono text-xs text-[#dfe7e3] hover:bg-white/[0.05] hover:border-[#58d7f7]/30 transition-colors"
              >
                <span className="text-[#58d7f7]">{action.icon}</span>
                {action.label}
              </a>
            ))}
          </div>
        </div>

        {error && !loading && (
          <div className="mb-8 premium-card glass-panel border border-[#ff9a92]/30 p-4 rounded-md">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 text-[#ff9a92]" size={16} />
              <div>
                <p className="font-mono text-sm text-[#ff9a92]">
                  Intelligence data error
                </p>
                <p className="mt-1 font-mono text-xs text-[#9ba8a1]">
                  {error}. Some sections may show cached or no data.
                </p>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="mt-3 inline-flex items-center gap-1 font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
                >
                  Refresh <RefreshCw size={12} />
                </button>
              </div>
            </div>
          </div>
        )}

        {loading && !error && (
          <div className="mb-8 premium-card glass-panel p-6 text-center">
            <Clock2 className="mx-auto mb-3 animate-spin text-[#58d7f7]" size={24} />
            <p className="font-mono text-sm text-[#77847e]">
              Loading live intelligence data…
            </p>
            <p className="mt-2 font-mono text-[9px] text-[#77847e]/70">
              NVD rate limits requests to one every few seconds.
            </p>
          </div>
        )}

        {!loading && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                  Latest vulnerabilities
                </p>
                <h3 className="mt-2 text-xl font-semibold">Latest CVEs</h3>
              </div>
              <Link
                href="/vulnerabilities"
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
              >
                View all CVEs <ChevronRight size={12} />
              </Link>
            </div>

            {latestCves.length === 0 ? (
              <div className="premium-card glass-panel p-6 text-center">
                <p className="font-mono text-xs text-[#77847e]">
                  No recent CVE data available.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {latestCves.map((cve) => (
                  <article
                    key={cve.cveId}
                    className="p-4 border border-white/[0.05] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <Link
                        href={`/vulnerabilities?cveId=${encodeURIComponent(cve.cveId)}`}
                        className="font-mono text-xs font-semibold tracking-tighter text-[#dfe7e3] hover:text-[#58d7f7] transition-colors"
                      >
                        {cve.cveId}
                      </Link>
                      {cve.kev.inKev && (
                        <span className="px-2 py-0.5 rounded-md border border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a] font-mono text-[8px] font-semibold uppercase">
                          CISA KEV
                        </span>
                      )}
                    </div>
                    <p className="mb-2 text-sm leading-5 text-[#9ba8a1] truncate max-w-[44rem]">
                      {cve.description ?? "No description available."}
                    </p>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                          CVSS
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                          {highestCvssScore(cve) === null
                            ? "N/A"
                            : highestCvssScore(cve)!.toString()}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                          EPSS
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                          {epssMap.get(cve.cveId)?.score !== null
                            ? formatEpssScore(epssMap.get(cve.cveId)!.score)
                            : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                          Published
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                          {formatDate(cve.publishedDate)}
                        </p>
                      </div>
                      <div>
                        <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                          Severity
                        </p>
                        <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                          {severityLabel(highestCvssSeverity(cve))}
                        </p>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                  Highest severity
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  Critical Vulnerabilities
                </h3>
              </div>
              <Link
                href="/vulnerabilities?severity=CRITICAL"
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
              >
                View all critical <ChevronRight size={12} />
              </Link>
            </div>

            {criticalCves.length === 0 ? (
              <div className="premium-card glass-panel p-6 text-center">
                <p className="font-mono text-xs text-[#77847e]">
                  No critical CVEs in current dataset.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {criticalCves.map((cve) => {
                  const epss = epssMap.get(cve.cveId) ?? null;
                  const score = highestCvssScore(cve);
                  const color = severityColor("CRITICAL");
                  return (
                    <article
                      key={cve.cveId}
                      className="p-4 border border-white/[0.05] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <Link
                          href={`/vulnerabilities?cveId=${encodeURIComponent(cve.cveId)}`}
                          className="font-mono text-xs font-semibold tracking-tighter text-[#dfe7e3] hover:text-[#58d7f7] transition-colors"
                        >
                          {cve.cveId}
                        </Link>
                        <div className="flex items-center gap-1">
                          {cve.kev.inKev && (
                            <span className="px-2 py-0.5 rounded-md border border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a] font-mono text-[8px] font-semibold uppercase">
                              CISA KEV
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-${color}/30 bg-${color}/[0.1] text-${color} font-mono text-[8px] font-semibold uppercase`}
                          >
                            CRITICAL {score !== null ? `(${score})` : ""}
                          </span>
                        </div>
                      </div>
                      <p className="mb-2 text-sm leading-5 text-[#9ba8a1] truncate max-w-[44rem]">
                        {cve.description ?? "No description available."}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            Published
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                            {formatDate(cve.publishedDate)}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            EPSS
                          </p>
                            <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                              {formatEpssScore(epss?.score ?? null)}
                            </p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            Percentile
                          </p>
                            <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                              {formatEpssPercentile(epss?.percentile ?? null)}
                            </p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            CWE
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#dfe7e3] truncate">
                            {cve.cwe[0]?.id ?? "N/A"}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!loading && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                  CISA Known Exploited Vulnerabilities
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  Known Exploited Vulnerabilities
                </h3>
              </div>
              <Link
                href="/kev"
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
              >
                View KEV catalog <ChevronRight size={12} />
              </Link>
            </div>

            {!kevFeed ? (
              <div className="premium-card glass-panel p-6 text-center">
                <p className="font-mono text-xs text-[#77847e]">
                  KEV catalog data unavailable.
                </p>
              </div>
            ) : recentKev.length === 0 ? (
              <div className="premium-card glass-panel p-6 text-center">
                <p className="font-mono text-xs text-[#77847e]">
                  No KEV vulnerabilities available.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse divide-y divide-white/[0.06]">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        CVE ID
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Vendor / Product
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Date added
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-right">
                        Due date
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Ransomware
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentKev.map((v) => {
                      const overdue =
                        v.dueDate &&
                        new Date(v.dueDate).getTime() < Date.now();
                      return (
                        <tr key={v.cveID}>
                          <td className="py-3 font-mono text-xs text-[#dfe7e3]">
                            <Link
                              href={`/vulnerabilities?cveId=${encodeURIComponent(v.cveID)}`}
                              className="hover:text-[#58d7f7] transition-colors"
                            >
                              {v.cveID}
                            </Link>
                          </td>
                          <td className="py-3 font-mono text-xs text-[#9ba8a1] truncate max-w-[20rem]">
                            {v.vendorProject} / {v.product}
                          </td>
                          <td className="py-3 font-mono text-xs text-[#9ba8a1]">
                            {new Date(v.dateAdded).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="py-3 font-mono text-xs text-right">
                            {v.dueDate ? (
                              <span
                                className={`font-mono ${
                                  overdue ? "text-[#ff7b72]" : "text-[#dfe7e3]"
                                }`}
                              >
                                {new Date(v.dueDate).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })}
                                {overdue ? " (overdue)" : ""}
                              </span>
                            ) : (
                              <span className="text-[#77847e]">—</span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-xs text-left">
                            {v.knownRansomwareCampaignUse === "Known" ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#ff7b72]/30 bg-[#ff7b72]/[0.1] text-[#ff7b72] text-[8px] font-semibold uppercase">
                                Yes
                              </span>
                            ) : (
                              <span className="text-[#77847e] text-[8px]">No</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {!loading && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                  Exploitation probability
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  High EPSS Probability
                </h3>
              </div>
              <Link
                href="/vulnerabilities?epssRange=75-100"
                className="inline-flex items-center gap-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
              >
                View high EPSS <ChevronRight size={12} />
              </Link>
            </div>

            <p className="mb-4 font-mono text-[9px] text-[#77847e]">
              EPSS estimates the probability of exploitation within 30 days —
              distinct from CVSS severity. UI-defined ranges are not official
              FIRST classifications.
            </p>

            {highEpssCves.length === 0 ? (
              <div className="premium-card glass-panel p-6 text-center">
                <p className="font-mono text-xs text-[#77847e]">
                  No EPSS data available for current dataset.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {highEpssCves.map(({ cve, epss }) => {
                  const pct = ((epss.score ?? 0) * 100).toFixed(1);
                  const percentile = (epss.percentile ?? 0).toFixed(1);
                  const severity = highestCvssSeverity(cve);
                  const color = severityColor(severity);
                  const label = severityLabel(severity);
                  return (
                    <article
                      key={cve.cveId}
                      className="p-4 border border-white/[0.05] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors group"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/vulnerabilities?cveId=${encodeURIComponent(cve.cveId)}`}
                            className="font-mono text-xs font-semibold tracking-tighter text-[#dfe7e3] hover:text-[#58d7f7] transition-colors"
                          >
                            {cve.cveId}
                          </Link>
                          {cve.kev.inKev && (
                            <span className="px-2 py-0.5 rounded-md border border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a] font-mono text-[8px] font-semibold uppercase">
                              CISA KEV
                            </span>
                          )}
                        </div>
                        <span className="font-mono text-xs font-semibold text-[#00ff91]">
                          {pct}%
                        </span>
                      </div>
                      <p className="mb-3 text-sm leading-5 text-[#9ba8a1] truncate max-w-[44rem]">
                        {cve.description ?? "No description available."}
                      </p>
                      <div className="grid gap-2 sm:grid-cols-4">
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            Severity
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                            {label}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            Percentile
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                            {percentile}%
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            EPSS date
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                            {formatDate(epss.date)}
                          </p>
                        </div>
                        <div>
                          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e]">
                            CVSS
                          </p>
                          <p className="mt-0.5 font-mono text-xs text-[#dfe7e3]">
                            {highestCvssScore(cve) === null
                              ? "N/A"
                              : highestCvssScore(cve)!.toString()}
                          </p>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {!loading && (
          <section className="mb-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                  Recent activity
                </p>
                <h3 className="mt-2 text-xl font-semibold">
                  Security Activity Feed
                </h3>
              </div>
            </div>

            {activityFeed.length === 0 ? (
              <div className="premium-card glass-panel p-6 text-center">
                <p className="font-mono text-xs text-[#77847e]">
                  No recent activity data available.
                </p>
              </div>
            ) : (
              <div className="space-y-2 font-mono text-xs text-[#9ba8a1]">
                {activityFeed.map((item) => (
                  <div
                    key={`${item.cveId}-${item.type}-${item.date}`}
                    className="p-3 border border-white/[0.05] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3 mb-1">
                      <Link
                        href={item.href}
                        className="text-[#dfe7e3] hover:text-[#58d7f7] transition-colors truncate flex-1"
                      >
                        {item.cveId}
                      </Link>
                      <span className="text-[#77847e] text-[8px]">
                        {new Date(item.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <p className="text-[#dfe7e3] leading-5">
                      {item.label} · {item.type.replace("-", " ")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="mt-12 border-t border-white/[0.06] pt-8">
          <p className="font-mono text-[9px] text-[#77847e] max-w-2xl">
            CVE data: National Vulnerability Database (NVD) —
            https://services.nvd.nist.gov/rest/json/cves/2.0 · CISA KEV: Known
            Exploited Vulnerabilities Catalog · EPSS: FIRST Exploitation
            Prediction Scoring System — https://api.first.org/data/v1/epss.
            Data fetched client-side, no credentials stored. Upstream rate limits
            apply. Statistics reflect the current NVD query dataset, not global
            totals.
          </p>
        </div>
      </div>
    </section>
  );
}
