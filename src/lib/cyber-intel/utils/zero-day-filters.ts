import { CVSS_SEVERITY_ORDER, type CvssSeverity } from "../types";
import type {
  AlertVerification,
  ExploitEntry,
  ExploitationStatus,
  IntelAlert,
  SourceState,
  VendorProductIntel,
  ZeroDayRecord,
} from "../types/zero-day";

export type ZeroDayTab = "dashboard" | "exploits" | "alerts" | "vendors" | "sources";
export type ZeroDayDateRange = "all" | "7d" | "30d" | "90d" | "365d";
export type ZeroDaySort =
  | "date"
  | "severity"
  | "cve"
  | "epss"
  | "title"
  | "vendor"
  | "products";

export interface ZeroDayFilters {
  tab: ZeroDayTab;
  q: string;
  severity: CvssSeverity | "All";
  vendor: string;
  product: string;
  exploitation: ExploitationStatus | "All";
  dateRange: ZeroDayDateRange;
  sortBy: ZeroDaySort;
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export const DEFAULT_ZERO_DAY_FILTERS: ZeroDayFilters = {
  tab: "dashboard",
  q: "",
  severity: "All",
  vendor: "",
  product: "",
  exploitation: "All",
  dateRange: "all",
  sortBy: "date",
  sortOrder: "desc",
  page: 1,
  pageSize: 25,
};

export const ZERO_DAY_PAGE_SIZES = [25, 50, 100];

const TABS: ZeroDayTab[] = ["dashboard", "exploits", "alerts", "vendors", "sources"];
const SEVERITIES: CvssSeverity[] = ["CRITICAL", "HIGH", "MEDIUM", "LOW", "NONE"];
const EXPLOITATION_STATUSES: ExploitationStatus[] = [
  "confirmed-kev",
  "reported-exploitation",
  "public-exploit-listing",
  "not-reported",
];
const DATE_RANGES: ZeroDayDateRange[] = ["all", "7d", "30d", "90d", "365d"];
const SORTS: ZeroDaySort[] = ["date", "severity", "cve", "epss", "title", "vendor", "products"];

function oneOf<T extends string>(value: string | null, values: T[]): T | null {
  return value && values.includes(value as T) ? (value as T) : null;
}

export function parseZeroDayFilters(params: URLSearchParams): ZeroDayFilters {
  const page = Math.max(1, Number(params.get("page")) || 1);
  const requestedSize = Number(params.get("limit"));
  return {
    ...DEFAULT_ZERO_DAY_FILTERS,
    tab: oneOf(params.get("tab"), TABS) ?? DEFAULT_ZERO_DAY_FILTERS.tab,
    q: (params.get("q") ?? "").slice(0, 200),
    severity: oneOf(params.get("severity"), SEVERITIES) ?? "All",
    vendor: (params.get("vendor") ?? "").slice(0, 120),
    product: (params.get("product") ?? "").slice(0, 120),
    exploitation: oneOf(params.get("exploitation"), EXPLOITATION_STATUSES) ?? "All",
    dateRange: oneOf(params.get("range"), DATE_RANGES) ?? "all",
    sortBy: oneOf(params.get("sort"), SORTS) ?? DEFAULT_ZERO_DAY_FILTERS.sortBy,
    sortOrder: params.get("order") === "asc" ? "asc" : "desc",
    page,
    pageSize: ZERO_DAY_PAGE_SIZES.includes(requestedSize)
      ? requestedSize
      : DEFAULT_ZERO_DAY_FILTERS.pageSize,
  };
}

export function zeroDayFiltersToParams(filters: ZeroDayFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.tab !== DEFAULT_ZERO_DAY_FILTERS.tab) params.set("tab", filters.tab);
  if (filters.q) params.set("q", filters.q);
  if (filters.severity !== "All") params.set("severity", filters.severity);
  if (filters.vendor) params.set("vendor", filters.vendor);
  if (filters.product) params.set("product", filters.product);
  if (filters.exploitation !== "All") params.set("exploitation", filters.exploitation);
  if (filters.dateRange !== "all") params.set("range", filters.dateRange);
  if (filters.sortBy !== DEFAULT_ZERO_DAY_FILTERS.sortBy) params.set("sort", filters.sortBy);
  if (filters.sortOrder !== DEFAULT_ZERO_DAY_FILTERS.sortOrder) params.set("order", filters.sortOrder);
  if (filters.page !== 1) params.set("page", String(filters.page));
  if (filters.pageSize !== DEFAULT_ZERO_DAY_FILTERS.pageSize) {
    params.set("limit", String(filters.pageSize));
  }
  return params;
}

