"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Database,
  ExternalLink,
  Filter,
  Info,
  RefreshCw,
  Search,
  ShieldAlert,
  X,
} from "lucide-react";
import {
  fetchZeroDayDataset,
  formatDate,
  formatEpssPercentile,
  formatEpssScore,
  paginateCves,
  type ZeroDayDataset,
  type ZeroDayRecord,
  type ZeroDaySourceStatus,
} from "@/lib/cyber-intel";
import {
  DEFAULT_ZERO_DAY_FILTERS,
  EXPLOITATION_COLORS,
  EXPLOITATION_LABELS,
  SEVERITY_COLORS,
  SOURCE_STATE_COLORS,
  SOURCE_STATE_LABELS,
  VERIFICATION_COLORS,
  VERIFICATION_LABELS,
  ZERO_DAY_PAGE_SIZES,
  exploitExploitationStatus,
  filterExploitEntries,
  filterIntelAlerts,
  filterVendorIntel,
  filterZeroDayRecords,
  getRecordDate,
  parseZeroDayFilters,
  zeroDayFiltersToParams,
  type ZeroDayFilters,
  type ZeroDaySort,
  type ZeroDayTab,
} from "@/lib/cyber-intel/utils/zero-day-filters";

const TABS: Array<{ id: ZeroDayTab; label: string; short: string }> = [
  { id: "dashboard", label: "Intelligence dashboard", short: "Dashboard" },
  { id: "exploits", label: "Exploit database", short: "Exploits" },
  { id: "alerts", label: "News & alerts", short: "Alerts" },
  { id: "vendors", label: "Vendor intelligence", short: "Vendors" },
  { id: "sources", label: "Source status", short: "Sources" },
];

const SEVERITY_OPTIONS = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"] as const;

function MetricChip({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="min-w-[140px] flex-1 border-r border-white/[0.06] px-5 py-4 last:border-r-0">
      <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#77847e]">{label}</p>
      <p className="mt-2 text-2xl font-semibold" style={{ color: color ?? "#dfe7e3" }}>
        {value}
      </p>
    </div>
  );
}

