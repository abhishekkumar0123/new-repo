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
} from "lucide-react";
import {
  getCachedKevFeed,
  checkCisaKevAvailability,
  type KevInfo,
} from "@/lib/cyber-intel";

interface KevVulnerability {
  cveID: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string | null;
  knownRansomwareCampaignUse: string;
  requiredAction: string;
  vendorProject: string;
  product: string;
  shortDescription: string;
  cwes: string[];
}

interface KevFilters {
  query: string;
  ransomware: "All" | "Yes" | "No";
  sortBy: "dateAdded" | "cveId";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

const DEFAULT_FILTERS: KevFilters = {
  query: "",
  ransomware: "All",
  sortBy: "dateAdded",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

const PAGE_SIZE_OPTIONS = [25, 50, 100];

function parseKevFilters(params: URLSearchParams): KevFilters {
  return {
    ...DEFAULT_FILTERS,
    query: params.get("q") ?? "",
    ransomware: (params.get("ransomware") as KevFilters["ransomware"]) || "All",
    sortBy: (params.get("sort") as KevFilters["sortBy"]) || "dateAdded",
    sortOrder: (params.get("order") as KevFilters["sortOrder"]) || "desc",
    page: Math.max(1, Number(params.get("page")) || 1),
    pageSize: [25, 50, 100].includes(Number(params.get("limit")))
      ? Number(params.get("limit")!)
      : DEFAULT_FILTERS.pageSize,
  };
}

export function KevIntelligenceCenter() {
  const router = useRouter();
  const [feed, setFeed] = useState<{
    vulnerabilities: KevVulnerability[];
    vulnerabilityCount: number;
    dateReleased: string;
    catalogVersion: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<KevFilters>(DEFAULT_FILTERS);
  const mountedRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchKev = useCallback(async () => {
    const controller = new AbortController();
    abortRef.current = controller;

    setLoading(true);
    setError(null);

    try {
      const [status, data] = await Promise.all([
        checkCisaKevAvailability(),
        getCachedKevFeed(),
      ]);

      if (controller.signal.aborted) return;

      if (!status.available || !data) {
        setError(
          status.error || "Unable to fetch CISA KEV catalog. Please try again.",
        );
        setLoading(false);
        return;
      }

      setFeed({
        vulnerabilities: data.vulnerabilities,
        vulnerabilityCount: data.vulnerabilityCount,
        dateReleased: data.dateReleased,
        catalogVersion: data.catalogVersion,
      });
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load KEV data.");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void fetchKev();

    return () => {
      mountedRef.current = false;
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [fetchKev]);

  const setFilter = useCallback(
    (next: Partial<KevFilters>) => {
      const updated = { ...filters, ...next, page: 1 };
      setFilters(updated);

      const urlParams = new URLSearchParams();
      if (updated.query) urlParams.set("q", updated.query);
      if (updated.ransomware !== "All") urlParams.set("ransomware", updated.ransomware);
      urlParams.set("sort", updated.sortBy);
      urlParams.set("order", updated.sortOrder);
      if (updated.page !== 1) urlParams.set("page", String(updated.page));
      if (updated.pageSize !== DEFAULT_FILTERS.pageSize) {
        urlParams.set("limit", String(updated.pageSize));
      }
      const pathname = window.location.pathname;
      void router.push(`${pathname}?${urlParams.toString()}`, { scroll: false });
    },
    [filters, router],
  );

  const setPage = useCallback(
    (nextPage: number) => {
      const updated = { ...filters, page: nextPage };
      setFilter(updated);
    },
    [filters, setFilter],
  );

  useEffect(() => {
    if (!mountedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    setFilter(parseKevFilters(params));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const { vulnerabilities = [], vulnerabilityCount = 0 } = feed ?? {};

  const filtered = useMemo(() => {
    let result = [...vulnerabilities];

    const normalizedQuery = filters.query.trim().toLowerCase();
    if (normalizedQuery) {
      result = result.filter(
        (v) =>
          v.cveID.toLowerCase().includes(normalizedQuery) ||
          v.vendorProject.toLowerCase().includes(normalizedQuery) ||
          v.product.toLowerCase().includes(normalizedQuery) ||
          v.vulnerabilityName.toLowerCase().includes(normalizedQuery),
      );
    }

    if (filters.ransomware === "Yes") {
      result = result.filter(
        (v) => v.knownRansomwareCampaignUse === "Known",
      );
    } else if (filters.ransomware === "No") {
      result = result.filter(
        (v) => v.knownRansomwareCampaignUse !== "Known",
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      if (filters.sortBy === "dateAdded") {
        comparison =
          new Date(a.dateAdded).getTime() - new Date(b.dateAdded).getTime();
      } else {
        comparison = a.cveID.localeCompare(b.cveID);
      }
      return filters.sortOrder === "desc" ? -comparison : comparison;
    });

    return result;
  }, [vulnerabilities, filters]);

  const totalPages = Math.ceil(filtered.length / filters.pageSize) || 1;
  const safePage = Math.max(1, Math.min(filters.page, totalPages));
  const start = (safePage - 1) * filters.pageSize;
  const pageItems = filtered.slice(start, start + filters.pageSize);

  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
  }, []);

  const stats = useMemo(() => {
    if (now === null) {
      return {
        total: vulnerabilities.length,
        newlyAdded: 0,
        ransomwareCount: vulnerabilities.filter(
          (v) => v.knownRansomwareCampaignUse === "Known",
        ).length,
        overdue: 0,
        recentCriticalHigh: 0,
      };
    }

    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;
    const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;

    const total = vulnerabilities.length;
    const newlyAdded = vulnerabilities.filter(
      (v) => new Date(v.dateAdded).getTime() > thirtyDaysAgo,
    ).length;
    const ransomwareCount = vulnerabilities.filter(
      (v) => v.knownRansomwareCampaignUse === "Known",
    ).length;
    const overdue = vulnerabilities.filter(
      (v) =>
        v.dueDate &&
        new Date(v.dueDate).getTime() < now &&
        new Date(v.dueDate).getTime() > ninetyDaysAgo,
    ).length;
    const recentCriticalHigh = vulnerabilities.filter(
      (v) => new Date(v.dateAdded).getTime() > thirtyDaysAgo,
    ).length;

    return {
      total,
      newlyAdded,
      ransomwareCount,
      overdue,
      recentCriticalHigh,
    };
  }, [vulnerabilities, now]);

  const activeFiltersCount =
    (filters.query ? 1 : 0) +
    (filters.ransomware !== "All" ? 1 : 0);

  const hasPrev = safePage > 1;
  const hasNext = safePage < totalPages;

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    void fetchKev();
  }, [fetchKev]);

  if (error && !feed) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/vulnerabilities"
            className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7] mb-6 block"
          >
            <ArrowLeft size={14} /> Back to CVE Explorer
          </Link>
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <ShieldAlert className="mx-auto mb-3 text-[#ff9a92]" size={24} />
            <h2 className="mb-3 text-lg font-semibold">KEV Intelligence Center</h2>
            <p className="mb-2 text-sm text-[#ff9a92]">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:border-[#58d7f7] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading && !feed) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link
            href="/vulnerabilities"
            className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7] mb-6 block"
          >
            <ArrowLeft size={14} /> Back to CVE Explorer
          </Link>
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <Clock2 className="mx-auto mb-3 animate-spin text-[#58d7f7]" size={24} />
            <h2 className="mb-3 text-lg font-semibold">Loading KEV catalog…</h2>
            <p className="font-mono text-xs text-[#77847e]">
              Fetching CISA Known Exploited Vulnerabilities data…
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!feed) return null;

  return (
    <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/vulnerabilities"
              className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]"
            >
              <ArrowLeft size={14} /> Back to CVE Explorer
            </Link>
            <div className="mt-6">
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
                // 08.3 — kev intelligence
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                KEV Intelligence Center
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9ba8a1]">
                CISA Known Exploited Vulnerabilities Catalog — live intelligence
                on vulnerabilities with evidence of active exploitation.
              </p>
            </div>
          </div>
          <div className="flex items-end gap-3">
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing || loading}
              className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50"
            >
              <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
              {refreshing ? "Refreshing…" : "Refresh catalog"}
            </button>
          </div>
        </div>

        {/* Dashboard summary */}
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
              Total in KEV
            </p>
            <p className="text-2xl font-semibold text-[#dfe7e3]">
              {stats.total}
            </p>
          </div>
          <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
              Added (30 days)
            </p>
            <p className="text-2xl font-semibold text-[#00ff91]">
              {stats.newlyAdded}
            </p>
          </div>
          <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
              Ransomware-linked
            </p>
            <p className="text-2xl font-semibold text-[#ffca8a]">
              {stats.ransomwareCount}
            </p>
          </div>
          <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
              Overdue deadlines
            </p>
            <p className="text-2xl font-semibold text-[#ff7b72]">
              {stats.overdue}
            </p>
          </div>
          <div className="p-5 border border-white/[0.06] bg-black/10 rounded-md">
            <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
              Catalog version
            </p>
            <p className="text-2xl font-semibold text-[#9ba8a1]">
              {feed.catalogVersion}
            </p>
          </div>
        </div>

        {/* Search & filters */}
        <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row gap-4 items-end lg:items-start">
            <div className="flex-1 relative">
              <Search
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77847e]"
                size={16}
              />
              <input
                value={filters.query}
                onChange={(event) =>
                  setFilter({ query: event.target.value })
                }
                placeholder="Search CVE ID, vendor, product, or name"
                className="h-12 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-11 pr-11 font-mono text-xs outline-none placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
              />
              {filters.query && (
                <button
                  type="button"
                  onClick={() => setFilter({ query: "" })}
                  className="absolute right-3 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#77847e] hover:text-[#58d7f7]"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            <select
              value={filters.ransomware}
              onChange={(event) =>
                setFilter({ ransomware: event.target.value as KevFilters["ransomware"] })
              }
              className="h-12 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
              aria-label="Filter by ransomware"
            >
              <option value="All">Ransomware — All</option>
              <option value="Yes">Ransomware-linked</option>
              <option value="No">No ransomware link</option>
            </select>

            <select
              value={filters.sortBy}
              onChange={(event) =>
                setFilter({ sortBy: event.target.value as KevFilters["sortBy"] })
              }
              className="h-12 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
              aria-label="Sort by"
            >
              <option value="dateAdded">Date added (newest first)</option>
              <option value="dateAdded">Date added (oldest first)</option>
              <option value="cveId">CVE ID (A-Z)</option>
            </select>

            <button
              type="button"
              onClick={() => setFilter(DEFAULT_FILTERS)}
              className="h-12 border border-white/[0.08] bg-[#0d161d] px-4 font-mono text-[9px] uppercase text-[#77847e] outline-none w-full lg:w-auto"
              disabled={activeFiltersCount === 0}
            >
              <Filter size={14} className="mr-2" />
              Reset filters
            </button>
          </div>

          {activeFiltersCount > 0 && (
            <div className="mt-4 flex flex-wrap gap-2 font-mono text-[9px] uppercase text-[#77847e]">
              <span>Active filters:</span>
              {filters.query && (
                <span className="border border-[#58d7f7]/30 px-2 py-0.5 rounded text-[#58d7f7]">
                  Search: &quot;{filters.query}&quot;
                </span>
              )}
              {filters.ransomware !== "All" && (
                <span className="border border-[#58d7f7]/30 px-2 py-0.5 rounded text-[#58d7f7]">
                  Ransomware: {filters.ransomware}
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

        {/* Results summary */}
        <div className="mb-6 flex items-center justify-between font-mono text-[9px] uppercase text-[#77847e]">
          <span>
            {filtered.length} of {vulnerabilityCount} KEV vulnerabilities
          </span>
          <span>
            Page {safePage} of {totalPages}
          </span>
        </div>

        {/* Empty */}
        {filtered.length === 0 && (
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <h2 className="text-lg font-semibold">No matching KEV vulnerabilities</h2>
            <p className="mt-2 text-sm text-[#77847e]">
              Try another search or reset the filters.
            </p>
            <button
              type="button"
              onClick={() => setFilter(DEFAULT_FILTERS)}
              className="mt-5 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7]"
            >
              Reset filters
            </button>
          </div>
        )}

        {/* KEV table */}
        {filtered.length > 0 && (
          <div className="overflow-x-auto border border-white/[0.06] bg-black/10 rounded-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    CVE ID
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Vulnerability name
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Vendor
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Product
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Date added
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Due date
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Ransomware
                  </th>
                  <th className="py-3 font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {pageItems.map((vuln) => {
                  const isRansomware = vuln.knownRansomwareCampaignUse === "Known";
                  const overdue =
                    now !== null &&
                    vuln.dueDate &&
                    new Date(vuln.dueDate).getTime() < now;
                  return (
                    <tr
                      key={vuln.cveID}
                    onClick={() => {
                      void router.push(
                        `/vulnerabilities?cveId=${encodeURIComponent(vuln.cveID)}`,
                      );
                    }}
                      className="group cursor-pointer hover:bg-white/[0.03] transition-colors"
                    >
                      <td className="py-3 font-mono text-xs text-[#dfe7e3]">
                        {vuln.cveID}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#9ba8a1] truncate max-w-[24rem]">
                        {vuln.vulnerabilityName}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#9ba8a1] truncate max-w-[14rem]">
                        {vuln.vendorProject}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#9ba8a1] truncate max-w-[14rem]">
                        {vuln.product}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#9ba8a1]">
                        {new Date(vuln.dateAdded).toLocaleDateString(undefined, {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        })}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#9ba8a1]">
                        {vuln.dueDate ? (
                          <span
                            className={`font-mono ${overdue ? "text-[#ff7b72]" : "text-[#dfe7e3]"}`}
                          >
                            {new Date(vuln.dueDate).toLocaleDateString(undefined, {
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                            })}
                            {overdue ? " (overdue)" : ""}
                          </span>
                        ) : (
                          <span className="text-[#77847e]">—</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-xs">
                        {isRansomware ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md border border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a] text-[9px] font-semibold uppercase">
                            Yes
                          </span>
                        ) : (
                          <span className="text-[#77847e] text-[9px]">No</span>
                        )}
                      </td>
                      <td className="py-3 font-mono text-xs text-[#77847e] text-right">
                        <span
                          className="text-[#58d7f7] underline underline-offset-2 hover:text-[#00ff91] cursor-pointer"
                        >
                          View detail
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {filtered.length > 0 && (
          <div className="mt-8 flex items-center justify-between gap-4 font-mono text-[9px] uppercase text-[#77847e]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage(safePage - 1)}
                disabled={!hasPrev}
                className={`flex items-center gap-2 px-4 py-2 border rounded-md ${
                  !hasPrev
                    ? "border-white/[0.08] text-[#77847e] opacity-50 cursor-not-allowed"
                    : "border-white/[0.2] text-[#dfe7e3] hover:text-[#58d7f7] hover:border-[#58d7f7]/30"
                }`}
              >
                <ChevronLeft size={14} /> Prev
              </button>
              <button
                type="button"
                onClick={() => setPage(safePage + 1)}
                disabled={!hasNext}
                className={`flex items-center gap-2 px-4 py-2 border rounded-md ${
                  !hasNext
                    ? "border-white/[0.08] text-[#77847e] opacity-50 cursor-not-allowed"
                    : "border-white/[0.2] text-[#dfe7e3] hover:text-[#58d7f7] hover:border-[#58d7f7]/30"
                }`}
              >
                Next <ChevronRight size={14} />
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
                  setFilter(updated);
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
        )}

        {/* Catalog info */}
        <div className="mt-12 border border-white/[0.06] bg-black/10 p-4 rounded-md text-center">
          <p className="font-mono text-[9px] text-[#77847e]">
            Data source: CISA Known Exploited Vulnerabilities Catalog —{" "}
            {new Date(feed.dateReleased).toLocaleDateString(undefined, {
              year: "numeric",
              month: "short",
              day: "numeric",
            })} (version {feed.catalogVersion}).{" "}
            <a
              href="https://www.cisa.gov/known-exploited-vulnerabilities-catalog"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#58d7f7] hover:text-[#00ff91] transition-colors"
            >
              View official catalog
            </a>
          </p>
        </div>
      </div>
    </section>
  );
}