export function getRecordDate(record: ZeroDayRecord): string | null {
  return record.kevDateAdded ?? record.publishedDate ?? record.updatedDate;
}

function withinDateRange(date: string | null, range: ZeroDayDateRange, now: number): boolean {
  if (range === "all") return true;
  if (!date) return false;
  const timestamp = Date.parse(date);
  if (Number.isNaN(timestamp)) return false;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;
  return now - timestamp <= days * 24 * 60 * 60 * 1000 && timestamp <= now;
}

function compareValues(a: unknown, b: unknown): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a ?? "").localeCompare(String(b ?? ""));
}

function applySortOrder(comparison: number, order: "asc" | "desc"): number {
  return order === "desc" ? -comparison : comparison;
}

export function filterZeroDayRecords(
  records: ZeroDayRecord[],
  filters: ZeroDayFilters,
  now: number,
): ZeroDayRecord[] {
  const q = filters.q.trim().toLowerCase();
  const vendor = filters.vendor.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  const filtered = records.filter((record) => {
    if (filters.severity !== "All" && record.severity !== filters.severity) return false;
    if (filters.exploitation !== "All" && record.exploitationStatus !== filters.exploitation) return false;
    if (vendor && !(record.vendor ?? "").toLowerCase().includes(vendor)) return false;
    if (product && !(record.product ?? "").toLowerCase().includes(product)) return false;
    if (!withinDateRange(getRecordDate(record), filters.dateRange, now)) return false;
    if (!q) return true;

    return [
      record.identifier,
      record.title,
      record.description,
      record.vendor,
      record.product,
      record.cveId,
      ...record.exploitIds,
      ...record.advisories,
      ...record.cwes,
      ...record.affectedVersions,
    ]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case "severity":
        return applySortOrder(
          CVSS_SEVERITY_ORDER[a.severity ?? "NONE"] - CVSS_SEVERITY_ORDER[b.severity ?? "NONE"],
          filters.sortOrder,
        );
      case "cve":
        return applySortOrder(a.identifier.localeCompare(b.identifier), filters.sortOrder);
      case "epss":
        return applySortOrder((a.epssScore ?? -1) - (b.epssScore ?? -1), filters.sortOrder);
      default: {
        const aDate = getRecordDate(a) ? Date.parse(getRecordDate(a)!) : 0;
        const bDate = getRecordDate(b) ? Date.parse(getRecordDate(b)!) : 0;
        return applySortOrder(aDate - bDate, filters.sortOrder);
      }
    }
  });
}

export function exploitExploitationStatus(entry: ExploitEntry): ExploitationStatus {
  return entry.observedInWild ? "confirmed-kev" : "public-exploit-listing";
}

export function filterExploitEntries(
  entries: ExploitEntry[],
  filters: ZeroDayFilters,
  now: number,
  cveExploitationStatus: Map<string, ExploitationStatus> = new Map(),
): ExploitEntry[] {
  const q = filters.q.trim().toLowerCase();
  const vendor = filters.vendor.trim().toLowerCase();
  const product = filters.product.trim().toLowerCase();

  const filtered = entries.filter((entry) => {
    if (filters.severity !== "All") return false;
    const status = entry.observedInWild
      ? "confirmed-kev"
      : entry.cveIds.map((id) => cveExploitationStatus.get(id)).find(Boolean) ??
        "public-exploit-listing";
    if (filters.exploitation !== "All" && status !== filters.exploitation) return false;
    if (vendor && !(entry.category ?? "").toLowerCase().includes(vendor)) return false;
    if (product && !(entry.affectedSoftware ?? "").toLowerCase().includes(product)) return false;
    if (!withinDateRange(entry.publishedDate, filters.dateRange, now)) return false;
    if (!q) return true;
    return [entry.id, entry.title, entry.description, entry.affectedSoftware, ...entry.cveIds]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case "title":
        return applySortOrder(a.title.localeCompare(b.title), filters.sortOrder);
      case "cve":
        return applySortOrder(a.id.localeCompare(b.id), filters.sortOrder);
      default: {
        const aDate = a.publishedDate ? Date.parse(a.publishedDate) : 0;
        const bDate = b.publishedDate ? Date.parse(b.publishedDate) : 0;
        return applySortOrder(aDate - bDate, filters.sortOrder);
      }
    }
  });
}

