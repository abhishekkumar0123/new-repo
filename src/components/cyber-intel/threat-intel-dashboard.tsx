"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock2,
  Filter,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
  ExternalLink,
} from "lucide-react";
import {
  fetchAllThreatIntel,
  checkThreatIntelStatus,
  normalizeIOCs,
  filterIOCs,
  sortIOCs,
  paginateIOCs,
  buildIOCListResult,
  buildThreatActivity,
  getIOCTypeLabel,
  getIOCTypeColor,
  getClassificationColor,
  getClassificationLabel,
  getSourceLabel,
} from "@/lib/cyber-intel/api/threat-intel";
import type { IOCRecord, IOCSearchParams, ThreatIntelStatus, ThreatIntelSourceStatus } from "@/lib/cyber-intel/types/ioc";

const DEFAULT_FILTERS: IOCSearchParams = {
  query: "",
  type: "All",
  classification: "All",
  source: "All",
  malwareFamily: "All",
  tag: "All",
  confidence: "All",
  sortBy: "firstSeen",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

const IOC_TYPE_LABELS: Record<string, string> = {
  ip: "IP Address",
  domain: "Domain",
  url: "URL",
  hash: "File Hash",
  email: "Email",
};

const SOURCE_LABELS: Record<string, string> = {
  urlhaus: "URLhaus",
  threatfox: "ThreatFox",
};

function formatDateShort(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Not available";
  }
}

function formatDateTime(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Not available";
  }
}

function truncateMiddle(value: string, length: number = 40): string {
  if (value.length <= length) return value;
  const half = Math.floor(length / 2) - 2;
  return `${value.slice(0, half)}…${value.slice(-half)}`;
}

