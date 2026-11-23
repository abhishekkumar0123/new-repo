import {
  fetchDnsRecords,
  fetchAllDnsRecords,
  checkDnsAvailability,
  clearDnsCache,
  getCachedDnsRecords,
} from "./dns";
import {
  fetchRdapDomain,
  checkRdapAvailability,
  clearRdapCache,
  getCachedRdapDomain,
  parseRdapForIntel,
} from "./rdap";
import {
  fetchCtCertificates,
  checkCtAvailability,
  clearCtCache,
  getCachedCtCertificates,
  processCertificatesForIntel,
} from "./certificate-transparency";
import {
  fetchIPReputation,
  checkIPReputationSourceStatus,
} from "./ip-reputation";
import {
  checkThreatIntelStatus,
  fetchAllThreatIntel,
  getProxyUrl as getThreatIntelProxyUrl,
} from "./threat-intel";
import type {
  DomainIntelligenceResult,
  DomainIntelSourceStatus,
  DomainIntelStatus,
  DomainSearchParams,
  DomainLookupHistoryEntry,
  DomainRecordType,
  DnsRecord,
} from "../types/domain-intelligence";
import type { IPReputationResult } from "../types/ip-reputation";
import type { IOCRecord } from "../types/ioc";
import { extractDomain, getRootDomain, getSubdomain, getTld, formatDomainAge } from "../types/domain-intelligence";

const DOMAIN_INTEL_PROXY_URL = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_DOMAIN_INTEL_PROXY_URL as string | undefined)
  : undefined;

const DOMAIN_INTEL_CACHE_TTL_MS = 30 * 60 * 1000;

let domainIntelCache: Map<string, { data: DomainIntelligenceResult; fetchedAt: number }> = new Map();
let domainHistory: DomainLookupHistoryEntry[] = [];

if (typeof window !== "undefined") {
  try {
    const stored = localStorage.getItem("domain-intel-history");
    if (stored) domainHistory = JSON.parse(stored);
  } catch {
    domainHistory = [];
  }
}

function getProxyUrl(): string | undefined {
  return DOMAIN_INTEL_PROXY_URL;
}

async function fetchDomainReputation(domain: string, proxyUrl: string | undefined): Promise<Array<{ source: string; status: string; details: Record<string, unknown> }>> {
  const results: Array<{ source: string; status: string; details: Record<string, unknown> }> = [];
  
  try {
    const threatIntelStatus = await checkThreatIntelStatus();
    for (const source of threatIntelStatus.sources) {
      if (source.available) {
        results.push({
          source: source.source,
          status: source.rateLimited ? "rate-limited" : "available",
          details: { name: source.name, type: source.type },
        });
      }
    }
  } catch {
    // Ignore
  }
  
  return results;
}

async function fetchHostingInfo(resolvedIps: { ipv4: string[]; ipv6: string[] }): Promise<DomainIntelligenceResult["hosting"]> {
  const allIps = [...resolvedIps.ipv4, ...resolvedIps.ipv6];
  if (allIps.length === 0) {
    return {
      provider: null,
      asn: null,
      asnName: null,
      country: null,
      region: null,
      city: null,
      isHosting: null,
      isCdn: null,
      cdnProvider: null,
      cloudProvider: null,
      reverseDns: null,
      technologies: [],
    };
  }
  
  const firstIp = allIps[0];
  try {
    const ipRep = await fetchIPReputation(firstIp);
    if (!ipRep) {
      return {
        provider: null,
        asn: null,
        asnName: null,
        country: null,
        region: null,
        city: null,
        isHosting: null,
        isCdn: null,
        cdnProvider: null,
        cloudProvider: null,
        reverseDns: null,
        technologies: [],
      };
    }
    
    const cdnProviders = ["cloudflare", "akamai", "fastly", "cloudfront", "azure", "google", "aws"];
    let cdnProvider: string | null = null;
    let cloudProvider: string | null = null;
    
    const org = ipRep.network.org?.toLowerCase() ?? "";
    const asnName = ipRep.network.asnName?.toLowerCase() ?? "";
    const isp = ipRep.network.isp?.toLowerCase() ?? "";
    
    for (const cdn of cdnProviders) {
      if (org.includes(cdn) || asnName.includes(cdn) || isp.includes(cdn)) {
        cdnProvider = cdn.charAt(0).toUpperCase() + cdn.slice(1);
        break;
      }
    }
    
    if (org.includes("amazon") || asnName.includes("amazon") || org.includes("aws")) cloudProvider = "AWS";
    else if (org.includes("google") || asnName.includes("google")) cloudProvider = "Google Cloud";
    else if (org.includes("microsoft") || asnName.includes("azure") || org.includes("azure")) cloudProvider = "Azure";
    else if (org.includes("digitalocean")) cloudProvider = "DigitalOcean";
    else if (org.includes("linode") || asnName.includes("linode")) cloudProvider = "Linode";
    else if (org.includes("vultr")) cloudProvider = "Vultr";
    else if (org.includes("hetzner")) cloudProvider = "Hetzner";
    else if (org.includes("ovh")) cloudProvider = "OVH";
    
    return {
      provider: ipRep.network.isp ?? ipRep.network.org ?? null,
      asn: ipRep.network.asn ?? null,
      asnName: ipRep.network.asnName ?? null,
      country: ipRep.geolocation.country,
      region: ipRep.geolocation.region,
      city: ipRep.geolocation.city,
      isHosting: ipRep.network.isHosting,
      isCdn: !!cdnProvider,
      cdnProvider,
      cloudProvider,
      reverseDns: ipRep.network.reverseDns,
      technologies: [],
    };
  } catch {
    return {
      provider: null,
      asn: null,
      asnName: null,
      country: null,
      region: null,
      city: null,
      isHosting: null,
      isCdn: null,
      cdnProvider: null,
      cloudProvider: null,
      reverseDns: null,
      technologies: [],
    };
  }
}

