export type CvssVersion = "2.0" | "3.1" | "4.0";

export type CvssSeverity = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export interface CvssMetric {
  version: CvssVersion;
  vectorString: string | null;
  baseScore: number | null;
  baseSeverity: CvssSeverity | null;
  exploitabilityScore: number | null;
  impactScore: number | null;
}

export interface CweInfo {
  id: string | null;
  name: string | null;
  description: string | null;
}

export interface Reference {
  url: string | null;
  source: string | null;
  tags: string[];
}

export interface AffectedProduct {
  vendor: string | null;
  product: string | null;
  versions: string[];
  versionStatus: "affected" | "unaffected" | "fixed" | "unknown";
}

export interface KevInfo {
  inKev: boolean;
  dateAdded: string | null;
  dueDate: string | null;
  ransomwareCampaign: boolean | null;
  source: string | null;
}

export interface EpssInfo {
  score: number | null;
  percentile: number | null;
  date: string | null;
}

export interface CveSourceAttribution {
  source: "nvd" | "cisa-kev" | "first-epss" | "supabase" | "combined";
  fetchedAt: string | null;
  rawUrl: string | null;
}

export interface CveRecord {
  id: string;
  cveId: string;
  description: string | null;
  publishedDate: string | null;
  lastModifiedDate: string | null;
  cvss: CvssMetric[];
  cwe: CweInfo[];
  affectedProducts: AffectedProduct[];
  references: Reference[];
  kev: KevInfo;
  epss: EpssInfo;
  source: CveSourceAttribution;
}

export interface CveListResult {
  cves: CveRecord[];
  totalResults: number;
  resultsPerPage: number;
  startIndex: number;
  hasMore: boolean;
}

export interface CveSearchParams {
  query?: string;
  cveId?: string;
  keyword?: string;
  severity?: CvssSeverity;
  cvssV2Score?: string;
  cvssV3Score?: string;
  cweId?: string;
  vendor?: string;
  product?: string;
  publishedStartDate?: string;
  publishedEndDate?: string;
  lastModifiedStartDate?: string;
  lastModifiedEndDate?: string;
  inKev?: boolean;
  resultsPerPage?: number;
  startIndex?: number;
}

export interface CveIntelligenceStatus {
  nvd: SourceStatus;
  cisaKev: SourceStatus;
  firstEpss: SourceStatus;
  lastRefresh: string | null;
}

export interface SourceStatus {
  available: boolean;
  lastFetched: string | null;
  error: string | null;
  rateLimited: boolean;
}

export interface CveCacheEntry<T = unknown> {
  data: T;
  fetchedAt: number;
  ttlMs: number;
}

export function isCveCacheExpired(entry: CveCacheEntry): boolean {
  return Date.now() - entry.fetchedAt > entry.ttlMs;
}

export function createCveCacheEntry<T>(data: T, ttlMs: number): CveCacheEntry<T> {
  return { data, fetchedAt: Date.now(), ttlMs };
}

export const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;

export const CVSS_SEVERITY_ORDER: Record<CvssSeverity, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const CVSS_SEVERITY_LABELS: Record<CvssSeverity, string> = {
  NONE: "None",
  LOW: "Low",
  MEDIUM: "Medium",
  HIGH: "High",
  CRITICAL: "Critical",
};

export const CVSS_SEVERITY_COLORS: Record<CvssSeverity, string> = {
  NONE: "#77847e",
  LOW: "#00ff91",
  MEDIUM: "#fbbf24",
  HIGH: "#ffca8a",
  CRITICAL: "#ff7b72",
};