export function ThreatIntelDashboard() {
  const router = useRouter();
  const mountedRef = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const [state, setState] = useState<{
    iocs: IOCRecord[];
    totalResults: number;
    status: ThreatIntelStatus | null;
    loading: boolean;
    refreshing: boolean;
    error: string | null;
    lastUpdated: string | null;
  }>({
    iocs: [],
    totalResults: 0,
    status: null,
    loading: true,
    refreshing: false,
    error: null,
    lastUpdated: null,
  });

  const [filters, setFilters] = useState<IOCSearchParams>(DEFAULT_FILTERS);

  const [selectedIOC, setSelectedIOC] = useState<IOCRecord | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const fetchData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) {
      setState((s) => ({ ...s, loading: true, error: null }));
    } else {
      setState((s) => ({ ...s, refreshing: true, error: null }));
    }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const [iocs, status] = await Promise.all([
        fetchAllThreatIntel({}),
        checkThreatIntelStatus(),
      ]);

      if (controller.signal.aborted) return;
      if (!mountedRef.current) return;

      const normalized = normalizeIOCs(iocs);

      setState({
        iocs: normalized,
        totalResults: normalized.length,
        status,
        loading: false,
        refreshing: false,
        error: null,
        lastUpdated: new Date().toISOString(),
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      if (!mountedRef.current) return;
      setState((s) => ({
        ...s,
        loading: false,
        refreshing: false,
        error:
          err instanceof Error ? err.message : "Failed to load threat intelligence.",
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
    iocs: allIOCs,
    totalResults,
    status,
    loading,
    refreshing,
    error,
    lastUpdated,
  } = state;

  const filteredIOCs = useMemo(() => filterIOCs(allIOCs, filters), [allIOCs, filters]);
  const sortedIOCs = useMemo(() => sortIOCs(filteredIOCs, filters.sortBy, filters.sortOrder), [filteredIOCs, filters]);
  const { items: pageIOCs, totalPages, currentPage } = paginateIOCs(
    sortedIOCs,
    filters.page,
    filters.pageSize,
  );

  const activeFiltersCount =
    (filters.query ? 1 : 0) +
    (filters.type !== "All" ? 1 : 0) +
    (filters.classification !== "All" ? 1 : 0) +
    (filters.source !== "All" ? 1 : 0) +
    (filters.malwareFamily !== "All" ? 1 : 0) +
    (filters.tag !== "All" ? 1 : 0) +
    (filters.confidence !== "All" ? 1 : 0);

  const stats = useMemo(() => {
    const byType: Record<string, number> = {};
    const bySource: Record<string, number> = {};
    const byClassification: Record<string, number> = {};

    for (const ioc of allIOCs) {
      byType[ioc.type] = (byType[ioc.type] || 0) + 1;
      bySource[ioc.source] = (bySource[ioc.source] || 0) + 1;
      byClassification[ioc.classification] = (byClassification[ioc.classification] || 0) + 1;
    }

    return { byType, bySource, byClassification };
  }, [allIOCs]);

  const activityFeed = useMemo(() => buildThreatActivity(allIOCs), [allIOCs]);

  const pushUrl = useCallback(
    (next: Partial<IOCSearchParams>) => {
      const updated = { ...filters, ...next, page: 1 };
      const urlParams = new URLSearchParams();
      if (updated.query) urlParams.set("q", updated.query);
      if (updated.type !== "All") urlParams.set("type", updated.type);
      if (updated.classification !== "All") urlParams.set("classification", updated.classification);
      if (updated.source !== "All") urlParams.set("source", updated.source);
      if (updated.malwareFamily !== "All") urlParams.set("malwareFamily", updated.malwareFamily);
      if (updated.tag !== "All") urlParams.set("tag", updated.tag);
      if (updated.confidence !== "All") urlParams.set("confidence", String(updated.confidence));
      urlParams.set("sortBy", updated.sortBy);
      urlParams.set("sortOrder", updated.sortOrder);
      if (updated.page !== 1) urlParams.set("page", String(updated.page));
      if (updated.pageSize !== DEFAULT_FILTERS.pageSize) {
        urlParams.set("limit", String(updated.pageSize));
      }
      void router.push(`${window.location.pathname}?${urlParams.toString()}`);
    },
    [filters, router],
  );

  const setFilter = useCallback(
    (next: Partial<IOCSearchParams>) => {
      const updated = { ...filters, ...next, page: 1 };
      setFilters(updated);
      pushUrl(updated);
    },
    [filters, pushUrl],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const updated = { ...filters, page: nextPage };
      setFilters(updated);
      pushUrl(updated);
    },
    [filters, pushUrl],
  );

  const handleRefresh = useCallback(() => {
    void fetchData({ silent: false });
  }, [fetchData]);

  const openIOCDetail = useCallback((ioc: IOCRecord) => {
    setSelectedIOC(ioc);
    setDetailOpen(true);
  }, []);

  const closeDetail = useCallback(() => {
    setDetailOpen(false);
    setSelectedIOC(null);
  }, []);

  const totalIPs = stats.byType.ip || 0;
  const totalDomains = stats.byType.domain || 0;
  const totalURLs = stats.byType.url || 0;
  const totalHashes = stats.byType.hash || 0;
  const totalEmails = stats.byType.email || 0;

  const urlhausIOCs = stats.bySource.urlhaus || 0;
  const threatfoxIOCs = stats.bySource.threatfox || 0;

  const availableSources = status?.sources.filter((s: { available: boolean }) => s.available).length ?? 0;
  const totalSources = status?.sources.length ?? 0;
  const configuredSources = status?.sources.filter((s: { requiresConfiguration: boolean }) => !s.requiresConfiguration).length ?? 0;

  if (error && !allIOCs.length) {
    return (
      <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
                // threat intelligence center
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Threat Intelligence Center
              </h1>
            </div>
          </div>
          <div className="premium-card glass-panel border border-[#ff9a92]/30 px-6 py-20 text-center">
            <ShieldAlert className="mx-auto mb-3 text-[#ff9a92]" size={24} />
            <h2 className="mb-2 text-lg font-semibold">Intelligence Load Error</h2>
            <p className="mb-4 text-sm text-[#ff9a92]">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:border-[#58d7f7] transition-colors"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (loading && !allIOCs.length) {
    return (
      <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
                // threat intelligence center
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Threat Intelligence Center
              </h1>
            </div>
          </div>
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <Clock2 className="mx-auto mb-3 animate-spin text-[#58d7f7]" size={24} />
            <h2 className="mb-2 text-lg font-semibold">Loading Threat Intelligence</h2>
            <p className="font-mono text-xs text-[#77847e]">
              Fetching IOCs from URLhaus and ThreatFox…
            </p>
          </div>
        </div>
      </main>
    );
  }

  return (
    <>
      <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
            >
              <ArrowLeft size={14} /> Back to Home
            </Link>
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
                // threat intelligence center
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Threat Intelligence Center
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9ba8a1]">
                Real indicators of compromise from URLhaus and ThreatFox.
                Search, filter, and investigate malicious IPs, domains, URLs,
                and file hashes.
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

          {/* Source status bar */}
          <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md p-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <ShieldAlert className="text-[#58d7f7]" size={14} />
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Data source status
                  </p>
                  <p className={`font-mono text-xs ${
                    error ? "text-[#ff9a92]" : "text-[#dfe7e3]"
                  }`}>
                    {error
                      ? `Error: ${error}`
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
              <div className="flex items-center gap-2 font-mono text-xs text-[#9ba8a1]">
                <span>
                  {availableSources} of {totalSources} sources available
                </span>
                {configuredSources < totalSources && (
                  <span className="text-[#ffca8a]">
                    · {totalSources - configuredSources} requires configuration
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Statistics */}
          <div className="mb-10 grid gap-4 md:grid-cols-3 lg:grid-cols-6">
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Total IOCs
                  </p>
                  <span className="font-mono text-xs font-semibold text-[#dfe7e3]">
                    {totalResults.toLocaleString()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#9ba8a1]">
                  Indicators in current dataset
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
                    {totalIPs.toLocaleString()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#9ba8a1]">
                  IPv4 / IPv6 indicators
                </p>
              </div>
            </div>
            <div className="col-span-1 md:col-span-2 lg:col-span-1">
              <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Malicious Domains
                  </p>
                  <span className={`font-mono text-xs font-semibold ${getIOCTypeColor("domain")}`}>
                    {totalDomains.toLocaleString()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#9ba8a1]">
                  Malicious / suspicious domains
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
                    {totalURLs.toLocaleString()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#9ba8a1]">
                  Phishing / malware URLs
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
                    {totalHashes.toLocaleString()}
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
                    availableSources === totalSources ? "text-[#00ff91]" : "text-[#ffca8a]"
                  }`}>
                    {availableSources} / {totalSources}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#9ba8a1]">
                  Configured threat feeds
                </p>
              </div>
            </div>
          </div>

          {/* Source status detail */}
          <div className="mb-10 border border-white/[0.06] bg-black/10 rounded-md p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">
                  Threat feed sources
                </p>
                <h3 className="mt-2 text-xl font-semibold">Source Availability</h3>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {status?.sources.map((source: ThreatIntelSourceStatus) => {
                const available = source.available;
                const rateLimited = source.rateLimited;
                const requiresConfig = source.requiresConfiguration;
                return (
                  <div
                    key={source.source}
                    className={`p-4 border rounded-md ${
                      available
                        ? "border-[#00ff91]/25 bg-[#00ff91]/[0.03]"
                        : rateLimited
                        ? "border-[#ffca8a]/25 bg-[#ffca8a]/[0.03]"
                        : requiresConfig
                        ? "border-white/[0.08] bg-black/10"
                        : "border-white/[0.08] bg-black/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-semibold text-[#dfe7e3]">
                          {getSourceLabel(source.source)}
                        </span>
                        <span
                          className={`font-mono text-[9px] px-2 py-0.5 rounded-md ${
                            available
                              ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]"
                              : rateLimited
                              ? "border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a]"
                              : requiresConfig
                              ? "border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a]"
                              : "border-white/[0.10] bg-white/[0.05] text-[#77847e]"
                          }`}
                        >
                          {available ? "Online" : rateLimited ? "Rate limited" : requiresConfig ? "Requires configuration" : "Offline"}
                        </span>
                      </div>
                    </div>
                    <p className="font-mono text-[9px] text-[#9ba8a1] mb-2">
                      {source.type}
                    </p>
                    {source.error && (
                      <p className="font-mono text-[9px] text-[#ff9a92] mb-2">
                        {source.error}
                      </p>
                    )}
                    {source.configNote && (
                      <p className="font-mono text-[9px] text-[#ffca8a] mb-3">
                        {source.configNote}
                      </p>
                    )}
                    <p className="font-mono text-[8px] text-[#77847e]">
                      Last checked:{source.lastFetched
                        ? formatDateShort(source.lastFetched)
                        : "Never"}
                    </p>
                  </div>
                );
              })}
            </div>
            {status?.sources.some((s: { requiresConfiguration: boolean }) => s.requiresConfiguration) && (
              <div className="mt-4 p-3 border border-[#ffca8a]/20 bg-[#ffca8a]/[0.05] rounded-md">
                <p className="font-mono text-[9px] text-[#ffca8a]">
                  Some threat feeds require an abuse.ch Auth-Key. Get a free key
                  at <a
                    href="https://auth.abuse.ch/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#58d7f7] hover:text-[#00ff91] underline"
                  >
                    auth.abuse.ch
                  </a>
                  , then configure it through a secure proxy (e.g. Supabase Edge
                  Function). Client-side keys are not supported for static
                  deployment.
                </p>
              </div>
            )}
          </div>

          {/* IOC Center */}
          {!loading && (
            <section className="mb-10">
              <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-center justify-between mb-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                    IOC Center
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Indicators of Compromise
                  </h2>
                  <p className="mt-1 text-sm text-[#9ba8a1]">
                    {pageIOCs.length} of {filteredIOCs.length} indicators
                    displayed
                  </p>
                </div>
                <div className="flex items-end gap-3 w-full lg:w-auto">
                  <button
                    type="button"
                    onClick={() => setFilter({ query: "" })}
                    disabled={activeFiltersCount === 0}
                    className="flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[9px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50"
                  >
                    <X size={13} /> Clear filters
                  </button>
                  <Link
                    href="/vulnerabilities"
                    className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[9px] uppercase text-[#58d7f7] transition hover:border-[#58d7f7]/30 hover:text-[#00ff91]"
                  >
                    <ExternalLink size={13} /> CVE Explorer
                  </Link>
                </div>
              </div>

              {/* Search & filters */}
              <div className="mb-6 border border-white/[0.06] bg-black/10 rounded-md p-5">
                <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-start">
                  <div className="flex-1 relative">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77847e]"
                      size={16}
                    />
                    <input
                      value={filters.query}
                      onChange={(event) =>
                        setFilter({ query: event.target.value })
                      }
                      placeholder="Search IOC value, malware family, tag, or source"
                      className="h-11 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-10 pr-10 font-mono text-xs outline-none placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
                    />
                  </div>

                  <select
                    value={filters.type}
                    onChange={(event) =>
                      setFilter({ type: event.target.value as IOCSearchParams["type"] })
                    }
                    className="h-11 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
                    aria-label="Filter by IOC type"
                  >
                    <option value="All">All types</option>
                    <option value="ip">IP Address</option>
                    <option value="domain">Domain</option>
                    <option value="url">URL</option>
                    <option value="hash">File Hash</option>
                    <option value="email">Email</option>
                  </select>

                  <select
                    value={filters.source}
                    onChange={(event) =>
                      setFilter({ source: event.target.value as IOCSearchParams["source"] })
                    }
                    className="h-11 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
                    aria-label="Filter by source"
                  >
                    <option value="All">All sources</option>
                    <option value="urlhaus">URLhaus</option>
                    <option value="threatfox">ThreatFox</option>
                  </select>

                  <select
                    value={filters.classification}
                    onChange={(event) =>
                      setFilter({
                        classification: event.target.value as IOCSearchParams["classification"],
                      })
                    }
                    className="h-11 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
                    aria-label="Filter by classification"
                  >
                    <option value="All">All classifications</option>
                    <option value="malware_distribution">Malware Distribution</option>
                    <option value="phishing">Phishing</option>
                    <option value="botnet_cc">Botnet C2</option>
                    <option value="ransomware">Ransomware</option>
                    <option value="trojan">Trojan</option>
                    <option value="spyware">Spyware</option>
                    <option value="unknown">Unknown</option>
                  </select>

                  <button
                    type="button"
                    onClick={() => setFilter(DEFAULT_FILTERS)}
                    className="h-11 border border-white/[0.08] bg-[#0d161d] px-4 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
                    disabled={activeFiltersCount === 0}
                  >
                    <Filter size={14} className="mr-2" />
                    Reset
                  </button>
                </div>

                {activeFiltersCount > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2 font-mono text-[9px] uppercase text-[#77847e]">
                    <span>Active filters:</span>
                    {filters.query && (
                      <span className="border border-[#58d7f7]/30 px-2 py-0.5 rounded text-[#58d7f7]">
                        Search: &quot;{filters.query}&quot;
                        <button
                          type="button"
                          onClick={() => setFilter({ query: "" })}
                          className="ml-1 text-[#ff9a92] hover:text-[#ff7b72]"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.type !== "All" && (
                      <span className="border border-[#58d7f7]/30 px-2 py-0.5 rounded text-[#58d7f7]">
                        Type: {filters.type}
                        <button
                          type="button"
                          onClick={() => setFilter({ type: "All" })}
                          className="ml-1 text-[#ff9a92] hover:text-[#ff7b72]"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.source !== "All" && (
                      <span className="border border-[#58d7f7]/30 px-2 py-0.5 rounded text-[#58d7f7]">
                        Source: {filters.source}
                        <button
                          type="button"
                          onClick={() => setFilter({ source: "All" })}
                          className="ml-1 text-[#ff9a92] hover:text-[#ff7b72]"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    {filters.classification !== "All" && (
                      <span className="border border-[#58d7f7]/30 px-2 py-0.5 rounded text-[#58d7f7]">
                        Classification: {filters.classification}
                        <button
                          type="button"
                          onClick={() => setFilter({ classification: "All" })}
                          className="ml-1 text-[#ff9a92] hover:text-[#ff7b72]"
                        >
                          ×
                        </button>
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setFilter(DEFAULT_FILTERS)}
                      className="text-[#58d7f7] underline underline-offset-2 hover:text-[#00ff91]"
                    >
                      Clear all
                    </button>
                  </div>
                )}
              </div>

              {/* IOC table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Indicator
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Type
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Classification
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Malware Family
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        Source
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-left">
                        First Seen
                      </th>
                      <th className="pb-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-right">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.06]">
                    {pageIOCs.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-6 text-center">
                          {filteredIOCs.length === 0 ? (
                            <p className="font-mono text-xs text-[#77847e]">
                              No indicators match the current filters.
                            </p>
                          ) : (
                            <p className="font-mono text-xs text-[#77847e]">
                              No indicators on this page.
                            </p>
                          )}
                        </td>
                      </tr>
                    ) : (
                      pageIOCs.map((ioc) => (
                        <tr key={ioc.id}>
                          <td className="py-4 font-mono text-xs text-[#dfe7e3] truncate max-w-[34rem] group-hover:underline cursor-pointer" onClick={() => openIOCDetail(ioc)}>
                            {truncateMiddle(ioc.value, 60)}
                            {ioc.tags.length > 0 && (
                              <span className="ml-2 font-mono text-[8px] text-[#77847e]">
                                [{ioc.tags.slice(0, 2).join(", ")}]
                              </span>
                            )}
                          </td>
                          <td className="py-4 font-mono text-xs text-[#9ba8a1]">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${getIOCTypeColor(ioc.type)}/30 bg-${getIOCTypeColor(ioc.type)}/[0.05] text-${getIOCTypeColor(ioc.type)}`}
                            >
                              {IOC_TYPE_LABELS[ioc.type]}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-xs text-[#9ba8a1]">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${getClassificationColor(ioc.classification)}/30 bg-${getClassificationColor(ioc.classification)}/[0.05] text-${getClassificationColor(ioc.classification)}`}
                            >
                              {getClassificationLabel(ioc.classification)}
                            </span>
                          </td>
                          <td className="py-4 font-mono text-xs text-[#9ba8a1] truncate max-w-[20rem]">
                            {ioc.malwareFamily || ioc.malwareAlias || "—"}
                          </td>
                          <td className="py-4 font-mono text-xs text-[#9ba8a1]">
                            {getSourceLabel(ioc.source)}
                          </td>
                          <td className="py-4 font-mono text-xs text-[#9ba8a1]">
                            {formatDateShort(ioc.firstSeen)}
                          </td>
                          <td className="py-4 font-mono text-xs text-right">
                            <button
                              type="button"
                              onClick={(event) => {
                                event.stopPropagation();
                                openIOCDetail(ioc);
                              }}
                              className="flex items-center gap-1 text-[#58d7f7] hover:text-[#00ff91] transition-colors"
                            >
                              Inspect <ChevronRight size={12} />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="mt-6 flex items-center justify-between gap-4 font-mono text-[9px] uppercase text-[#77847e]">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-md ${
                      currentPage <= 1
                        ? "border-white/[0.08] text-[#77847e] opacity-50 cursor-not-allowed"
                        : "border-white/[0.2] text-[#dfe7e3] hover:text-[#58d7f7] hover:border-[#58d7f7]/30"
                    }`}
                  >
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    type="button"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className={`flex items-center gap-2 px-3 py-1.5 border rounded-md ${
                      currentPage >= totalPages
                        ? "border-white/[0.08] text-[#77847e] opacity-50 cursor-not-allowed"
                        : "border-white/[0.2] text-[#dfe7e3] hover:text-[#58d7f7] hover:border-[#58d7f7]/30"
                    }`}
                  >
                    Next <ChevronRight size={13} />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className="mr-1">Show</span>
                  <select
                    value={filters.pageSize}
                    onChange={(event) => {
                      const updated = {
                        ...filters,
                        pageSize: Number(event.target.value),
                        page: 1,
                      };
                      setFilters(updated);
                      pushUrl(updated);
                    }}
                    className="border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none"
                  >
                    {PAGE_SIZE_OPTIONS.map((size) => (
                      <option key={size} value={String(size)}>
                        {size}
                      </option>
                    ))}
                  </select>
                  <span>per page</span>
                </div>
              </div>

              {pageIOCs.length > 0 && (
                <div className="mt-4 p-3 border border-white/[0.05] bg-black/5 rounded-md">
                  <p className="font-mono text-[8px] uppercase text-[#77847e] mb-1">
                    Statistics reflect indicators from the current URLhaus and
                    ThreatFox datasets only, not global threat totals.
                  </p>
                </div>
              )}
            </section>
          )}

          {/* Threat Activity Feed */}
          {!loading && (
            <section className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                    Recent Activity
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Threat Feed Activity
                  </h2>
                </div>
              </div>

              {activityFeed.length === 0 ? (
                <div className="premium-card glass-panel p-6 text-center">
                  <p className="font-mono text-xs text-[#77847e]">
                    No recent threat activity data available.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {activityFeed.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-white/[0.05] bg-black/10 rounded-md hover:border-[#58d7f7]/30 transition-colors group cursor-pointer"
                      onClick={() => {
                        const ioc = allIOCs.find((i) => i.id === item.id);
                        if (ioc) openIOCDetail(ioc);
                      }}
                    >
                      <div className="flex items-start justify-between gap-3 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-semibold text-[#dfe7e3]">
                            {item.indicator}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${getIOCTypeColor(item.indicatorType)}/30 bg-${getIOCTypeColor(item.indicatorType)}/[0.05] text-${getIOCTypeColor(item.indicatorType)} text-[8px] font-semibold uppercase`}
                          >
                            {IOC_TYPE_LABELS[item.indicatorType]}
                          </span>
                        </div>
                        <span className="font-mono text-[8px] text-[#77847e]">
                          {formatDateShort(item.date)}
                        </span>
                      </div>
                      <p className="mb-2 text-xs text-[#9ba8a1] leading-5">
                        {getClassificationLabel(item.classification)} ·{" "}
                        {getSourceLabel(item.source)}
                      </p>
                      <div className="flex items-center gap-2 font-mono text-[8px] text-[#77847e]">
                        {item.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="border border-white/[0.07] px-1.5 py-0 rounded text-[#58d7f7]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      </main>

      {/* IOC Detail Modal */}
      {detailOpen && selectedIOC && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center"
          onClick={closeDetail}
        >
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55]"
            onClick={(e) => e.stopPropagation()}
          />
          <div
            className="relative w-full max-w-2xl mx-auto p-5 lg:p-8"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="premium-card glass-panel border border-white/[0.08] p-6 lg:p-8 rounded-md shadow-2xl">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#58d7f7]">
                    IOC Investigation
                  </p>
                  <h2 className="mt-1 text-lg font-semibold">
                    {selectedIOC.value}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={closeDetail}
                  className="rounded-md p-2 text-[#77847e] hover:text-white hover:bg-white/[0.05] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Indicator Type
                  </p>
                  <p className={`font-mono text-xs text-${getIOCTypeColor(selectedIOC.type)}`}>
                    {IOC_TYPE_LABELS[selectedIOC.type]}
                  </p>
                </div>
                <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Classification
                  </p>
                  <p className={`font-mono text-xs text-${getClassificationColor(selectedIOC.classification)}`}>
                    {getClassificationLabel(selectedIOC.classification)}
                  </p>
                </div>
                <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Confidence
                  </p>
                  <p className="font-mono text-xs text-[#9ba8a1]">
                    {selectedIOC.confidence ?? "Not provided"}
                  </p>
                </div>
                <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Source
                  </p>
                  <p className="font-mono text-xs text-[#dfe7e3]">
                    {getSourceLabel(selectedIOC.source)}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-2 p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Malware Family
                  </p>
                  <p className="font-mono text-xs text-[#9ba8a1]">
                    {selectedIOC.malwareFamily || selectedIOC.malwareAlias || "Not available"}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-2 p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    First Seen
                  </p>
                  <p className="font-mono text-xs text-[#9ba8a1]">
                    {formatDateTime(selectedIOC.firstSeen)}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-2 p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Last Seen
                  </p>
                  <p className="font-mono text-xs text-[#9ba8a1]">
                    {formatDateTime(selectedIOC.lastSeen)}
                  </p>
                </div>
                <div className="md:col-span-2 lg:col-span-2 p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Tags
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedIOC.tags.map((tag) => (
                      <span key={tag} className="border border-white/[0.07] px-1.5 py-0 rounded text-xs text-[#58d7f7]">
                        {tag}
                      </span>
                    ))}
                    {selectedIOC.tags.length === 0 && (
                      <span className="font-mono text-[9px] text-[#77847e]">None</span>
                    )}
                  </div>
                </div>
                <div className="col-span-full p-4 border border-white/[0.06] bg-black/10 rounded-md">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">
                    Reference
                  </p>
                  {selectedIOC.referenceUrl ? (
                    <Link
                      href={selectedIOC.referenceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 font-mono text-xs text-[#58d7f7] hover:text-[#00ff91] transition-colors"
                    >
                      Open source reference <ExternalLink size={13} />
                    </Link>
                  ) : (
                    <p className="font-mono text-xs text-[#77847e]">No reference URL available.</p>
                  )}
                </div>
              </div>

              <div className="mt-6 border-t border-white/[0.06] pt-4 flex items-center justify-between">
                <Link
                  href={`/vulnerabilities?cveId=${encodeURIComponent(selectedIOC.value)}`}
                  className="inline-flex items-center gap-2 font-mono text-[9px] uppercase text-[#58d7f7] hover:text-[#00ff91] transition-colors"
                >
                  Search related CVEs <ChevronRight size={12} />
                </Link>
                <span className="font-mono text-[8px] text-[#77847e]">
                  IOC ID: {selectedIOC.id}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
