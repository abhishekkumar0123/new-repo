import {
  IOCEnrichmentResult,
  IOCEnrichmentParams,
  IOCEnrichmentHistoryEntry,
  IOCInvestigatorSourceStatus,
  IOCInvestigatorStatus,
  IOCType,
  HashVerdict,
} from "../types/ioc-investigator";
import { detectIOCType, normalizeIOC } from "../types/ioc-investigator";
import { fetchUrlhausRecent, searchThreatFoxIOC, checkThreatIntelStatus } from "./threat-intel";
import { checkUrlhausAvailability } from "./urlhaus";
import { checkThreatFoxAvailability } from "./threatfox";
import { fetchIPReputation, checkIPReputationSourceStatus } from "./ip-reputation";
import { fetchDomainIntelligence, checkDomainIntelStatus } from "./domain-intelligence";
import { fetchAllUrlReputation, checkUrlAnalyzerStatus } from "./url-reputation";
import { fetchHashLookup, checkHashLookupStatus } from "./hash-lookup";

const IOC_ENRICHMENT_PROXY_URL = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_IOC_ENRICHMENT_PROXY_URL as string | undefined)
  : undefined;

const ENRICHMENT_CACHE_TTL_MS = 60 * 60 * 1000;
let enrichmentCache: Map<string, { data: IOCEnrichmentResult; fetchedAt: number }> = new Map();
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 1000;

function getProxyUrl(): string | undefined {
  return IOC_ENRICHMENT_PROXY_URL;
}

async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function mapVerdict(verdict: string): HashVerdict {
  const v = verdict.toLowerCase();
  if (v === "malicious" || v === "malware") return "malicious";
  if (v === "phishing") return "malicious";
  if (v === "suspicious") return "suspicious";
  if (v === "clean" || v === "harmless" || v === "undetected" || v === "no-detections") return "clean";
  return "unknown";
}

function mapDomainReputation(status: string): HashVerdict {
  const s = status.toLowerCase();
  if (s === "malicious") return "malicious";
  if (s === "suspicious") return "suspicious";
  if (s === "clean" || s === "no-detections") return "clean";
  return "unknown";
}

async function enrichIP(ioc: string, normalized: string): Promise<IOCEnrichmentResult["reputation"]> {
  const results: IOCEnrichmentResult["reputation"] = [];
  const errors: Array<{ source: string; error: string }> = [];

  const ipResult = await fetchIPReputation(normalized).catch((e) => {
    errors.push({ source: "ip-reputation", error: e instanceof Error ? e.message : "Unknown error" });
    return null;
  });

  if (ipResult) {
    const sources = ["abuseipdb", "virustotal", "greynoise", "ipinfo", "otx"];
    for (const source of sources) {
      const data = (ipResult.sources as Record<string, any>)[source];
      if (data) {
        results.push({
          source,
          verdict: mapVerdict(data.classification ?? "unknown"),
          confidence: data.confidence ?? null,
          categories: data.categories ?? [],
          detectionCount: data.maliciousCount ?? null,
          totalVendors: data.totalVendors ?? null,
          lastAnalysisDate: data.lastAnalysisDate ?? null,
          referenceUrl: data.referenceUrl ?? null,
          details: data.rawData ?? {},
        });
      }
    }
  }

  return results;
}

async function enrichDomain(ioc: string, normalized: string): Promise<IOCEnrichmentResult["reputation"]> {
  const results: IOCEnrichmentResult["reputation"] = [];
  const errors: Array<{ source: string; error: string }> = [];

  const domainResult = await fetchDomainIntelligence(normalized).catch((e) => {
    errors.push({ source: "domain-intelligence", error: e instanceof Error ? e.message : "Unknown error" });
    return null;
  });

  if (domainResult) {
    for (const rep of domainResult.reputation) {
      results.push({
        source: rep.source,
        verdict: mapDomainReputation(rep.status),
        confidence: rep.score ?? null,
        categories: rep.categories ?? [],
        detectionCount: rep.detections ?? null,
        totalVendors: rep.totalVendors ?? null,
        lastAnalysisDate: rep.lastAnalysisDate ?? null,
        referenceUrl: rep.referenceUrl ?? null,
        details: rep.details ?? {},
      });
    }
  }

  return results;
}