export async function fetchDomainIntelligence(domain: string): Promise<DomainIntelligenceResult | null> {
  const cacheKey = `domain-intel-${domain}`;
  const now = Date.now();
  
  const cached = domainIntelCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < DOMAIN_INTEL_CACHE_TTL_MS) {
    return cached.data;
  }
  
  const extraction = extractDomain(domain);
  if (extraction.error || !extraction.domain) {
    return null;
  }
  
  const cleanDomain = extraction.domain;
  const rootDomain = getRootDomain(cleanDomain);
  const subdomain = getSubdomain(cleanDomain, rootDomain);
  const tld = getTld(cleanDomain);
  
  const proxyUrl = getProxyUrl();
  const threatIntelProxyUrl = getThreatIntelProxyUrl();
  
  try {
    // Fetch DNS records first since we need them for IP reputation lookups
    const dnsRecords = await fetchAllDnsRecords(cleanDomain);
    
    const resolvedIps = {
      ipv4: dnsRecords.A.map((r) => r.value),
      ipv6: dnsRecords.AAAA.map((r) => r.value),
    };
    
    // Fetch other data in parallel
    const [
      rdapDomain,
      certificates,
      ipReputationResults,
    ] = await Promise.all([
      fetchRdapDomain(rootDomain),
      fetchCtCertificates(rootDomain, true),
      (async () => {
        const results: Record<string, IPReputationResult | null> = {};
        const allIps = [...resolvedIps.ipv4, ...resolvedIps.ipv6];
        const uniqueIps = [...new Set(allIps)];
        for (const ip of uniqueIps.slice(0, 3)) {
          try {
            results[ip] = await fetchIPReputation(ip);
          } catch {
            results[ip] = null;
          }
        }
        return results;
      })(),
    ]);
    
    const hosting = await fetchHostingInfo(resolvedIps);
    
    const rdapIntel = rdapDomain ? parseRdapForIntel(rdapDomain) : {
      registrar: { name: null, ianaId: null, url: null, abuseEmail: null, abusePhone: null },
      registrant: { name: null, organization: null, email: null, country: null, state: null, city: null, isPrivate: false },
      timestamps: { registrationDate: null, updatedDate: null, expirationDate: null },
      nameservers: [],
      status: [],
      dnssec: null,
    };
    
    const certIntel = processCertificatesForIntel(certificates);
    
    const domainAge = rdapIntel.timestamps.registrationDate 
      ? formatDomainAge(rdapIntel.timestamps.registrationDate) 
      : null;
    
    const result: DomainIntelligenceResult = {
      domain: cleanDomain,
      rootDomain,
      subdomain,
      tld,
      isIpAddress: false,
      resolvedIps,
      dnsRecords,
      rdap: rdapDomain,
      certificates,
      reputation: [],
      hosting,
      security: {
        dnssec: rdapIntel.dnssec,
        https: false,
        hsts: null,
        csp: null,
        securityHeaders: {},
      },
      timestamps: {
        registrationDate: rdapIntel.timestamps.registrationDate,
        updatedDate: rdapIntel.timestamps.updatedDate,
        expirationDate: rdapIntel.timestamps.expirationDate,
        domainAge,
        firstSeen: certIntel.earliestNotBefore,
        lastSeen: certIntel.latestNotAfter,
      },
      registrar: rdapIntel.registrar,
      registrant: rdapIntel.registrant,
      nameservers: rdapIntel.nameservers,
      fetchedAt: new Date().toISOString(),
    };
    
    domainIntelCache.set(cacheKey, { data: result, fetchedAt: now });
    return result;
  } catch {
    return null;
  }
}

