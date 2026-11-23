import {
  IPReputationResult,
  IPReputationSourceStatus,
  IPReputationStatus,
  IPLookupParams,
  IPLookupHistoryEntry,
  IPVersion,
  IPClassification,
  RiskLevel,
  IPGeolocation,
  IPNetworkInfo,
  AbuseIPDBData,
  VirusTotalData,
  GreyNoiseData,
  IPinfoData,
  OTXData,
  IPReputationSource,
} from "../types/ip-reputation";
import { escapeHtml } from "../utils/normalize";

const IP_REPUTATION_PROXY_URL = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_IP_REPUTATION_PROXY_URL as string | undefined)
  : undefined;

const IP_REPUTATION_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

let ipReputationCache: Map<string, { data: IPReputationResult; fetchedAt: number }> = new Map();
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 1000;

function getProxyUrl(): string | undefined {
  return IP_REPUTATION_PROXY_URL;
}

async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export function validateIP(ip: string): { valid: boolean; version: IPVersion; classification: IPClassification } {
  const trimmed = ip.trim();
  
  // IPv4 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(trimmed)) {
    const octets = trimmed.split(".").map(Number);
    const valid = octets.every(o => o >= 0 && o <= 255);
    if (!valid) return { valid: false, version: "ipv4", classification: "public" };
    
    // Check private ranges
    const [o1, o2] = octets;
    if (o1 === 10) return { valid: true, version: "ipv4", classification: "private" };
    if (o1 === 172 && o2 >= 16 && o2 <= 31) return { valid: true, version: "ipv4", classification: "private" };
    if (o1 === 192 && o2 === 168) return { valid: true, version: "ipv4", classification: "private" };
    if (o1 === 127) return { valid: true, version: "ipv4", classification: "loopback" };
    if (o1 === 169 && o2 === 254) return { valid: true, version: "ipv4", classification: "link-local" };
    if (o1 === 0) return { valid: true, version: "ipv4", classification: "reserved" };
    if (o1 >= 224 && o1 <= 239) return { valid: true, version: "ipv4", classification: "multicast" };
    if (o1 >= 240) return { valid: true, version: "ipv4", classification: "reserved" };
    
    return { valid: true, version: "ipv4", classification: "public" };
  }
  
  // IPv6 validation (simplified)
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
  if (ipv6Regex.test(trimmed) || trimmed.includes("::")) {
    if (trimmed === "::1") return { valid: true, version: "ipv6", classification: "loopback" };
    if (trimmed.startsWith("fe80:")) return { valid: true, version: "ipv6", classification: "link-local" };
    if (trimmed.startsWith("fc00:") || trimmed.startsWith("fd00:")) return { valid: true, version: "ipv6", classification: "private" };
    if (trimmed.startsWith("ff")) return { valid: true, version: "ipv6", classification: "multicast" };
    return { valid: true, version: "ipv6", classification: "public" };
  }
  
  return { valid: false, version: "ipv4", classification: "public" };
}

function calculateRiskLevel(abuseScore: number | null, vtMalicious: number | null, gnNoise: boolean | null): { level: RiskLevel; score: number } {
  let score = 0;
  let factors = 0;
  
  if (abuseScore !== null) {
    score += abuseScore;
    factors++;
  }
  
  if (vtMalicious !== null) {
    score += Math.min(vtMalicious * 10, 100);
    factors++;
  }
  
  if (gnNoise === true) {
    score += 75;
    factors++;
  } else if (gnNoise === false) {
    score += 10;
    factors++;
  }
  
  const avgScore = factors > 0 ? score / factors : 0;
  
  let level: RiskLevel = "unknown";
  if (avgScore >= 75) level = "critical";
  else if (avgScore >= 50) level = "high";
  else if (avgScore >= 25) level = "medium";
  else if (avgScore >= 10) level = "low";
  else level = "clean";
  
  return { level, score: Math.round(avgScore) };
}