async function enrichURL(ioc: string, normalized: string): Promise<IOCEnrichmentResult["reputation"]> {
  const results: IOCEnrichmentResult["reputation"] = [];
  const errors: Array<{ source: string; error: string }> = [];

  const urlResults = await fetchAllUrlReputation(normalized).catch((e) => {
    errors.push({ source: "url-reputation", error: e instanceof Error ? e.message : "Unknown error" });
    return [];
  });

  for (const result of urlResults) {
    results.push({
      source: result.source,
      verdict: mapVerdict(result.verdict),
      confidence: result.confidence,
      categories: result.categories,
      detectionCount: result.detectionCount,
      totalVendors: result.totalVendors,
      lastAnalysisDate: result.lastAnalysisDate,
      referenceUrl: result.referenceUrl,
      details: result.rawData ?? {},
    });
  }

  return results;
}

async function enrichHash(ioc: string, normalized: string): Promise<IOCEnrichmentResult["reputation"]> {
  const results: IOCEnrichmentResult["reputation"] = [];
  const errors: Array<{ source: string; error: string }> = [];

  const hashResult = await fetchHashLookup(normalized).catch((e) => {
    errors.push({ source: "hash-lookup", error: e instanceof Error ? e.message : "Unknown error" });
    return null;
  });

  if (hashResult) {
    for (const intel of hashResult.intelligence) {
      results.push({
        source: intel.source,
        verdict: intel.verdict,
        confidence: intel.confidence,
        categories: [],
        detectionCount: null,
        totalVendors: null,
        lastAnalysisDate: intel.lastAnalysisDate,
        referenceUrl: intel.referenceUrl,
        details: intel.details ?? {},
      });
    }
  }

  return results;
}

async function enrichThreatIntel(ioc: string, normalized: string, type: IOCType): Promise<IOCEnrichmentResult["reputation"]> {
  const results: IOCEnrichmentResult["reputation"] = [];
  const errors: Array<{ source: string; error: string }> = [];

  if (type === "url" || type === "domain" || type === "ipv4" || type === "ipv6") {
    const threatFoxResults = await searchThreatFoxIOC({ searchTerm: normalized }).catch((e) => {
      errors.push({ source: "threatfox", error: e instanceof Error ? e.message : "Unknown error" });
      return [];
    });

    for (const iocRecord of threatFoxResults) {
      results.push({
        source: "threatfox",
        verdict: mapVerdict(iocRecord.classification),
        confidence: iocRecord.confidence === "high" ? 90 : iocRecord.confidence === "medium" ? 70 : iocRecord.confidence === "low" ? 50 : null,
        categories: [iocRecord.classification],
        detectionCount: 1,
        totalVendors: 1,
        lastAnalysisDate: iocRecord.lastSeen ?? iocRecord.firstSeen ?? null,
        referenceUrl: iocRecord.referenceUrl ?? null,
        details: {
          malwareFamily: iocRecord.malwareFamily,
          malwareAlias: iocRecord.malwareAlias,
          tags: iocRecord.tags,
          iocType: iocRecord.type,
        },
      });
    }

    const urlhausResults = await fetchUrlhausRecent({ limit: 100 }).catch((e) => {
      errors.push({ source: "urlhaus", error: e instanceof Error ? e.message : "Unknown error" });
      return [];
    });

    const matchedUrlhaus = urlhausResults.filter(r => 
      r.value.toLowerCase().includes(normalized.toLowerCase()) ||
      normalized.toLowerCase().includes(r.value.toLowerCase())
    );

    for (const iocRecord of matchedUrlhaus) {
      results.push({
        source: "urlhaus",
        verdict: mapVerdict(iocRecord.classification),
        confidence: iocRecord.confidence === "high" ? 90 : iocRecord.confidence === "medium" ? 70 : iocRecord.confidence === "low" ? 50 : null,
        categories: [iocRecord.classification],
        detectionCount: 1,
        totalVendors: 1,
        lastAnalysisDate: iocRecord.lastSeen ?? iocRecord.firstSeen ?? null,
        referenceUrl: iocRecord.referenceUrl ?? null,
        details: {
          malwareFamily: iocRecord.malwareFamily,
          malwareAlias: iocRecord.malwareAlias,
          tags: iocRecord.tags,
          iocType: iocRecord.type,
        },
      });
    }
  }

  return results;
}

