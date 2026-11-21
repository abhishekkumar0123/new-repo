export type IOCType = "ip" | "domain" | "url" | "hash" | "email";

export type IOCSource = "urlhaus" | "threatfox" | "otx";

export type ThreatClassification =
  | "malware_distribution"
  | "phishing"
  | "botnet_cc"
  | "trojan"
  | "ransomware"
  | "spyware"
  | "botnet"
  | "miner"
  | "dropper"
  | "loader"
  | "unknown";

export type ThreatConfidence = "low" | "medium" | "high" | "critical" | null;

export interface IOCReference {
  url: string | null;
  source: string | null;
}

export interface IOCRecord {
  id: string;
  value: string;
  type: IOCType;
  classification: ThreatClassification;
  confidence: ThreatConfidence;
  malwareFamily: string | null;
  malwareAlias: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  tags: string[];
  source: IOCSource;
  sourceId: string | null;
  sourceName: string;
  referenceUrl: string | null;
  relatedCampaign: string | null;
  relatedThreatActor: string | null;
  raw: Record<string, unknown> | null;
  fetchedAt: string | null;
}

export interface ThreatIntelSourceStatus {
  source: IOCSource;
  name: string;
  type: string;
  available: boolean;
  lastFetched: string | null;
  error: string | null;
  rateLimited: boolean;
  requiresConfiguration: boolean;
  configNote: string | null;
}

export interface ThreatIntelStatus {
  sources: ThreatIntelSourceStatus[];
  lastRefresh: string | null;
  overallAvailable: boolean;
}

export interface IOCSearchParams {
  query: string;
  type: IOCType | "All";
  classification: ThreatClassification | "All";
  source: IOCSource | "All";
  malwareFamily: string | "All";
  tag: string | "All";
  confidence: ThreatConfidence | "All";
  sortBy: "firstSeen" | "lastSeen" | "value" | "type";
  sortOrder: "asc" | "desc";
  page: number;
  pageSize: number;
}

export interface IOCListResult {
  iocs: IOCRecord[];
  totalResults: number;
  resultsPerPage: number;
  startIndex: number;
  hasMore: boolean;
}

export interface ThreatActivityEntry {
  id: string;
  type: "new-ioc";
  indicator: string;
  indicatorType: IOCType;
  classification: ThreatClassification;
  date: string;
  source: IOCSource;
  sourceName: string;
  tags: string[];
  href: string;
}
