export type UrlVerdict = "malicious" | "phishing" | "malware" | "suspicious" | "safe" | "unknown" | "unavailable";

export type UrlThreatCategory = 
  | "phishing"
  | "malware_distribution"
  | "botnet_cc"
  | "trojan"
  | "ransomware"
  | "spyware"
  | "spam"
  | "scam"
  | "suspicious"
  | "unknown";

export type UrlSource = 
  | "urlhaus"
  | "virustotal"
  | "phishtank"
  | "openphish"
  | "otx"
  | "heuristic";

export interface UrlHeuristicIndicator {
  id: string;
  name: string;
  description: string;
  severity: "info" | "low" | "medium" | "high" | "critical";
  category: "structure" | "encoding" | "brand" | "redirect" | "suspicious-pattern";
  detected: boolean;
  details?: string;
  value?: string | number | null;
}

export interface UrlStructure {
  original: string;
  normalized: string;
  scheme: string | null;
  username: string | null;
  password: string | null;
  hostname: string | null;
  port: string | null;
  path: string | null;
  query: string | null;
  fragment: string | null;
  rootDomain: string | null;
  subdomain: string | null;
  tld: string | null;
  isIpAddress: boolean;
  encodedComponents: Array<{ component: string; encoded: string; decoded: string }>;
}

export interface UrlRedirectHop {
  url: string;
  statusCode: number | null;
  responseTime: number | null;
  contentType: string | null;
  location: string | null;
  domainChange: boolean;
  isPrivateIp: boolean;
  isLocalhost: boolean;
}

export interface UrlRedirectChain {
  hops: UrlRedirectHop[];
  finalUrl: string | null;
  totalHops: number;
  hasLoop: boolean;
  maxHopsExceeded: boolean;
  error: string | null;
}

export interface UrlThreatResult {
  source: UrlSource;
  name: string;
  verdict: UrlVerdict;
  confidence: number | null;
  categories: UrlThreatCategory[];
  detectionCount: number | null;
  totalVendors: number | null;
  lastAnalysisDate: string | null;
  referenceUrl: string | null;
  rawData: Record<string, unknown> | null;
  isCached: boolean;
  error: string | null;
}

export interface UrlAnalysisResult {
  url: string;
  structure: UrlStructure;
  heuristicIndicators: UrlHeuristicIndicator[];
  heuristicRiskScore: number;
  heuristicVerdict: "clean" | "suspicious" | "high-risk";
  threatResults: UrlThreatResult[];
  redirectChain: UrlRedirectChain | null;
  domainIntel: {
    domain: string | null;
    rootDomain: string | null;
    resolvedIps: string[];
    reputation: Array<{ source: string; verdict: string }>;
  } | null;
  ipReputation: Array<{ ip: string; verdict: string; sources: string[] }> | null;
  scannedAt: string;
  scanDuration: number;
}

export interface UrlAnalyzerSourceStatus {
  source: UrlSource;
  name: string;
  type: string;
  available: boolean;
  lastChecked: string | null;
  error: string | null;
  rateLimited: boolean;
  requiresConfiguration: boolean;
  configNote: string | null;
}

export interface UrlAnalyzerStatus {
  sources: UrlAnalyzerSourceStatus[];
  lastRefresh: string | null;
  overallAvailable: boolean;
}

export interface UrlSearchParams {
  url: string;
  followRedirects?: boolean;
  maxRedirects?: number;
  includeHeuristics?: boolean;
  includeReputation?: boolean;
  includeDomainIntel?: boolean;
  includeIpReputation?: boolean;
}

export interface UrlLookupHistoryEntry {
  url: string;
  normalizedUrl: string;
  timestamp: string;
  heuristicVerdict: "clean" | "suspicious" | "high-risk";
  sourcesQueried: UrlSource[];
  hasDetections: boolean;
}

export function normalizeUrl(input: string): { url: string | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { url: null, error: "Empty input" };

  try {
    let urlString = trimmed;
    
    if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) {
      urlString = `https://${trimmed}`;
    }
    
    const url = new URL(urlString);
    
    if (!["http:", "https:"].includes(url.protocol)) {
      return { url: null, error: "Only HTTP and HTTPS URLs are supported" };
    }
    
    if (url.hostname === "") {
      return { url: null, error: "Invalid hostname" };
    }
    
    return { url: url.toString(), error: null };
  } catch {
    return { url: null, error: "Invalid URL format" };
  }
}

