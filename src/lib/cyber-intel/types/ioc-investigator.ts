export type HashType = "md5" | "sha1" | "sha256";

export type IOCType = "ipv4" | "ipv6" | "domain" | "url" | "md5" | "sha1" | "sha256";

export type HashSource = "malwarebazaar" | "virustotal" | "otx" | "threatfox" | "urlhaus";

export type CertificateSource = "crtsh" | "ct-logs";

export type HashVerdict = "malicious" | "suspicious" | "clean" | "unknown" | "no-detections";

export type CertificateStatus = "valid" | "expired" | "expiring-soon" | "revoked" | "unknown";

export interface HashLookupResult {
  hash: string;
  type: HashType;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  md5: string | null;
  sha1: string | null;
  sha256: string | null;
  malwareFamily: string | null;
  malwareAlias: string | null;
  threatClassification: string | null;
  firstSeen: string | null;
  lastSeen: string | null;
  vendorDetections: Array<{
    vendor: string;
    result: string;
    category: string;
    method: string;
  }>;
  detectionRatio: string | null;
  threatTags: string[];
  intelligence: Array<{
    source: HashSource;
    verdict: HashVerdict;
    confidence: number | null;
    details: Record<string, unknown>;
    referenceUrl: string | null;
    lastAnalysisDate: string | null;
  }>;
  relatedIOCs: Array<{
    type: IOCType;
    value: string;
    relationship: string;
    source: string;
  }>;
  isCached: boolean;
  error: string | null;
  fetchedAt: string;
}

export interface IOCEnrichmentResult {
  ioc: {
    type: IOCType;
    value: string;
    normalized: string;
  };
  reputation: Array<{
    source: string;
    verdict: HashVerdict;
    confidence: number | null;
    categories: string[];
    detectionCount: number | null;
    totalVendors: number | null;
    lastAnalysisDate: string | null;
    referenceUrl: string | null;
    details: Record<string, unknown>;
  }>;
  relatedIndicators: Array<{
    type: IOCType;
    value: string;
    relationship: string;
    source: string;
    confidence: number | null;
  }>;
  contextLinks: {
    ipReputation?: string;
    domainIntelligence?: string;
    urlAnalyzer?: string;
    threatIntelligence?: string;
  };
  enrichedAt: string;
  sourcesQueried: string[];
  errors: Array<{ source: string; error: string }>;
}

export interface CertificateInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  sha256Fingerprint: string;
  sha1Fingerprint: string | null;
  md5Fingerprint: string | null;
  validFrom: string;
  validUntil: string;
  status: CertificateStatus;
  daysUntilExpiry: number | null;
  subjectAlternativeNames: string[];
  commonName: string | null;
  keyAlgorithm: string | null;
  keySize: number | null;
  signatureAlgorithm: string | null;
  version: number | null;
  extensions: Array<{
    oid: string;
    name: string;
    critical: boolean;
    value: string;
  }>;
  ctEntries: Array<{
    logId: string;
    logName: string;
    timestamp: string;
    entryUrl: string | null;
  }>;
  chain: Array<{
    subject: string;
    issuer: string;
    serialNumber: string;
    sha256Fingerprint: string;
    validFrom: string;
    validUntil: string;
  }>;
  relatedDomains: string[];
  source: CertificateSource;
  referenceUrl: string | null;
  rawData: Record<string, unknown> | null;
  fetchedAt: string;
}

export interface IOCInvestigatorSourceStatus {
  source: string;
  name: string;
  type: string;
  available: boolean;
  lastChecked: string | null;
  error: string | null;
  rateLimited: boolean;
  requiresConfiguration: boolean;
  configNote: string | null;
}

export interface IOCInvestigatorStatus {
  sources: IOCInvestigatorSourceStatus[];
  lastRefresh: string | null;
  overallAvailable: boolean;
}

export interface HashLookupParams {
  hash: string;
  forceRefresh?: boolean;
}

export interface IOCEnrichmentParams {
  ioc: string;
  forceRefresh?: boolean;
}

export interface CertificateInspectorParams {
  hostname: string;
  fingerprint?: string;
  forceRefresh?: boolean;
}

