import type { CvssSeverity } from "./index";

export type ZeroDaySourceId =
  | "cisa-kev"
  | "nvd"
  | "first-epss"
  | "github-advisories"
  | "exploit-db"
  | "cisa-advisories"
  | "security-news"
  | "vulncheck-kev";

export type SourceState =
  | "live"
  | "unavailable"
  | "not-configured"
  | "requires-token"
  | "no-data";

export interface ZeroDaySourceStatus {
  id: ZeroDaySourceId;
  name: string;
  state: SourceState;
  available: boolean;
  error: string | null;
  detail: string;
  href: string;
  fetchedAt: string | null;
}

/**
 * Exploitation status is only set from source evidence. "not-reported" means
 * no integrated source reported exploitation; it does not mean safe.
 */
export type ExploitationStatus =
  | "confirmed-kev"
  | "reported-exploitation"
  | "public-exploit-listing"
  | "not-reported";

export type AlertVerification = "confirmed" | "published-advisory" | "unverified";

export type AlertCategory =
  | "zero-day"
  | "active-exploitation"
  | "vendor-advisory"
  | "research-disclosure"
  | "general";

export interface ZeroDayRecord {
  /** Stable local identifier: CVE ID, GHSA ID, or Exploit-DB ID. */
  id: string;
  /** CVE ID when one was explicitly published by a source; otherwise null. */
  cveId: string | null;
  /** Display identifier: CVE ID, GHSA ID, or Exploit-DB ID. */
  identifier: string;
  title: string;
  description: string | null;
  publishedDate: string | null;
  updatedDate: string | null;
  kevDateAdded: string | null;
  kevDueDate: string | null;
  inKev: boolean;
  ransomwareCampaign: boolean | null;
  severity: CvssSeverity | null;
  cvssScore: number | null;
  cvssVector: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  epssDate: string | null;
  vendor: string | null;
  product: string | null;
  affectedVersions: string[];
  cwes: string[];
  exploitationStatus: ExploitationStatus;
  exploitIds: string[];
  advisories: string[];
  referenceUrls: string[];
  categories: AlertCategory[];
  sources: ZeroDaySourceId[];
  /** Internal CVE detail route. Null when no CVE was published. */
  detailPath: string | null;
  /** Official source page for advisories that do not have a CVE detail route. */
  sourceUrl: string | null;
}

export interface ExploitEntry {
  id: string;
  title: string;
  description: string | null;
  url: string;
  publishedDate: string | null;
  category: string | null;
  affectedSoftware: string | null;
  versionHints: string[];
  cveIds: string[];
  /** Exploit-DB's public RSS feed does not publish maturity. */
  maturity: null;
  observedInWild: boolean;
  source: "Exploit-DB";
}

export interface IntelAlert {
  id: string;
  title: string;
  excerpt: string | null;
  url: string;
  publishedAt: string | null;
  sourceName: string;
  sourceType: "cisa-alert" | "cisa-advisory" | "github-advisory" | "news-report";
  verification: AlertVerification;
  category: AlertCategory;
  cveIds: string[];
  severity: CvssSeverity | null;
}

export interface VendorProductIntel {
  vendor: string;
  products: Array<{
    product: string;
    cveIds: string[];
    exploitIds: string[];
    advisories: string[];
    latestDate: string | null;
  }>;
}

export interface ZeroDayDataset {
  records: ZeroDayRecord[];
  exploits: ExploitEntry[];
  alerts: IntelAlert[];
  vendors: VendorProductIntel[];
  sources: ZeroDaySourceStatus[];
  kevTotal: number;
  kevReleaseDate: string | null;
  kevCatalogVersion: string | null;
  fetchedAt: string;
}