async function fetchFromProxy<T>(source: string, ip: string, params?: Record<string, unknown>): Promise<T | null> {
  const proxyUrl = getProxyUrl();
  
  if (!proxyUrl) {
    return null;
  }
  
  try {
    await throttleRequest();
    
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
      body: JSON.stringify({ source, ip, params }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json() as T;
  } catch {
    return null;
  }
}

function parseAbuseIPDBResponse(data: unknown): AbuseIPDBData | null {
  try {
    const d = data as { data?: Record<string, unknown> };
    if (!d.data) return null;
    
    const ipData = d.data;
    return {
      abuseConfidenceScore: Number(ipData.abuseConfidenceScore ?? 0),
      totalReports: Number(ipData.totalReports ?? 0),
      isWhitelisted: Boolean(ipData.isWhitelisted ?? false),
      lastReportedAt: (ipData.lastReportedAt as string) ?? null,
      reports: (ipData.reports as Array<Record<string, unknown>> ?? []).map(r => ({
        reportedAt: (r.reportedAt as string) ?? "",
        comment: (r.comment as string) ?? null,
        categories: (r.categories as number[]) ?? [],
        reporterId: (r.reporterId as number) ?? null,
        reporterCountry: (r.reporterCountry as string) ?? null,
      })),
      countryCode: (ipData.countryCode as string) ?? null,
      countryName: (ipData.countryName as string) ?? null,
      usageType: (ipData.usageType as string) ?? null,
      isp: (ipData.isp as string) ?? null,
      domain: (ipData.domain as string) ?? null,
      hostnames: (ipData.hostnames as string[]) ?? [],
      isTor: Boolean(ipData.isTor ?? false),
    };
  } catch {
    return null;
  }
}

function parseVirusTotalResponse(data: unknown): VirusTotalData | null {
  try {
    const d = data as { data?: { attributes?: Record<string, unknown> } };
    if (!d.data?.attributes) return null;
    
    const attrs = d.data.attributes;
    const stats = attrs.last_analysis_stats as Record<string, number> | undefined;
    const results = attrs.last_analysis_results as Record<string, { category: string; result: string | null; method: string; engineName: string }> | undefined;
    
    return {
      lastAnalysisStats: {
        malicious: Number(stats?.malicious ?? 0),
        suspicious: Number(stats?.suspicious ?? 0),
        undetected: Number(stats?.undetected ?? 0),
        harmless: Number(stats?.harmless ?? 0),
        timeout: Number(stats?.timeout ?? 0),
      },
      lastAnalysisResults: results ?? {},
      reputation: Number(attrs.reputation ?? 0),
      country: (attrs.country as string) ?? null,
      asn: (attrs.asn as string) ?? null,
      asnName: (attrs.as_owner as string) ?? null,
      network: (attrs.network as string) ?? null,
      tags: (attrs.tags as string[]) ?? [],
      whois: (attrs.whois as string) ?? null,
      lastModificationDate: Number(attrs.last_modification_date ?? 0),
    };
  } catch {
    return null;
  }
}

function parseGreyNoiseResponse(data: unknown): GreyNoiseData | null {
  try {
    const d = data as Record<string, unknown>;
    return {
      noise: Boolean(d.noise ?? false),
      riot: Boolean(d.riot ?? false),
      classification: (d.classification as "malicious" | "benign" | "unknown" | "suspicious") ?? "unknown",
      name: (d.name as string) ?? null,
      link: (d.link as string) ?? null,
      lastSeen: (d.last_seen as string) ?? null,
      message: (d.message as string) ?? "",
      metadata: {
        asn: null,
        asnName: null,
        country: null,
        city: null,
        region: null,
        organization: null,
        rdns: null,
        tor: false,
        vpn: false,
        proxy: false,
        tags: [],
      },
    };
  } catch {
    return null;
  }
}

function parseIPinfoResponse(data: unknown): IPinfoData | null {
  try {
    const d = data as Record<string, unknown>;
    return {
      ip: (d.ip as string) ?? "",
      asn: (d.asn as string) ?? null,
      asnName: (d.as_name as string) ?? null,
      asnDomain: (d.as_domain as string) ?? null,
      countryCode: (d.country_code as string) ?? null,
      country: (d.country as string) ?? null,
      continentCode: (d.continent_code as string) ?? null,
      continent: (d.continent as string) ?? null,
      region: null,
      regionCode: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      postalCode: null,
      isHosting: null,
      isAnycast: null,
      isMobile: null,
      isSatellite: null,
      isAnonymous: null,
      carrier: null,
      privacy: {
        vpn: false,
        proxy: false,
        tor: false,
        relay: false,
        hosting: false,
      },
    };
  } catch {
    return null;
  }
}

function parseOTXResponse(data: unknown): OTXData | null {
  try {
    const d = data as Record<string, unknown>;
    const pulseInfo = d.pulse_info as Record<string, unknown> | undefined;
    const geo = d.geo as Record<string, unknown> | undefined;
    
    return {
      pulseCount: Number(pulseInfo?.count ?? 0),
      relatedPulses: (pulseInfo?.pulses as Array<Record<string, unknown>> ?? []).map(p => ({
        id: (p.id as string) ?? "",
        name: (p.name as string) ?? "",
        description: (p.description as string) ?? "",
        tags: (p.tags as string[]) ?? [],
        created: (p.created as string) ?? "",
        modified: (p.modified as string) ?? "",
        indicators: (p.indicators as Array<{ type: string; value: string }>) ?? [],
      })),
      passiveDns: (d.passive_dns as Array<Record<string, unknown>> ?? []).map(p => ({
        hostname: (p.hostname as string) ?? "",
        address: (p.address as string) ?? "",
        type: (p.type as string) ?? "",
        firstSeen: (p.first_seen as string) ?? "",
        lastSeen: (p.last_seen as string) ?? "",
      })),
      malwareFamilies: (d.malware_families as string[]) ?? [],
      industries: (d.industries as string[]) ?? [],
      tags: (d.tags as string[]) ?? [],
      geo: {
        country: (geo?.country_name as string) ?? null,
        city: (geo?.city as string) ?? null,
        region: (geo?.region as string) ?? null,
      },
    };
  } catch {
    return null;
  }
}

function buildGeolocation(
  abuse: AbuseIPDBData | null,
  vt: VirusTotalData | null,
  gn: GreyNoiseData | null,
  ipinfo: IPinfoData | null,
  otx: OTXData | null,
): IPGeolocation {
  // Priority: IPinfo > VirusTotal > AbuseIPDB > OTX > GreyNoise
  if (ipinfo) {
    return {
      country: ipinfo.country,
      countryCode: ipinfo.countryCode,
      continent: ipinfo.continent,
      continentCode: ipinfo.continentCode,
      region: ipinfo.region,
      regionCode: ipinfo.regionCode,
      city: ipinfo.city,
      latitude: ipinfo.latitude,
      longitude: ipinfo.longitude,
      timezone: ipinfo.timezone,
      postalCode: ipinfo.postalCode,
      isEU: ipinfo.countryCode ? ["AT", "BE", "BG", "HR", "CY", "CZ", "DK", "EE", "FI", "FR", "DE", "GR", "HU", "IE", "IT", "LV", "LT", "LU", "MT", "NL", "PL", "PT", "RO", "SK", "SI", "ES", "SE"].includes(ipinfo.countryCode) : null,
    };
  }
  
  if (vt) {
    return {
      country: vt.country,
      countryCode: vt.country,
      continent: null,
      continentCode: null,
      region: null,
      regionCode: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      postalCode: null,
      isEU: null,
    };
  }
  
  if (abuse) {
    return {
      country: abuse.countryName,
      countryCode: abuse.countryCode,
      continent: null,
      continentCode: null,
      region: null,
      regionCode: null,
      city: null,
      latitude: null,
      longitude: null,
      timezone: null,
      postalCode: null,
      isEU: null,
    };
  }
  
  if (otx?.geo) {
    return {
      country: otx.geo.country,
      countryCode: null,
      continent: null,
      continentCode: null,
      region: otx.geo.region,
      regionCode: null,
      city: otx.geo.city,
      latitude: null,
      longitude: null,
      timezone: null,
      postalCode: null,
      isEU: null,
    };
  }
  
  if (gn?.metadata) {
    return {
      country: gn.metadata.country,
      countryCode: null,
      continent: null,
      continentCode: null,
      region: gn.metadata.region,
      regionCode: null,
      city: gn.metadata.city,
      latitude: null,
      longitude: null,
      timezone: null,
      postalCode: null,
      isEU: null,
    };
  }
  
  return {
    country: null,
    countryCode: null,
    continent: null,
    continentCode: null,
    region: null,
    regionCode: null,
    city: null,
    latitude: null,
    longitude: null,
    timezone: null,
    postalCode: null,
    isEU: null,
  };
}

function buildNetworkInfo(
  abuse: AbuseIPDBData | null,
  vt: VirusTotalData | null,
  gn: GreyNoiseData | null,
  ipinfo: IPinfoData | null,
): IPNetworkInfo {
  if (ipinfo) {
    return {
      asn: ipinfo.asn,
      asnName: ipinfo.asnName,
      asnDomain: ipinfo.asnDomain,
      asnType: null,
      isp: null,
      org: ipinfo.asnName,
      networkRange: null,
      isHosting: ipinfo.isHosting,
      isAnycast: ipinfo.isAnycast,
      isMobile: ipinfo.isMobile,
      isSatellite: ipinfo.isSatellite,
      isAnonymous: ipinfo.isAnonymous,
      connectionType: null,
      reverseDns: null,
      hostname: null,
    };
  }
  
  if (vt) {
    return {
      asn: vt.asn,
      asnName: vt.asnName,
      asnDomain: null,
      asnType: null,
      isp: null,
      org: vt.asnName,
      networkRange: vt.network,
      isHosting: null,
      isAnycast: null,
      isMobile: null,
      isSatellite: null,
      isAnonymous: null,
      connectionType: null,
      reverseDns: null,
      hostname: null,
    };
  }
  
  if (abuse) {
    return {
      asn: null,
      asnName: null,
      asnDomain: abuse.domain,
      asnType: abuse.usageType,
      isp: abuse.isp,
      org: abuse.isp,
      networkRange: null,
      isHosting: null,
      isAnycast: null,
      isMobile: null,
      isSatellite: null,
      isAnonymous: null,
      connectionType: null,
      reverseDns: null,
      hostname: abuse.hostnames[0] ?? null,
    };
  }
  
  if (gn?.metadata) {
    return {
      asn: gn.metadata.asn,
      asnName: gn.metadata.asnName,
      asnDomain: null,
      asnType: null,
      isp: null,
      org: gn.metadata.organization,
      networkRange: null,
      isHosting: null,
      isAnycast: null,
      isMobile: null,
      isSatellite: null,
      isAnonymous: null,
      connectionType: null,
      reverseDns: gn.metadata.rdns,
      hostname: null,
    };
  }
  
  return {
    asn: null,
    asnName: null,
    asnDomain: null,
    asnType: null,
    isp: null,
    org: null,
    networkRange: null,
    isHosting: null,
    isAnycast: null,
    isMobile: null,
    isSatellite: null,
    isAnonymous: null,
    connectionType: null,
    reverseDns: null,
    hostname: null,
  };
}

export async function fetchIPReputation(ip: string, params?: IPLookupParams): Promise<IPReputationResult | null> {
  const validation = validateIP(ip);
  if (!validation.valid) return null;
  
  const cacheKey = `ip-rep-${ip}-${params?.maxAgeInDays ?? 30}`;
  const now = Date.now();
  
  const cached = ipReputationCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < IP_REPUTATION_CACHE_TTL_MS) {
    return cached.data;
  }
  
  const [abuseData, vtData, gnData, ipinfoData, otxData] = await Promise.all([
    fetchFromProxy<Record<string, unknown>>("abuseipdb", ip, { maxAgeInDays: params?.maxAgeInDays ?? 30, verbose: params?.verbose ?? false }),
    fetchFromProxy<Record<string, unknown>>("virustotal", ip),
    fetchFromProxy<Record<string, unknown>>("greynoise", ip),
    fetchFromProxy<Record<string, unknown>>("ipinfo", ip),
    fetchFromProxy<Record<string, unknown>>("otx", ip),
  ]);
  
  const abuse = parseAbuseIPDBResponse(abuseData);
  const vt = parseVirusTotalResponse(vtData);
  const gn = parseGreyNoiseResponse(gnData);
  const ipinfo = parseIPinfoResponse(ipinfoData);
  const otx = parseOTXResponse(otxData);
  
  const geolocation = buildGeolocation(abuse, vt, gn, ipinfo, otx);
  const network = buildNetworkInfo(abuse, vt, gn, ipinfo);
  const { level, score } = calculateRiskLevel(
    abuse?.abuseConfidenceScore ?? null,
    vt?.lastAnalysisStats.malicious ?? null,
    gn?.noise ?? null,
  );
  
  const result: IPReputationResult = {
    ip,
    version: validation.version,
    classification: validation.classification,
    geolocation,
    network,
    sources: {
      abuseipdb: abuse,
      virustotal: vt,
      greynoise: gn,
      ipinfo: ipinfo,
      otx: otx,
    },
    overallRisk: level,
    riskScore: score,
    lastUpdated: new Date().toISOString(),
  };
  
  ipReputationCache.set(cacheKey, { data: result, fetchedAt: now });
  return result;
}