function Tag({
  label,
  color,
  dot = false,
}: {
  label: string;
  color: string;
  dot?: boolean;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[.06em]"
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}14`,
      }}
    >
      {dot && <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />}
      {label}
    </span>
  );
}

function SeverityTag({ severity }: { severity: string | null }) {
  if (!severity) return <span className="font-mono text-[10px] text-[#77847e]">Not scored</span>;
  return <Tag label={severity} color={SEVERITY_COLORS[severity as keyof typeof SEVERITY_COLORS] ?? "#77847e"} />;
}

function ExploitationTag({ status }: { status: keyof typeof EXPLOITATION_LABELS }) {
  return (
    <Tag
      label={EXPLOITATION_LABELS[status]}
      color={EXPLOITATION_COLORS[status]}
      dot={status === "confirmed-kev"}
    />
  );
}

function SourceDot({ status }: { status: ZeroDaySourceStatus }) {
  const color = SOURCE_STATE_COLORS[status.state];
  return (
    <span className="inline-flex items-center gap-2 font-mono text-[10px]" style={{ color }}>
      <span className="size-1.5 rounded-full" style={{ backgroundColor: color }} />
      {SOURCE_STATE_LABELS[status.state]}
    </span>
  );
}

function EmptyState({ title, message, onReset }: { title: string; message: string; onReset?: () => void }) {
  return (
    <div className="border border-white/[0.06] bg-black/10 px-6 py-16 text-center">
      <ShieldAlert className="mx-auto mb-3 text-[#77847e]" size={22} />
      <h3 className="text-sm font-semibold text-[#dfe7e3]">{title}</h3>
      <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-[#77847e]">{message}</p>
      {onReset && (
        <button
          type="button"
          onClick={onReset}
          className="mt-5 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7] transition hover:border-[#58d7f7]"
        >
          Reset filters
        </button>
      )}
    </div>
  );
}

function Pagination({
  page,
  totalPages,
  pageSize,
  totalItems,
  onPage,
  onPageSize,
}: {
  page: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  onPage: (page: number) => void;
  onPageSize: (size: number) => void;
}) {
  return (
    <div className="mt-5 flex flex-col gap-3 border-t border-white/[0.06] pt-4 font-mono text-[9px] uppercase text-[#77847e] sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          className="inline-flex items-center gap-1 border border-white/[0.08] px-3 py-1.5 transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft size={13} /> Prev
        </button>
        <span className="px-2">
          Page {page} / {totalPages} · {totalItems} results
        </span>
        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          className="inline-flex items-center gap-1 border border-white/[0.08] px-3 py-1.5 transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next <ChevronRight size={13} />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <span>Rows</span>
        <select
          value={pageSize}
          onChange={(event) => onPageSize(Number(event.target.value))}
          aria-label="Rows per page"
          className="border border-white/[0.08] bg-[#0d161d] px-2 py-1.5 font-mono text-[9px] uppercase text-[#9ba8a1] outline-none focus:border-[#58d7f7]/40"
        >
          {ZERO_DAY_PAGE_SIZES.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

function RecordDrawer({
  record,
  onClose,
}: {
  record: ZeroDayRecord;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const rows: Array<[string, ReactNode]> = [
    ["Identifier", <span key="identifier" className="font-mono text-[#dfe7e3]">{record.identifier}</span>],
    ["Severity", <SeverityTag key="severity" severity={record.severity} />],
    ["CVSS", record.cvssScore !== null ? `${record.cvssScore}${record.cvssVector ? ` · ${record.cvssVector}` : ""}` : "Not reported"],
    ["EPSS", `${formatEpssScore(record.epssScore)} · percentile ${formatEpssPercentile(record.epssPercentile)}`],
    ["Exploitation", <ExploitationTag key="exploitation" status={record.exploitationStatus} />],
    ["Vendor / ecosystem", record.vendor ?? "Not reported"],
    ["Product", record.product ?? "Not reported"],
    ["Published", formatDate(record.publishedDate)],
    ["Updated", formatDate(record.updatedDate)],
    ["KEV added", record.kevDateAdded ? formatDate(record.kevDateAdded) : "Not in KEV"],
    ["KEV due", record.kevDueDate ? formatDate(record.kevDueDate) : "Not applicable"],
    ["Ransomware campaign", record.ransomwareCampaign === null ? "Not reported" : record.ransomwareCampaign ? "Known" : "Not known"],
    ["Affected versions", record.affectedVersions.length > 0 ? record.affectedVersions.join(", ") : "Not reported by source"],
    ["CWE", record.cwes.length > 0 ? record.cwes.join(", ") : "Not reported"],
    ["Advisories", record.advisories.length > 0 ? record.advisories.slice(0, 8).join(", ") : "None correlated"],
    ["Sources", record.sources.join(", ")],
  ];

  return (
    <div className="fixed inset-0 z-[70] flex justify-end" role="presentation">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Intelligence detail for ${record.identifier}`}
        className="relative h-full w-full max-w-2xl overflow-y-auto border-l border-white/[0.08] bg-[#080d10]"
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-white/[0.06] bg-[#080d10]/95 px-6 py-4 backdrop-blur">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#58d7f7]">// intelligence detail</p>
            <h2 className="mt-2 text-lg font-semibold text-[#dfe7e3]">{record.title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close detail"
            className="p-2 text-[#77847e] transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-6 py-6">
          {record.description && (
            <p className="text-sm leading-7 text-[#9ba8a1]">{record.description}</p>
          )}

          <div className="grid grid-cols-1 gap-x-8 border border-white/[0.06] bg-black/10 px-4 py-2 sm:grid-cols-2">
            {rows.map(([label, value]) => (
              <div key={label} className="border-b border-white/[0.05] py-3 last:border-b-0">
                <p className="font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">{label}</p>
                <div className="mt-1.5 break-words font-mono text-[11px] text-[#b8c4bd]">{value}</div>
              </div>
            ))}
          </div>

          {record.exploitIds.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#77847e]">Correlated exploit listings</p>
              <div className="flex flex-wrap gap-2 font-mono text-[10px] text-[#58d7f7]">
                {record.exploitIds.map((id) => (
                  <span key={id} className="border border-[#58d7f7]/25 bg-[#58d7f7]/[0.06] px-2 py-1">
                    {id}
                  </span>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-[#77847e]">Metadata only — no exploit code is provided or executed.</p>
            </div>
          )}

          {record.referenceUrls.length > 0 && (
            <div>
              <p className="mb-2 font-mono text-[9px] uppercase tracking-[.14em] text-[#77847e]">Source & reference links</p>
              <div className="space-y-1.5">
                {record.referenceUrls.map((url) => (
                  <a
                    key={url}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 break-all font-mono text-[10px] text-[#58d7f7] hover:text-[#00ff91]"
                  >
                    <ExternalLink size={12} className="shrink-0" /> {url}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 border-t border-white/[0.06] pt-5">
            {record.detailPath && (
              <Link
                href={record.detailPath}
                className="inline-flex items-center gap-2 border border-[#00ff91]/30 bg-[#00ff91]/[0.06] px-4 py-2 font-mono text-[10px] uppercase text-[#00ff91] transition hover:border-[#00ff91]"
              >
                Open CVE detail <ExternalLink size={12} />
              </Link>
            )}
            {record.sourceUrl && (
              <a
                href={record.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 border border-white/[0.08] px-4 py-2 font-mono text-[10px] uppercase text-[#9ba8a1] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
              >
                Official source <ExternalLink size={12} />
              </a>
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

export function ZeroDayTracker() {
  const router = useRouter();
  const pathname = usePathname();
  const [dataset, setDataset] = useState<ZeroDayDataset | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ZeroDayFilters>(DEFAULT_ZERO_DAY_FILTERS);
  const [selectedRecord, setSelectedRecord] = useState<ZeroDayRecord | null>(null);
  const [now, setNow] = useState(0);
  const initialized = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const loadData = useCallback(async (force = false) => {
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchZeroDayDataset({ forceRefresh: force, signal: controller.signal });
      if (controller.signal.aborted) return;
      setDataset(result);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : "Failed to load zero-day intelligence");
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    setNow(Date.now());
    void loadData();
    return () => abortRef.current?.abort();
  }, [loadData]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    setFilters(parseZeroDayFilters(new URLSearchParams(window.location.search)));
  }, []);

  const applyFilters = useCallback(
    (updates: Partial<ZeroDayFilters>) => {
      const next = { ...filters, ...updates, page: updates.page ?? 1 };
      setFilters(next);
      const params = zeroDayFiltersToParams(next);
      const query = params.toString();
      void router.replace(`${pathname}${query ? `?${query}` : ""}`, { scroll: false });
    },
    [filters, pathname, router],
  );

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_ZERO_DAY_FILTERS);
    void router.replace(pathname, { scroll: false });
  }, [pathname, router]);

  const setTab = useCallback(
    (tab: ZeroDayTab) => applyFilters({ tab }),
    [applyFilters],
  );

  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  const records = useMemo(() => dataset?.records ?? [], [dataset]);
  const exploits = useMemo(() => dataset?.exploits ?? [], [dataset]);
  const alerts = useMemo(() => dataset?.alerts ?? [], [dataset]);
  const vendors = useMemo(() => dataset?.vendors ?? [], [dataset]);
  const sourceStatuses = useMemo(() => dataset?.sources ?? [], [dataset]);

  const cveExploitationStatus = useMemo(
    () =>
      new Map(
        records
          .filter((record) => record.cveId)
          .map((record) => [record.cveId!, record.exploitationStatus]),
      ),
    [records],
  );

  const filteredRecords = useMemo(
    () => filterZeroDayRecords(records, filters, now),
    [records, filters, now],
  );
  const filteredExploits = useMemo(
    () => filterExploitEntries(exploits, filters, now, cveExploitationStatus),
    [exploits, filters, now, cveExploitationStatus],
  );
  const filteredAlerts = useMemo(
    () => filterIntelAlerts(alerts, filters, now),
    [alerts, filters, now],
  );
  const filteredVendors = useMemo(
    () => filterVendorIntel(vendors, filters, now),
    [vendors, filters, now],
  );

  const pagedRecords = paginateCves(filteredRecords, filters.page, filters.pageSize);
  const pagedExploits = paginateCves(filteredExploits, filters.page, filters.pageSize);
  const pagedAlerts = paginateCves(filteredAlerts, filters.page, filters.pageSize);
  const pagedVendors = paginateCves(filteredVendors, filters.page, filters.pageSize);

  const vendorOptions = useMemo(
    () => vendors.map((vendor) => vendor.vendor).sort((a, b) => a.localeCompare(b)),
    [vendors],
  );
  const productOptions = useMemo(() => {
    const selected = vendors.find((vendor) => vendor.vendor === filters.vendor);
    const source = selected ? selected.products : vendors.flatMap((vendor) => vendor.products);
    return [...new Set(source.map((product) => product.product))].sort((a, b) => a.localeCompare(b));
  }, [vendors, filters.vendor]);

  const zeroDaySignals = useMemo(
    () => filteredRecords.filter((record) => record.categories.includes("zero-day")),
    [filteredRecords],
  );
  const recentlyExploited = useMemo(
    () =>
      filteredRecords
        .filter((record) => record.inKev)
        .sort((a, b) => (Date.parse(getRecordDate(b) ?? "") || 0) - (Date.parse(getRecordDate(a) ?? "") || 0))
        .slice(0, 8),
    [filteredRecords],
  );
  const criticalHighAlerts = useMemo(
    () => alerts.filter((alert) => alert.severity === "CRITICAL" || alert.severity === "HIGH"),
    [alerts],
  );

  const activeFilterCount =
    (filters.q ? 1 : 0) +
    (filters.severity !== "All" ? 1 : 0) +
    (filters.vendor ? 1 : 0) +
    (filters.product ? 1 : 0) +
    (filters.exploitation !== "All" ? 1 : 0) +
    (filters.dateRange !== "all" ? 1 : 0);

  const showFilters = filters.tab !== "sources";

  if (error && !dataset) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/vulnerabilities" className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]">
            <ArrowLeft size={14} /> Back to CVE Explorer
          </Link>
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <AlertTriangle className="mx-auto mb-3 text-[#ff9a92]" size={24} />
            <h2 className="text-lg font-semibold">Zero-Day &amp; Exploit Tracker</h2>
            <p className="mt-2 text-sm text-[#ff9a92]">{error}</p>
            <button
              type="button"
              onClick={handleRefresh}
              className="mt-6 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7]"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading && !dataset) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/vulnerabilities" className="mb-6 inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]">
            <ArrowLeft size={14} /> Back to CVE Explorer
          </Link>
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <RefreshCw className="mx-auto mb-3 animate-spin text-[#58d7f7]" size={24} />
            <h2 className="text-lg font-semibold">Loading zero-day intelligence…</h2>
            <p className="mt-2 font-mono text-xs text-[#77847e]">
              Correlating CISA KEV, GitHub advisories, NVD, EPSS, Exploit-DB, CISA advisories, and security news.
            </p>
          </div>
        </div>
      </section>
    );
  }

  const sortOptions: Array<{ value: ZeroDaySort; label: string }> =
    filters.tab === "exploits"
      ? [
          { value: "date", label: "Published date" },
          { value: "title", label: "Listing title" },
          { value: "cve", label: "Exploit ID" },
        ]
      : filters.tab === "vendors"
        ? [
            { value: "products", label: "CVE volume" },
            { value: "vendor", label: "Vendor name" },
          ]
        : filters.tab === "alerts"
          ? [
              { value: "date", label: "Published date" },
              { value: "severity", label: "Severity" },
              { value: "title", label: "Title" },
            ]
          : [
              { value: "date", label: "Date added / published" },
              { value: "severity", label: "Severity" },
              { value: "cve", label: "Identifier" },
              { value: "epss", label: "EPSS" },
            ];

  return (
    <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <Link href="/vulnerabilities" className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7]">
          <ArrowLeft size={14} /> Back to CVE Explorer
        </Link>

        <div className="mt-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">// 12 — zero-day &amp; exploit tracker</p>
            <h1 className="mt-3 text-4xl font-semibold">Zero-Day &amp; Exploit Tracker</h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-[#9ba8a1]">
              Correlated defensive intelligence from official vulnerability feeds, advisories, and public exploit listings.
              Exploitation claims are shown only when a source explicitly reports them; missing data is never inferred.
            </p>
          </div>
          <button
            type="button"
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="inline-flex items-center gap-2 self-start border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50"
          >
            <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
            {refreshing ? "Refreshing…" : "Refresh intelligence"}
          </button>
        </div>

        <div className="mt-6 flex items-start gap-3 border border-[#ffca8a]/20 bg-[#ffca8a]/[0.05] px-4 py-3">
          <Info size={14} className="mt-0.5 shrink-0 text-[#ffca8a]" />
          <p className="text-[11px] leading-6 text-[#9ba8a1]">
            Defensive use only. No exploit code is fetched, stored, or executed. Exploit-DB RSS exposes listing metadata,
            not maturity or CVE mappings; correlations are shown only when a CVE is explicit in a source.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap border border-white/[0.06] bg-black/10">
          <MetricChip label="Watchlist records" value={records.length} />
          <MetricChip label="Explicit zero-day signals" value={zeroDaySignals.length} color="#ffca8a" />
          <MetricChip label="CISA KEV catalog" value={dataset?.kevTotal ?? 0} color="#ff7b72" />
          <MetricChip label="Critical / high alerts" value={criticalHighAlerts.length} color="#ff9a92" />
          <MetricChip label="Public exploit listings" value={exploits.length} color="#58d7f7" />
          <MetricChip label="Vendors tracked" value={vendors.length} color="#00ff91" />
        </div>

        <div className="mt-6 flex flex-wrap gap-1 border-b border-white/[0.06]" role="tablist" aria-label="Zero-day tracker sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={filters.tab === tab.id}
              onClick={() => setTab(tab.id)}
              className={`border-b-2 px-4 py-3 font-mono text-[10px] uppercase tracking-[.08em] transition ${
                filters.tab === tab.id
                  ? "border-[#00ff91] text-[#00ff91]"
                  : "border-transparent text-[#77847e] hover:text-[#dfe7e3]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {showFilters && (
          <div className="mt-6 border border-white/[0.06] bg-black/10 p-4 lg:p-5">
            <div className="flex flex-col gap-3 lg:flex-row">
              <div className="relative flex-1">
                <label className="sr-only" htmlFor="zero-day-search">Search intelligence</label>
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77847e]" size={15} />
                <input
                  id="zero-day-search"
                  value={filters.q}
                  onChange={(event) => applyFilters({ q: event.target.value })}
                  placeholder="CVE, title, vendor, product, advisory, exploit ID"
                  className="h-11 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-10 pr-10 font-mono text-xs outline-none placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
                />
                {filters.q && (
                  <button
                    type="button"
                    onClick={() => applyFilters({ q: "" })}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 grid size-7 -translate-y-1/2 place-items-center text-[#77847e] hover:text-[#58d7f7]"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {(filters.tab === "dashboard" || filters.tab === "alerts") && (
                <select
                  value={filters.severity}
                  onChange={(event) => applyFilters({ severity: event.target.value as ZeroDayFilters["severity"] })}
                  aria-label="Filter by severity"
                  className="h-11 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[10px] uppercase text-[#9ba8a1] outline-none focus:border-[#58d7f7]/40"
                >
                  <option value="All">Severity — all</option>
                  {SEVERITY_OPTIONS.map((severity) => (
                    <option key={severity} value={severity}>{severity}</option>
                  ))}
                </select>
              )}

              {(filters.tab === "dashboard" || filters.tab === "exploits" || filters.tab === "vendors") && (
                <select
                  value={filters.vendor}
                  onChange={(event) => applyFilters({ vendor: event.target.value, product: "" })}
                  aria-label="Filter by vendor or ecosystem"
                  className="h-11 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[10px] uppercase text-[#9ba8a1] outline-none focus:border-[#58d7f7]/40"
                >
                  <option value="">Vendor / ecosystem — all</option>
                  {vendorOptions.map((vendor) => (
                    <option key={vendor} value={vendor}>{vendor}</option>
                  ))}
                </select>
              )}

              {(filters.tab === "dashboard" || filters.tab === "exploits" || filters.tab === "vendors") && (
                <select
                  value={filters.product}
                  onChange={(event) => applyFilters({ product: event.target.value })}
                  aria-label="Filter by product"
                  className="h-11 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[10px] uppercase text-[#9ba8a1] outline-none focus:border-[#58d7f7]/40"
                >
                  <option value="">Product — all</option>
                  {productOptions.slice(0, 300).map((product) => (
                    <option key={product} value={product}>{product}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="mt-3 flex flex-wrap gap-3">
              {(filters.tab === "dashboard" || filters.tab === "exploits") && (
                <select
                  value={filters.exploitation}
                  onChange={(event) => applyFilters({ exploitation: event.target.value as ZeroDayFilters["exploitation"] })}
                  aria-label="Filter by exploitation status"
                  className="h-10 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none focus:border-[#58d7f7]/40"
                >
                  <option value="All">Exploitation — all</option>
                  {Object.entries(EXPLOITATION_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              )}

              <select
                value={filters.dateRange}
                onChange={(event) => applyFilters({ dateRange: event.target.value as ZeroDayFilters["dateRange"] })}
                aria-label="Filter by date range"
                className="h-10 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none focus:border-[#58d7f7]/40"
              >
                <option value="all">Any date</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="365d">Last 365 days</option>
              </select>

              <select
                value={filters.sortBy}
                onChange={(event) => applyFilters({ sortBy: event.target.value as ZeroDaySort })}
                aria-label="Sort results"
                className="h-10 border border-white/[0.08] bg-[#0d161d] px-3 font-mono text-[9px] uppercase text-[#77847e] outline-none focus:border-[#58d7f7]/40"
              >
                {sortOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => applyFilters({ sortOrder: filters.sortOrder === "desc" ? "asc" : "desc" })}
                className="h-10 border border-white/[0.08] px-3 font-mono text-[9px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
              >
                {filters.sortOrder === "desc" ? "Descending ↓" : "Ascending ↑"}
              </button>

              <button
                type="button"
                onClick={resetFilters}
                disabled={activeFilterCount === 0}
                className="inline-flex h-10 items-center gap-2 border border-white/[0.08] px-3 font-mono text-[9px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-40"
              >
                <Filter size={12} /> Reset {activeFilterCount > 0 ? `(${activeFilterCount})` : ""}
              </button>
            </div>

            {activeFilterCount > 0 && (
              <div className="mt-3 flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase text-[#77847e]" aria-live="polite">
                <span>Active:</span>
                {filters.q && <Tag label={`Search: ${filters.q}`} color="#58d7f7" />}
                {filters.severity !== "All" && <Tag label={filters.severity} color={SEVERITY_COLORS[filters.severity]} />}
                {filters.vendor && <Tag label={filters.vendor} color="#00ff91" />}
                {filters.product && <Tag label={filters.product} color="#00ff91" />}
                {filters.exploitation !== "All" && <Tag label={EXPLOITATION_LABELS[filters.exploitation]} color={EXPLOITATION_COLORS[filters.exploitation]} />}
                {filters.dateRange !== "all" && <Tag label={filters.dateRange} color="#ffca8a" />}
              </div>
            )}
          </div>
        )}

        <div className="mt-6" role="tabpanel" aria-label={TABS.find((tab) => tab.id === filters.tab)?.label}>
          {filters.tab === "dashboard" && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div className="min-w-0">
                <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">
                  <span>Zero-day watchlist / correlated records</span>
                  <span aria-live="polite">{filteredRecords.length} records</span>
                </div>

                {pagedRecords.items.length === 0 ? (
                  <EmptyState
                    title="No correlated records"
                    message="No source currently returned records matching these filters. Check source status, widen the date range, or refresh intelligence."
                    onReset={activeFilterCount > 0 ? resetFilters : undefined}
                  />
                ) : (
                  <div className="overflow-x-auto border border-white/[0.06] bg-black/10">
                    <table className="w-full min-w-[900px] border-collapse text-left">
                      <caption className="sr-only">Zero-day intelligence watchlist</caption>
                      <thead>
                        <tr className="border-b border-white/[0.06]">
                          {["ID", "Signal / title", "Severity", "Exploitation", "Vendor / product", "Date", "EPSS", ""].map((heading) => (
                            <th key={heading} className="px-3 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">{heading}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.05]">
                        {pagedRecords.items.map((record) => (
                          <tr key={record.id} className="transition hover:bg-white/[0.02]">
                            <td className="px-3 py-3 align-top font-mono text-[11px] text-[#dfe7e3]">
                              {record.detailPath ? (
                                <Link href={record.detailPath} className="hover:text-[#58d7f7]">{record.identifier}</Link>
                              ) : (
                                <span>{record.identifier}</span>
                              )}
                            </td>
                            <td className="max-w-[320px] px-3 py-3 align-top">
                              <p className="line-clamp-2 text-xs text-[#c8d2cc]">{record.title}</p>
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {record.categories.includes("zero-day") && <Tag label="Zero-day" color="#ffca8a" />}
                                {record.inKev && <Tag label="KEV" color="#ff7b72" />}
                                {record.exploitIds.length > 0 && <Tag label={`${record.exploitIds.length} exploit listing${record.exploitIds.length > 1 ? "s" : ""}`} color="#58d7f7" />}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top"><SeverityTag severity={record.severity} /></td>
                            <td className="px-3 py-3 align-top"><ExploitationTag status={record.exploitationStatus} /></td>
                            <td className="px-3 py-3 align-top font-mono text-[10px] text-[#9ba8a1]">
                              <span className="block">{record.vendor ?? "Not reported"}</span>
                              <span className="block text-[#77847e]">{record.product ?? "—"}</span>
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[10px] text-[#9ba8a1]">
                              {formatDate(getRecordDate(record))}
                            </td>
                            <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[10px] text-[#9ba8a1]">
                              {formatEpssScore(record.epssScore)}
                            </td>
                            <td className="px-3 py-3 align-top text-right">
                              <button
                                type="button"
                                onClick={() => setSelectedRecord(record)}
                                className="font-mono text-[10px] uppercase text-[#58d7f7] hover:text-[#00ff91]"
                              >
                                Detail
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <Pagination
                  page={pagedRecords.currentPage}
                  totalPages={pagedRecords.totalPages}
                  pageSize={filters.pageSize}
                  totalItems={pagedRecords.totalItems}
                  onPage={(page) => applyFilters({ page })}
                  onPageSize={(pageSize) => applyFilters({ pageSize })}
                />
              </div>

              <aside className="space-y-5">
                <div className="border border-white/[0.06] bg-black/10">
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#58d7f7]">// zero-day signals</p>
                  </div>
                  {zeroDaySignals.length === 0 ? (
                    <p className="px-4 py-5 text-[11px] leading-6 text-[#77847e]">
                      No integrated source explicitly labelled a disclosure as a zero-day in the current result set.
                    </p>
                  ) : (
                    <ul className="divide-y divide-white/[0.05]">
                      {zeroDaySignals.slice(0, 6).map((record) => (
                        <li key={record.id} className="px-4 py-3">
                          <button type="button" onClick={() => setSelectedRecord(record)} className="text-left">
                            <p className="font-mono text-[10px] text-[#dfe7e3]">{record.identifier}</p>
                            <p className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#9ba8a1]">{record.title}</p>
                            <p className="mt-1 font-mono text-[9px] text-[#77847e]">{formatDate(getRecordDate(record))}</p>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border border-white/[0.06] bg-black/10">
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#58d7f7]">// recently exploited (KEV)</p>
                  </div>
                  {recentlyExploited.length === 0 ? (
                    <p className="px-4 py-5 text-[11px] text-[#77847e]">No KEV-correlated records in the current result set.</p>
                  ) : (
                    <ul className="divide-y divide-white/[0.05]">
                      {recentlyExploited.map((record) => (
                        <li key={record.id} className="px-4 py-3">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-mono text-[10px] text-[#dfe7e3]">{record.identifier}</p>
                              <p className="mt-1 truncate text-[11px] text-[#9ba8a1]">{record.vendor ?? "—"} / {record.product ?? "—"}</p>
                            </div>
                            <span className="whitespace-nowrap font-mono text-[9px] text-[#ff9a92]">{formatDate(record.kevDateAdded)}</span>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="border border-white/[0.06] bg-black/10">
                  <div className="border-b border-white/[0.06] px-4 py-3">
                    <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#58d7f7]">// intelligence health</p>
                  </div>
                  <ul className="divide-y divide-white/[0.05]">
                    {sourceStatuses.map((status) => (
                      <li key={status.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                        <span className="truncate text-[11px] text-[#9ba8a1]">{status.name}</span>
                        <SourceDot status={status} />
                      </li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => setTab("sources")}
                    className="w-full border-t border-white/[0.06] px-4 py-3 text-left font-mono text-[9px] uppercase text-[#58d7f7] hover:text-[#00ff91]"
                  >
                    View source status →
                  </button>
                </div>
              </aside>
            </div>
          )}

          {filters.tab === "exploits" && (
            <div>
              <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">
                <span>Exploit-DB public RSS listings — metadata only</span>
                <span aria-live="polite">{filteredExploits.length} listings</span>
              </div>
              {pagedExploits.items.length === 0 ? (
                <EmptyState
                  title="No exploit listings match"
                  message="Exploit-DB is CORS-restricted and requires the configured proxy. If it is enabled, try widening the date range or clearing filters."
                  onReset={activeFilterCount > 0 ? resetFilters : undefined}
                />
              ) : (
                <div className="overflow-x-auto border border-white/[0.06] bg-black/10">
                  <table className="w-full min-w-[980px] border-collapse text-left">
                    <caption className="sr-only">Exploit database listings</caption>
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["ID", "Title", "Category", "Affected software / versions", "CVE", "Published", "Maturity", "Wild", "Source"].map((heading) => (
                          <th key={heading} className="px-3 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {pagedExploits.items.map((entry) => (
                        <tr key={entry.id} className="transition hover:bg-white/[0.02]">
                          <td className="px-3 py-3 font-mono text-[10px] text-[#dfe7e3]">{entry.id}</td>
                          <td className="max-w-[300px] px-3 py-3">
                            <p className="line-clamp-2 text-xs text-[#c8d2cc]">{entry.title}</p>
                            {entry.description && <p className="mt-1 line-clamp-1 text-[10px] text-[#77847e]">{entry.description}</p>}
                          </td>
                          <td className="px-3 py-3 font-mono text-[10px] uppercase text-[#9ba8a1]">{entry.category ?? "Not reported"}</td>
                          <td className="max-w-[220px] px-3 py-3 font-mono text-[10px] text-[#9ba8a1]">
                            <span className="block">{entry.affectedSoftware ?? "Not reported"}</span>
                            <span className="block text-[#77847e]">{entry.versionHints.length > 0 ? `Hints: ${entry.versionHints.join(", ")}` : "Versions not reported"}</span>
                          </td>
                          <td className="px-3 py-3 font-mono text-[10px]">
                            {entry.cveIds.length > 0 ? (
                              <div className="flex flex-col gap-1">
                                {entry.cveIds.slice(0, 3).map((cveId) => (
                                  <Link key={cveId} href={`/vulnerabilities/${cveId}`} className="text-[#58d7f7] hover:text-[#00ff91]">{cveId}</Link>
                                ))}
                              </div>
                            ) : (
                              <span className="text-[#77847e]">Not in feed</span>
                            )}
                          </td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-[10px] text-[#9ba8a1]">{formatDate(entry.publishedDate)}</td>
                          <td className="whitespace-nowrap px-3 py-3 font-mono text-[9px] text-[#77847e]">Not reported by feed</td>
                          <td className="px-3 py-3"><ExploitationTag status={exploitExploitationStatus(entry)} /></td>
                          <td className="px-3 py-3">
                            <a href={entry.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${entry.id} at Exploit-DB`} className="inline-flex items-center gap-1 font-mono text-[10px] text-[#58d7f7] hover:text-[#00ff91]">
                              Open <ExternalLink size={11} />
                            </a>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                page={pagedExploits.currentPage}
                totalPages={pagedExploits.totalPages}
                pageSize={filters.pageSize}
                totalItems={pagedExploits.totalItems}
                onPage={(page) => applyFilters({ page })}
                onPageSize={(pageSize) => applyFilters({ pageSize })}
              />
            </div>
          )}

          {filters.tab === "alerts" && (
            <div>
              <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">
                <span>Disclosures, advisories, exploitation warnings, and news reports</span>
                <span aria-live="polite">{filteredAlerts.length} alerts</span>
              </div>
              {pagedAlerts.items.length === 0 ? (
                <EmptyState
                  title="No alerts to display"
                  message="Alerts come from CISA advisories, GitHub advisories, and the existing Security News feeds. Check source status if no alerts are available."
                  onReset={activeFilterCount > 0 ? resetFilters : undefined}
                />
              ) : (
                <div className="overflow-hidden border border-white/[0.06] bg-black/10">
                  <ul className="divide-y divide-white/[0.05]">
                    {pagedAlerts.items.map((alert) => (
                      <li key={alert.id} className="grid gap-3 px-4 py-4 transition hover:bg-white/[0.02] lg:grid-cols-[minmax(0,1fr)_260px]">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            <Tag label={alert.category.replace("-", " ")} color="#58d7f7" />
                            <Tag label={VERIFICATION_LABELS[alert.verification]} color={VERIFICATION_COLORS[alert.verification]} dot={alert.verification === "confirmed"} />
                            <SeverityTag severity={alert.severity} />
                          </div>
                          <a href={alert.url} target="_blank" rel="noopener noreferrer" className="mt-2 block text-sm font-medium text-[#dfe7e3] hover:text-[#00ff91]">
                            {alert.title} <ExternalLink size={12} className="inline" />
                          </a>
                          {alert.excerpt && <p className="mt-2 line-clamp-2 text-xs leading-6 text-[#9ba8a1]">{alert.excerpt}</p>}
                          {alert.cveIds.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {alert.cveIds.slice(0, 6).map((cveId) => (
                                <Link key={cveId} href={`/vulnerabilities/${cveId}`} className="font-mono text-[10px] text-[#ffca8a] hover:text-[#00ff91]">{cveId}</Link>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-row justify-between gap-3 lg:flex-col lg:items-end lg:text-right">
                          <p className="font-mono text-[10px] text-[#9ba8a1]">{alert.sourceName}</p>
                          <p className="font-mono text-[10px] text-[#77847e]">{formatDate(alert.publishedAt)}</p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Pagination
                page={pagedAlerts.currentPage}
                totalPages={pagedAlerts.totalPages}
                pageSize={filters.pageSize}
                totalItems={pagedAlerts.totalItems}
                onPage={(page) => applyFilters({ page })}
                onPageSize={(pageSize) => applyFilters({ pageSize })}
              />
            </div>
          )}

          {filters.tab === "vendors" && (
            <div>
              <div className="mb-3 flex items-center justify-between font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">
                <span>Vendor and product correlations</span>
                <span aria-live="polite">{filteredVendors.length} vendors</span>
              </div>
              {pagedVendors.items.length === 0 ? (
                <EmptyState
                  title="No vendor correlations"
                  message="Vendor and product attribution is shown only when a source reports it. Try clearing filters or checking source status."
                  onReset={activeFilterCount > 0 ? resetFilters : undefined}
                />
              ) : (
                <div className="overflow-x-auto border border-white/[0.06] bg-black/10">
                  <table className="w-full min-w-[860px] border-collapse text-left">
                    <caption className="sr-only">Vendor and product intelligence</caption>
                    <thead>
                      <tr className="border-b border-white/[0.06]">
                        {["Vendor / ecosystem", "Products", "CVEs", "Exploit listings", "Advisories", "Latest signal"].map((heading) => (
                          <th key={heading} className="px-3 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {pagedVendors.items.map((vendor) => {
                        const productCount = vendor.products.reduce((sum, product) => sum + product.cveIds.length, 0);
                        const exploitCount = vendor.products.reduce((sum, product) => sum + product.exploitIds.length, 0);
                        const advisoryCount = vendor.products.reduce((sum, product) => sum + product.advisories.length, 0);
                        const latest = vendor.products
                          .map((product) => product.latestDate)
                          .filter((date): date is string => Boolean(date))
                          .sort((a, b) => Date.parse(b) - Date.parse(a))[0] ?? null;
                        const cveIds = [...new Set(vendor.products.flatMap((product) => product.cveIds))];
                        return (
                          <tr key={vendor.vendor} className="transition hover:bg-white/[0.02]">
                            <td className="px-3 py-3 align-top">
                              <button
                                type="button"
                                onClick={() => applyFilters({ tab: "dashboard", vendor: vendor.vendor, product: "" })}
                                className="font-mono text-xs text-[#dfe7e3] hover:text-[#00ff91]"
                              >
                                {vendor.vendor}
                              </button>
                            </td>
                            <td className="max-w-[320px] px-3 py-3 align-top font-mono text-[10px] text-[#9ba8a1]">
                              {vendor.products.slice(0, 4).map((product) => (
                                <button
                                  key={product.product}
                                  type="button"
                                  onClick={() => applyFilters({ tab: "dashboard", vendor: vendor.vendor, product: product.product })}
                                  className="mr-2 block text-left hover:text-[#58d7f7]"
                                >
                                  {product.product}
                                </button>
                              ))}
                              {vendor.products.length > 4 && <span className="text-[#77847e]">+{vendor.products.length - 4} more</span>}
                            </td>
                            <td className="px-3 py-3 align-top font-mono text-[10px]">
                              <span className="text-[#dfe7e3]">{productCount}</span>
                              <div className="mt-1 flex max-w-[220px] flex-wrap gap-1">
                                {cveIds.slice(0, 3).map((cveId) => (
                                  <Link key={cveId} href={`/vulnerabilities/${cveId}`} className="text-[#58d7f7] hover:text-[#00ff91]">{cveId}</Link>
                                ))}
                                {cveIds.length > 3 && <span className="text-[#77847e]">+{cveIds.length - 3}</span>}
                              </div>
                            </td>
                            <td className="px-3 py-3 align-top font-mono text-[10px] text-[#58d7f7]">{exploitCount}</td>
                            <td className="px-3 py-3 align-top font-mono text-[10px] text-[#9ba8a1]">{advisoryCount}</td>
                            <td className="whitespace-nowrap px-3 py-3 align-top font-mono text-[10px] text-[#77847e]">{formatDate(latest)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              <Pagination
                page={pagedVendors.currentPage}
                totalPages={pagedVendors.totalPages}
                pageSize={filters.pageSize}
                totalItems={pagedVendors.totalItems}
                onPage={(page) => applyFilters({ page })}
                onPageSize={(pageSize) => applyFilters({ pageSize })}
              />
            </div>
          )}

          {filters.tab === "sources" && (
            <div className="space-y-5">
              <div className="overflow-x-auto border border-white/[0.06] bg-black/10">
                <table className="w-full min-w-[860px] border-collapse text-left">
                  <caption className="sr-only">Zero-day intelligence source status</caption>
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      {["Source", "State", "Detail", "Last fetched", "Documentation"].map((heading) => (
                        <th key={heading} className="px-3 py-3 font-mono text-[9px] uppercase tracking-[.12em] text-[#77847e]">{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {sourceStatuses.map((status) => (
                      <tr key={status.id}>
                        <td className="px-3 py-3 font-mono text-xs text-[#dfe7e3]">{status.name}</td>
                        <td className="px-3 py-3"><SourceDot status={status} /></td>
                        <td className="max-w-[420px] px-3 py-3 text-[11px] leading-6 text-[#9ba8a1]">
                          <span>{status.detail}</span>
                          {status.error && <span className="mt-1 block font-mono text-[10px] text-[#ff9a92]">{status.error}</span>}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-[10px] text-[#77847e]">
                          {status.fetchedAt ? formatDate(status.fetchedAt) : "Never"}
                        </td>
                        <td className="px-3 py-3">
                          {status.href.startsWith("/") ? (
                            <Link href={status.href} className="inline-flex items-center gap-1 font-mono text-[10px] text-[#58d7f7] hover:text-[#00ff91]">
                              Docs <ExternalLink size={11} />
                            </Link>
                          ) : (
                            <a href={status.href} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[10px] text-[#58d7f7] hover:text-[#00ff91]">
                              Docs <ExternalLink size={11} />
                            </a>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="grid gap-4 lg:grid-cols-3">
                <div className="border border-white/[0.06] bg-black/10 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#58d7f7]">// CORS-restricted feeds</p>
                  <p className="mt-2 text-[11px] leading-6 text-[#9ba8a1]">
                    CISA KEV, CISA advisories RSS, and Exploit-DB RSS do not send permissive CORS headers.
                    They are fetched through an allowlisted Supabase Edge Function when configured.
                  </p>
                </div>
                <div className="border border-white/[0.06] bg-black/10 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#58d7f7]">// Enrichment scope</p>
                  <p className="mt-2 text-[11px] leading-6 text-[#9ba8a1]">
                    NVD and EPSS enrichment is limited to the 100 highest-priority CVEs per load to respect
                    published rate limits. Unenriched fields remain explicitly unscored.
                  </p>
                </div>
                <div className="border border-white/[0.06] bg-black/10 p-4">
                  <p className="font-mono text-[9px] uppercase tracking-[.14em] text-[#58d7f7]">// Token-gated source</p>
                  <p className="mt-2 text-[11px] leading-6 text-[#9ba8a1]">
                    VulnCheck KEV requires a bearer token. No API token is embedded in the browser bundle,
                    so the source is reported as requires-token rather than silently omitted.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/[0.06] pt-5 font-mono text-[9px] uppercase text-[#77847e]">
          <span className="inline-flex items-center gap-2">
            <Activity size={12} className="text-[#00ff91]" />
            {dataset ? `Snapshot: ${formatDate(dataset.fetchedAt)}` : "No snapshot"}
          </span>
          <span className="inline-flex items-center gap-2">
            <Database size={12} />
            {dataset?.kevCatalogVersion ? `KEV catalog ${dataset.kevCatalogVersion}` : "KEV version unavailable"}
          </span>
          <span className="inline-flex items-center gap-2">
            <Clock3 size={12} />
            {dataset?.kevReleaseDate ? `Released ${formatDate(dataset.kevReleaseDate)}` : "Release date unavailable"}
          </span>
        </div>
      </div>

      {selectedRecord && <RecordDrawer record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </section>
  );
}