export function filterIntelAlerts(
  alerts: IntelAlert[],
  filters: ZeroDayFilters,
  now: number,
): IntelAlert[] {
  const q = filters.q.trim().toLowerCase();

  const filtered = alerts.filter((alert) => {
    if (filters.severity !== "All" && alert.severity !== filters.severity) return false;
    if (!withinDateRange(alert.publishedAt, filters.dateRange, now)) return false;
    if (!q) return true;
    return [alert.title, alert.excerpt, alert.sourceName, alert.category, ...alert.cveIds]
      .join(" ")
      .toLowerCase()
      .includes(q);
  });

  return filtered.sort((a, b) => {
    switch (filters.sortBy) {
      case "severity":
        return applySortOrder(
          CVSS_SEVERITY_ORDER[a.severity ?? "NONE"] - CVSS_SEVERITY_ORDER[b.severity ?? "NONE"],
          filters.sortOrder,
        );
      case "title":
        return applySortOrder(a.title.localeCompare(b.title), filters.sortOrder);
      default: {
        const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return applySortOrder(aDate - bDate, filters.sortOrder);
      }
    }
  });
}

export function filterVendorIntel(
  vendors: VendorProductIntel[],
  filters: ZeroDayFilters,
  now: number,
): VendorProductIntel[] {
  const q = filters.q.trim().toLowerCase();
  const vendorFilter = filters.vendor.trim().toLowerCase();
  const productFilter = filters.product.trim().toLowerCase();

  const filtered = vendors
    .map((vendor) => ({
      ...vendor,
      products: vendor.products.filter((product) => {
        if (productFilter && !product.product.toLowerCase().includes(productFilter)) return false;
        if (!withinDateRange(product.latestDate, filters.dateRange, now)) return false;
        return true;
      }),
    }))
    .filter((vendor) => {
      if (vendor.products.length === 0) return false;
      if (vendorFilter && !vendor.vendor.toLowerCase().includes(vendorFilter)) return false;
      if (!q) return true;
      return vendor.vendor.toLowerCase().includes(q) ||
        vendor.products.some((product) => product.product.toLowerCase().includes(q));
    });

  return filtered.sort((a, b) => {
    if (filters.sortBy === "vendor") {
      return applySortOrder(a.vendor.localeCompare(b.vendor), filters.sortOrder);
    }
    const aCount = a.products.reduce((sum, product) => sum + product.cveIds.length, 0);
    const bCount = b.products.reduce((sum, product) => sum + product.cveIds.length, 0);
    return applySortOrder(aCount - bCount, filters.sortOrder);
  });
}

export const EXPLOITATION_LABELS: Record<ExploitationStatus, string> = {
  "confirmed-kev": "Confirmed (KEV)",
  "reported-exploitation": "Reported exploitation",
  "public-exploit-listing": "Public exploit listing",
  "not-reported": "Not reported",
};

export const EXPLOITATION_COLORS: Record<ExploitationStatus, string> = {
  "confirmed-kev": "#ff7b72",
  "reported-exploitation": "#ffca8a",
  "public-exploit-listing": "#58d7f7",
  "not-reported": "#77847e",
};

export const VERIFICATION_LABELS: Record<AlertVerification, string> = {
  confirmed: "Confirmed exploitation",
  "published-advisory": "Published advisory",
  unverified: "Unverified report",
};

export const VERIFICATION_COLORS: Record<AlertVerification, string> = {
  confirmed: "#ff7b72",
  "published-advisory": "#ffca8a",
  unverified: "#77847e",
};

export const SOURCE_STATE_LABELS: Record<SourceState, string> = {
  live: "Live",
  unavailable: "Unavailable",
  "not-configured": "Not configured",
  "requires-token": "Requires token",
  "no-data": "No data",
};

export const SOURCE_STATE_COLORS: Record<SourceState, string> = {
  live: "#00ff91",
  unavailable: "#ff7b72",
  "not-configured": "#77847e",
  "requires-token": "#58d7f7",
  "no-data": "#ffca8a",
};

export const SEVERITY_COLORS: Record<CvssSeverity, string> = {
  NONE: "#77847e",
  LOW: "#00ff91",
  MEDIUM: "#fbbf24",
  HIGH: "#ffca8a",
  CRITICAL: "#ff7b72",
};

export { compareValues };