export async function checkIPReputationSourceStatus(): Promise<IPReputationStatus> {
  const proxyUrl = getProxyUrl();
  const testIP = "8.8.8.8";
  
  const sources: IPReputationSourceStatus[] = [
    {
      source: "abuseipdb",
      name: "AbuseIPDB",
      type: "IP Reputation & Abuse Reports",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure ABUSEIPDB_API_KEY in Supabase Edge Function" : null,
    },
    {
      source: "virustotal",
      name: "VirusTotal",
      type: "IP Reputation & Malware Analysis",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure VIRUSTOTAL_API_KEY in Supabase Edge Function" : null,
    },
    {
      source: "greynoise",
      name: "GreyNoise Community",
      type: "Internet Scanner & Benign Service Classification",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure GREYNOISE_API_KEY in Supabase Edge Function" : null,
    },
    {
      source: "ipinfo",
      name: "IPinfo Lite",
      type: "IP Geolocation, ASN & Network Intelligence",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure IPINFO_API_KEY in Supabase Edge Function" : null,
    },
    {
      source: "otx",
      name: "AlienVault OTX",
      type: "Threat Intelligence & Pulse Data",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure OTX_API_KEY in Supabase Edge Function" : null,
    },
  ];
  
  if (!proxyUrl) {
    return {
      sources,
      lastRefresh: new Date().toISOString(),
      overallAvailable: false,
    };
  }
  
  const results = await Promise.all(
    sources.map(async (source) => {
      const now = Date.now();
      try {
        await throttleRequest();
        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
          },
          body: JSON.stringify({ source: source.source, ip: testIP }),
        });
        
        if (response.status === 401 || response.status === 403) {
          return {
            ...source,
            available: false,
            lastFetched: new Date(now).toISOString(),
            error: "Authentication required",
            rateLimited: false,
            requiresConfiguration: true,
            configNote: "API key invalid or missing in Supabase Edge Function",
          };
        }
        
        if (response.status === 429) {
          return {
            ...source,
            available: false,
            lastFetched: new Date(now).toISOString(),
            error: "Rate limited",
            rateLimited: true,
            requiresConfiguration: false,
            configNote: null,
          };
        }
        
        return {
          ...source,
          available: response.ok,
          lastFetched: new Date(now).toISOString(),
          error: response.ok ? null : `HTTP ${response.status}`,
          rateLimited: false,
          requiresConfiguration: false,
          configNote: null,
        };
      } catch (error) {
        return {
          ...source,
          available: false,
          lastFetched: null,
          error: error instanceof Error ? error.message : "Unknown error",
          rateLimited: false,
          requiresConfiguration: false,
          configNote: null,
        };
      }
    })
  );
  
  return {
    sources: results,
    lastRefresh: new Date().toISOString(),
    overallAvailable: results.some(s => s.available),
  };
}