export async function enrichIOC(ioc: string, forceRefresh = false): Promise<IOCEnrichmentResult | null> {
  const type = detectIOCType(ioc);
  if (!type) return null;

  const normalized = normalizeIOC(ioc, type);
  const cacheKey = `enrich-${type}-${normalized}`;
  const now = Date.now();

  if (!forceRefresh) {
    const cached = enrichmentCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < ENRICHMENT_CACHE_TTL_MS) {
      return { ...cached.data, enrichedAt: new Date().toISOString() };
    }
  }

  const allErrors: Array<{ source: string; error: string }> = [];
  const sourcesQueried: string[] = [];

  let reputation: IOCEnrichmentResult["reputation"] = [];

  switch (type) {
    case "ipv4":
    case "ipv6": {
      sourcesQueried.push("ip-reputation", "threatfox", "urlhaus");
      const [ipRep, tiRep] = await Promise.all([
        enrichIP(ioc, normalized),
        enrichThreatIntel(ioc, normalized, type),
      ]);
      reputation = [...ipRep, ...tiRep];
      break;
    }
    case "domain": {
      sourcesQueried.push("domain-intelligence", "threatfox", "urlhaus");
      const [domainRep, tiRep] = await Promise.all([
        enrichDomain(ioc, normalized),
        enrichThreatIntel(ioc, normalized, type),
      ]);
      reputation = [...domainRep, ...tiRep];
      break;
    }
    case "url": {
      sourcesQueried.push("url-reputation", "threatfox", "urlhaus");
      const [urlRep, tiRep] = await Promise.all([
        enrichURL(ioc, normalized),
        enrichThreatIntel(ioc, normalized, type),
      ]);
      reputation = [...urlRep, ...tiRep];
      break;
    }
    case "md5":
    case "sha1":
    case "sha256": {
      sourcesQueried.push("hash-lookup", "threatfox", "urlhaus");
      const [hashRep, tiRep] = await Promise.all([
        enrichHash(ioc, normalized),
        enrichThreatIntel(ioc, normalized, type),
      ]);
      reputation = [...hashRep, ...tiRep];
      break;
    }
  }

  const relatedIndicators: IOCEnrichmentResult["relatedIndicators"] = [];
  
  const contextLinks: IOCEnrichmentResult["contextLinks"] = {};
  if (type === "ipv4" || type === "ipv6") {
    contextLinks.ipReputation = `/ip-reputation?ip=${encodeURIComponent(normalized)}`;
    contextLinks.threatIntelligence = `/threat-intelligence?ioc=${encodeURIComponent(normalized)}`;
  } else if (type === "domain") {
    contextLinks.domainIntelligence = `/domain-intelligence?domain=${encodeURIComponent(normalized)}`;
    contextLinks.threatIntelligence = `/threat-intelligence?ioc=${encodeURIComponent(normalized)}`;
  } else if (type === "url") {
    contextLinks.urlAnalyzer = `/url-analyzer?url=${encodeURIComponent(normalized)}`;
    contextLinks.threatIntelligence = `/threat-intelligence?ioc=${encodeURIComponent(normalized)}`;
  } else if (type === "md5" || type === "sha1" || type === "sha256") {
    contextLinks.urlAnalyzer = `/hash-lookup?hash=${encodeURIComponent(normalized)}`;
    contextLinks.threatIntelligence = `/threat-intelligence?ioc=${encodeURIComponent(normalized)}`;
  }

  const result: IOCEnrichmentResult = {
    ioc: {
      type,
      value: ioc,
      normalized,
    },
    reputation,
    relatedIndicators,
    contextLinks,
    enrichedAt: new Date().toISOString(),
    sourcesQueried,
    errors: allErrors,
  };

  enrichmentCache.set(cacheKey, { data: result, fetchedAt: now });
  return result;
}