export async function checkDomainIntelStatus(): Promise<DomainIntelStatus> {
  const now = Date.now();
  const [dns, rdap, ct, ipRep, threatIntel] = await Promise.all([
    checkDnsAvailability(),
    checkRdapAvailability(),
    checkCtAvailability(),
    checkIPReputationSourceStatus(),
    checkThreatIntelStatus(),
  ]);
  
  const threatIntelSources = threatIntel.sources.map((s) => ({
    source: s.source as DomainIntelSourceStatus["source"],
    name: s.name,
    type: s.type,
    available: s.available,
    lastChecked: s.lastFetched,
    error: s.error,
    rateLimited: s.rateLimited,
    requiresConfiguration: s.requiresConfiguration,
    configNote: s.configNote,
  }));
  
  const allSources: DomainIntelSourceStatus[] = [
    dns,
    rdap,
    ct,
    ...ipRep.sources.map((s) => ({
      source: s.source as DomainIntelSourceStatus["source"],
      name: s.name,
      type: s.type,
      available: s.available,
      lastChecked: s.lastChecked,
      error: s.error,
      rateLimited: s.rateLimited,
      requiresConfiguration: s.requiresConfiguration,
      configNote: s.configNote,
    })),
    ...threatIntelSources,
  ];
  
  return {
    sources: allSources,
    lastRefresh: new Date(now).toISOString(),
    overallAvailable: allSources.some((s) => s.available),
  };
}

export async function clearDomainIntelCache(): Promise<void> {
  domainIntelCache.clear();
  clearDnsCache();
  clearRdapCache();
  clearCtCache();
}

export function getCachedDomainIntelligence(domain: string): DomainIntelligenceResult | null {
  const cacheKey = `domain-intel-${domain}`;
  const cached = domainIntelCache.get(cacheKey);
  return cached?.data ?? null;
}

export function addToDomainHistory(entry: DomainLookupHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("domain-intel-history") ?? "[]") as DomainLookupHistoryEntry[];
    const filtered = history.filter((h) => h.domain !== entry.domain);
    const updated = [entry, ...filtered].slice(0, 10);
    localStorage.setItem("domain-intel-history", JSON.stringify(updated));
    domainHistory = updated;
  } catch {
    // Ignore localStorage errors
  }
}

export function getDomainHistory(): DomainLookupHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("domain-intel-history") ?? "[]") as DomainLookupHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearDomainHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem("domain-intel-history");
    domainHistory = [];
  } catch {
    // Ignore
  }
}

export function exportDomainInvestigation(result: DomainIntelligenceResult): string {
  return JSON.stringify(result, null, 2);
}

export function getSourceLabel(source: DomainIntelSourceStatus["source"]): string {
  const labels: Record<string, string> = {
    "dns-doh": "DNS over HTTPS",
    rdap: "RDAP",
    "certificate-transparency": "Certificate Transparency",
    abuseipdb: "AbuseIPDB",
    virustotal: "VirusTotal",
    greynoise: "GreyNoise",
    ipinfo: "IPinfo",
    otx: "AlienVault OTX",
    urlhaus: "URLhaus",
    threatfox: "ThreatFox",
  };
  return labels[source] ?? source;
}

export function getSourceColor(source: DomainIntelSourceStatus["source"]): string {
  const colors: Record<string, string> = {
    "dns-doh": "#58d7f7",
    rdap: "#00ff91",
    "certificate-transparency": "#ffca8a",
    abuseipdb: "#ff9a92",
    virustotal: "#bb86fc",
    greynoise: "#58d7f7",
    ipinfo: "#00ff91",
    otx: "#ffca8a",
    urlhaus: "#ff9a92",
    threatfox: "#bb86fc",
  };
  return colors[source] ?? "#77847e";
}