export function parseUrlStructure(urlString: string): UrlStructure {
  try {
    const url = new URL(urlString);
    const hostname = url.hostname.toLowerCase();
    
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}$|^\[?([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\]?$/.test(hostname.replace(/^\[|\]$/g, ""));
    
    let rootDomain: string | null = null;
    let subdomain: string | null = null;
    let tld: string | null = null;
    
    if (!isIpAddress) {
      const parts = hostname.split(".");
      if (parts.length >= 2) {
        tld = parts[parts.length - 1];
        rootDomain = parts.slice(-2).join(".");
        if (parts.length > 2) {
          subdomain = parts.slice(0, -2).join(".");
        }
      }
    }
    
    const encodedComponents: UrlStructure["encodedComponents"] = [];
    const checkEncoded = (component: string, value: string) => {
      const encodedMatches = value.match(/%[0-9A-Fa-f]{2}/g);
      if (encodedMatches) {
        encodedMatches.forEach((encoded) => {
          try {
            encodedComponents.push({
              component,
              encoded,
              decoded: decodeURIComponent(encoded),
            });
          } catch {
            encodedComponents.push({
              component,
              encoded,
              decoded: "(decode failed)",
            });
          }
        });
      }
    };
    
    checkEncoded("path", url.pathname);
    checkEncoded("query", url.search);
    checkEncoded("fragment", url.hash);
    if (url.username) checkEncoded("username", url.username);
    if (url.password) checkEncoded("password", url.password);
    
    return {
      original: urlString,
      normalized: url.toString(),
      scheme: url.protocol.replace(":", ""),
      username: url.username || null,
      password: url.password || null,
      hostname,
      port: url.port || null,
      path: url.pathname || null,
      query: url.search || null,
      fragment: url.hash || null,
      rootDomain,
      subdomain,
      tld,
      isIpAddress,
      encodedComponents,
    };
  } catch {
    return {
      original: urlString,
      normalized: urlString,
      scheme: null,
      username: null,
      password: null,
      hostname: null,
      port: null,
      path: null,
      query: null,
      fragment: null,
      rootDomain: null,
      subdomain: null,
      tld: null,
      isIpAddress: false,
      encodedComponents: [],
    };
  }
}

export function getVerdictColor(verdict: UrlVerdict): string {
  const colors: Record<UrlVerdict, string> = {
    malicious: "#ff4444",
    phishing: "#ff8800",
    malware: "#cc0000",
    suspicious: "#ffaa00",
    safe: "#00cc66",
    unknown: "#77847e",
    unavailable: "#77847e",
  };
  return colors[verdict];
}

export function getVerdictLabel(verdict: UrlVerdict): string {
  const labels: Record<UrlVerdict, string> = {
    malicious: "Malicious",
    phishing: "Phishing",
    malware: "Malware",
    suspicious: "Suspicious",
    safe: "Safe / No Detections",
    unknown: "Unknown",
    unavailable: "Unavailable",
  };
  return labels[verdict];
}

export function getCategoryColor(category: UrlThreatCategory): string {
  const colors: Record<UrlThreatCategory, string> = {
    phishing: "#ff8800",
    malware_distribution: "#cc0000",
    botnet_cc: "#ff4444",
    trojan: "#ff6600",
    ransomware: "#aa0000",
    spyware: "#cc4400",
    spam: "#ffaa00",
    scam: "#ff8800",
    suspicious: "#ffaa00",
    unknown: "#77847e",
  };
  return colors[category];
}

export function getCategoryLabel(category: UrlThreatCategory): string {
  const labels: Record<UrlThreatCategory, string> = {
    phishing: "Phishing",
    malware_distribution: "Malware Distribution",
    botnet_cc: "Botnet C2",
    trojan: "Trojan",
    ransomware: "Ransomware",
    spyware: "Spyware",
    spam: "Spam",
    scam: "Scam/Fraud",
    suspicious: "Suspicious",
    unknown: "Unknown",
  };
  return labels[category];
}