export interface HashLookupHistoryEntry {
  hash: string;
  type: HashType;
  timestamp: string;
  verdict: HashVerdict;
  sourcesQueried: HashSource[];
  hasDetections: boolean;
}

export interface IOCEnrichmentHistoryEntry {
  ioc: string;
  type: IOCType;
  timestamp: string;
  sourcesQueried: string[];
  hasDetections: boolean;
}

export interface CertificateInspectorHistoryEntry {
  hostname: string;
  timestamp: string;
  status: CertificateStatus;
  sourcesQueried: CertificateSource[];
}

export function detectHashType(hash: string): HashType | null {
  const clean = hash.trim().toLowerCase().replace(/^(md5|sha1|sha256):/i, "");
  
  if (/^[a-f0-9]{32}$/.test(clean)) return "md5";
  if (/^[a-f0-9]{40}$/.test(clean)) return "sha1";
  if (/^[a-f0-9]{64}$/.test(clean)) return "sha256";
  
  return null;
}

export function detectIOCType(ioc: string): IOCType | null {
  const trimmed = ioc.trim().toLowerCase();
  
  if (/^[a-f0-9]{32}$/.test(trimmed)) return "md5";
  if (/^[a-f0-9]{40}$/.test(trimmed)) return "sha1";
  if (/^[a-f0-9]{64}$/.test(trimmed)) return "sha256";
  
  if (/^https?:\/\//i.test(trimmed)) return "url";
  
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(trimmed)) {
    const octets = trimmed.split(".").map(Number);
    if (octets.every(o => o >= 0 && o <= 255)) return "ipv4";
  }
  
  if (/^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/.test(trimmed) ||
      /^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$/.test(trimmed) ||
      /^([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/.test(trimmed)) {
    return "ipv6";
  }
  
  if (/^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/.test(trimmed)) {
    return "domain";
  }
  
  return null;
}

export function normalizeIOC(ioc: string, type: IOCType): string {
  const trimmed = ioc.trim().toLowerCase();
  
  switch (type) {
    case "md5":
    case "sha1":
    case "sha256":
      return trimmed.replace(/^(md5|sha1|sha256):/i, "");
    case "url":
      try {
        const url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
        return url.toString();
      } catch {
        return trimmed;
      }
    case "domain":
      return trimmed.replace(/^www\./, "");
    case "ipv4":
    case "ipv6":
      return trimmed;
    default:
      return trimmed;
  }
}

export function getVerdictColor(verdict: HashVerdict): string {
  const colors: Record<HashVerdict, string> = {
    malicious: "#ff4444",
    suspicious: "#ffaa00",
    clean: "#00cc66",
    unknown: "#77847e",
    "no-detections": "#00cc66",
  };
  return colors[verdict];
}

export function getVerdictLabel(verdict: HashVerdict): string {
  const labels: Record<HashVerdict, string> = {
    malicious: "Malicious",
    suspicious: "Suspicious",
    clean: "Clean",
    unknown: "Unknown",
    "no-detections": "No Detections",
  };
  return labels[verdict];
}

export function getCertificateStatusColor(status: CertificateStatus): string {
  const colors: Record<CertificateStatus, string> = {
    valid: "#00cc66",
    expired: "#ff4444",
    "expiring-soon": "#ffaa00",
    revoked: "#ff4444",
    unknown: "#77847e",
  };
  return colors[status];
}

export function getCertificateStatusLabel(status: CertificateStatus): string {
  const labels: Record<CertificateStatus, string> = {
    valid: "Valid",
    expired: "Expired",
    "expiring-soon": "Expiring Soon",
    revoked: "Revoked",
    unknown: "Unknown",
  };
  return labels[status];
}

export function calculateCertificateStatus(validUntil: string | null): CertificateStatus {
  if (!validUntil) return "unknown";
  
  try {
    const expiry = new Date(validUntil).getTime();
    const now = Date.now();
    const diffDays = (expiry - now) / (1000 * 60 * 60 * 24);
    
    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "expiring-soon";
    return "valid";
  } catch {
    return "unknown";
  }
}