export function clearIPReputationCache(): void {
  ipReputationCache.clear();
}

export function getCachedIPReputation(ip: string): IPReputationResult | null {
  const cacheKey = `ip-rep-${ip}-30`;
  const cached = ipReputationCache.get(cacheKey);
  return cached?.data ?? null;
}

export function addToHistory(entry: IPLookupHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("ip-reputation-history") ?? "[]") as IPLookupHistoryEntry[];
    const filtered = history.filter(h => h.ip !== entry.ip);
    const updated = [entry, ...filtered].slice(0, 10);
    localStorage.setItem("ip-reputation-history", JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function getHistory(): IPLookupHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("ip-reputation-history") ?? "[]") as IPLookupHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("ip-reputation-history");
}

export function exportInvestigation(result: IPReputationResult): string {
  return JSON.stringify(result, null, 2);
}

export function getSourceLabel(source: IPReputationSource): string {
  const labels: Record<IPReputationSource, string> = {
    abuseipdb: "AbuseIPDB",
    virustotal: "VirusTotal",
    greynoise: "GreyNoise",
    ipinfo: "IPinfo",
    otx: "AlienVault OTX",
  };
  return labels[source];
}

export function getRiskColor(risk: RiskLevel): string {
  const colors: Record<RiskLevel, string> = {
    clean: "#00ff91",
    low: "#58d7f7",
    medium: "#ffca8a",
    high: "#fb8500",
    critical: "#ff7b72",
    unknown: "#77847e",
  };
  return colors[risk];
}

export function getRiskLabel(risk: RiskLevel): string {
  const labels: Record<RiskLevel, string> = {
    clean: "Clean",
    low: "Low Risk",
    medium: "Medium Risk",
    high: "High Risk",
    critical: "Critical Risk",
    unknown: "Unknown",
  };
  return labels[risk];
}

export function getClassificationColor(classification: IPClassification): string {
  const colors: Record<IPClassification, string> = {
    public: "#58d7f7",
    private: "#00ff91",
    reserved: "#77847e",
    loopback: "#bb86fc",
    multicast: "#ffca8a",
    "link-local": "#ff7b72",
  };
  return colors[classification];
}

export function getClassificationLabel(classification: IPClassification): string {
  const labels: Record<IPClassification, string> = {
    public: "Public",
    private: "Private",
    reserved: "Reserved",
    loopback: "Loopback",
    multicast: "Multicast",
    "link-local": "Link-Local",
  };
  return labels[classification];
}