export async function checkIOCEnrichmentStatus(): Promise<IOCInvestigatorStatus> {
  const now = Date.now();
  
  const [ipStatus, domainStatus, urlStatus, hashStatus, threatStatus] = await Promise.all([
    checkIPReputationSourceStatus(),
    checkDomainIntelStatus(),
    checkUrlAnalyzerStatus(),
    checkHashLookupStatus(),
    checkThreatIntelStatus(),
  ]);

  const sources: IOCInvestigatorSourceStatus[] = [
    ...ipStatus.sources.map((s: any) => ({
      source: s.source,
      name: s.name,
      type: s.type,
      available: s.available,
      lastChecked: s.lastChecked,
      error: s.error,
      rateLimited: s.rateLimited,
      requiresConfiguration: s.requiresConfiguration,
      configNote: s.configNote,
    })),
    ...domainStatus.sources.map((s: any) => ({
      source: s.source,
      name: s.name,
      type: s.type,
      available: s.available,
      lastChecked: s.lastChecked,
      error: s.error,
      rateLimited: s.rateLimited,
      requiresConfiguration: s.requiresConfiguration,
      configNote: s.configNote,
    })),
    ...urlStatus.sources.map((s: any) => ({
      source: s.source,
      name: s.name,
      type: s.type,
      available: s.available,
      lastChecked: s.lastChecked,
      error: s.error,
      rateLimited: s.rateLimited,
      requiresConfiguration: s.requiresConfiguration,
      configNote: s.configNote,
    })),
    ...hashStatus.sources.map((s: any) => ({
      source: s.source,
      name: s.name,
      type: s.type,
      available: s.available,
      lastChecked: s.lastChecked,
      error: s.error,
      rateLimited: s.rateLimited,
      requiresConfiguration: s.requiresConfiguration,
      configNote: s.configNote,
    })),
    ...threatStatus.sources.map((s: any) => ({
      source: s.source,
      name: s.name,
      type: s.type,
      available: s.available,
      lastChecked: s.lastChecked,
      error: s.error,
      rateLimited: s.rateLimited,
      requiresConfiguration: s.requiresConfiguration,
      configNote: s.configNote,
    })),
  ];

  return {
    sources,
    lastRefresh: new Date(now).toISOString(),
    overallAvailable: sources.some(s => s.available),
  };
}

export function clearEnrichmentCache(): void {
  enrichmentCache.clear();
}

export function getCachedEnrichment(ioc: string): IOCEnrichmentResult | null {
  const type = detectIOCType(ioc);
  if (!type) return null;
  const normalized = normalizeIOC(ioc, type);
  const cacheKey = `enrich-${type}-${normalized}`;
  const cached = enrichmentCache.get(cacheKey);
  return cached?.data ?? null;
}

export function addToEnrichmentHistory(entry: IOCEnrichmentHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("ioc-enrichment-history") ?? "[]") as IOCEnrichmentHistoryEntry[];
    const filtered = history.filter(h => h.ioc !== entry.ioc);
    const updated = [entry, ...filtered].slice(0, 20);
    localStorage.setItem("ioc-enrichment-history", JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function getEnrichmentHistory(): IOCEnrichmentHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("ioc-enrichment-history") ?? "[]") as IOCEnrichmentHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearEnrichmentHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ioc-enrichment-history");
}

export function exportEnrichmentInvestigation(result: IOCEnrichmentResult): string {
  return JSON.stringify(result, null, 2);
}

export { getProxyUrl };