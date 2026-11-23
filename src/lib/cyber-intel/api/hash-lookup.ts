import {
  HashLookupResult,
  HashVerdict,
  HashSource,
  HashType,
  HashLookupParams,
  HashLookupHistoryEntry,
  IOCType,
  IOCInvestigatorStatus,
  IOCInvestigatorSourceStatus,
} from "../types/ioc-investigator";
import { detectHashType, normalizeIOC } from "../types/ioc-investigator";

const HASH_LOOKUP_PROXY_URL = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_HASH_LOOKUP_PROXY_URL as string | undefined)
  : undefined;

const HASH_CACHE_TTL_MS = 60 * 60 * 1000;
let hashCache: Map<string, { data: HashLookupResult; fetchedAt: number }> = new Map();
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 1000;

function getProxyUrl(): string | undefined {
  return HASH_LOOKUP_PROXY_URL;
}

async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

async function fetchFromProxy<T>(source: string, hash: string): Promise<T | null> {
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
      body: JSON.stringify({ source, hash }),
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json() as T;
  } catch {
    return null;
  }
}

function parseMalwareBazaarResponse(data: unknown, hash: string, type: HashType): Partial<HashLookupResult> | null {
  try {
    const d = data as { query_status?: string; data?: Array<Record<string, unknown>> };
    if (d.query_status !== "ok" || !d.data?.length) return null;
    
    const sample = d.data[0];
    const vendorDetections: Array<{
      vendor: string;
      result: string;
      category: string;
      method: string;
    }> = [];
    
    if (sample.vendor_intel) {
      const vi = sample.vendor_intel as Record<string, { result?: string; category?: string; method?: string }>;
      for (const [vendor, intel] of Object.entries(vi)) {
        vendorDetections.push({
          vendor,
          result: intel.result ?? "",
          category: intel.category ?? "",
          method: intel.method ?? "",
        });
      }
    }
    
    const tags = Array.isArray(sample.tags) ? sample.tags.map(String) : 
      (sample.tags ? String(sample.tags).split(",").map(s => s.trim()).filter(Boolean) : []);
    
    const verdict = (sample.signature || tags.some(t => /malware|trojan|ransomware|botnet|backdoor|rootkit|worm|virus/i.test(t))) 
      ? "malicious" : "unknown";
    
    return {
      fileName: (sample.file_name as string) ?? null,
      fileType: (sample.file_type as string) ?? null,
      fileSize: (sample.file_size as number) ?? null,
      md5: (sample.md5_hash as string) ?? null,
      sha1: (sample.sha1_hash as string) ?? null,
      sha256: (sample.sha256_hash as string) ?? null,
      malwareFamily: (sample.signature as string) ?? null,
      malwareAlias: null,
      threatClassification: (sample.file_type_mime as string) ?? null,
      firstSeen: (sample.first_seen as string) ?? null,
      lastSeen: (sample.last_seen as string) ?? null,
      vendorDetections,
      detectionRatio: vendorDetections.length > 0 ? `${vendorDetections.filter(v => v.category === "malicious").length}/${vendorDetections.length}` : null,
      threatTags: tags,
      isCached: false,
    };
  } catch {
    return null;
  }
}

function parseVirusTotalHashResponse(data: unknown, hash: string, type: HashType): Partial<HashLookupResult> | null {
  try {
    const d = data as { data?: { attributes?: Record<string, unknown> } };
    if (!d.data?.attributes) return null;
    
    const attrs = d.data.attributes;
    const stats = attrs.last_analysis_stats as Record<string, number> | undefined;
    const results = attrs.last_analysis_results as Record<string, { category: string; result: string | null; method: string; engine_name: string }> | undefined;
    
    const vendorDetections = results ? Object.entries(results).map(([vendor, result]) => ({
      vendor,
      result: result.result ?? "",
      category: result.category,
      method: result.method,
    })) : [];
    
    const malicious = stats?.malicious ?? 0;
    const suspicious = stats?.suspicious ?? 0;
    const total = (stats?.malicious ?? 0) + (stats?.suspicious ?? 0) + (stats?.undetected ?? 0) + (stats?.harmless ?? 0) + (stats?.timeout ?? 0);
    
    let verdict: HashVerdict = "clean";
    if (malicious > 0) verdict = "malicious";
    else if (suspicious > 0) verdict = "suspicious";
    else if (total === 0) verdict = "unknown";
    
    const tags = Array.isArray(attrs.tags) ? attrs.tags.map(String) : [];
    
    const namesArray = attrs.names as string[] | undefined;
    
    return {
      fileName: (attrs.meaningful_name as string) ?? (namesArray?.[0] ?? null),
      fileType: (attrs.type_description as string) ?? (attrs.type_tag as string) ?? null,
      fileSize: (attrs.size as number) ?? null,
      md5: (attrs.md5 as string) ?? null,
      sha1: (attrs.sha1 as string) ?? null,
      sha256: (attrs.sha256 as string) ?? null,
      malwareFamily: null,
      malwareAlias: null,
      threatClassification: (attrs.type_tag as string) ?? null,
      firstSeen: attrs.first_submission_date ? new Date(attrs.first_submission_date as number * 1000).toISOString() : null,
      lastSeen: attrs.last_analysis_date ? new Date(attrs.last_analysis_date as number * 1000).toISOString() : null,
      vendorDetections,
      detectionRatio: total > 0 ? `${malicious + suspicious}/${total}` : null,
      threatTags: tags,
      isCached: false,
    };
  } catch {
    return null;
  }
}

function parseOTXHashResponse(data: unknown, hash: string, type: HashType): Partial<HashLookupResult> | null {
  try {
    const d = data as Record<string, unknown>;
    const pulseInfo = d.pulse_info as Record<string, unknown> | undefined;
    
    if (!pulseInfo || (pulseInfo.count as number) === 0) return null;
    
    const pulses = pulseInfo.pulses as Array<Record<string, unknown>> | undefined;
    const vendorDetections: Array<{
      vendor: string;
      result: string;
      category: string;
      method: string;
    }> = [];
    
    const tags = pulses?.flatMap(p => Array.isArray(p.tags) ? p.tags.map(String) : []) ?? [];
    const malwareFamilies = Array.isArray(d.malware_families) ? d.malware_families.map(String) : [];
    
    return {
      fileName: null,
      fileType: null,
      fileSize: null,
      md5: null,
      sha1: null,
      sha256: null,
      malwareFamily: malwareFamilies[0] ?? null,
      malwareAlias: null,
      threatClassification: null,
      firstSeen: pulses?.[0]?.created ? new Date(pulses[0].created as string).toISOString() : null,
      lastSeen: pulses?.[0]?.modified ? new Date(pulses[0].modified as string).toISOString() : null,
      vendorDetections,
      detectionRatio: pulses ? `${pulses.length} pulses` : null,
      threatTags: [...new Set([...tags, ...malwareFamilies])],
      isCached: false,
    };
  } catch {
    return null;
  }
}

function mapVerdict(sourceVerdict: string): HashVerdict {
  const v = sourceVerdict.toLowerCase();
  if (v === "malicious" || v === "malware") return "malicious";
  if (v === "suspicious") return "suspicious";
  if (v === "clean" || v === "harmless" || v === "undetected" || v === "no-detections") return "clean";
  return "unknown";
}

export async function fetchMalwareBazaarHash(hash: string): Promise<HashLookupResult["intelligence"][0] | null> {
  const type = detectHashType(hash) ?? "sha256";
  const cleanHash = normalizeIOC(hash, type);
  
  try {
    const data = await fetchFromProxy<Record<string, unknown>>("malwarebazaar", cleanHash);
    if (!data) return null;
    
    const parsed = parseMalwareBazaarResponse(data, cleanHash, type);
    if (!parsed) {
      return {
        source: "malwarebazaar",
        verdict: "no-detections",
        confidence: null,
        details: {},
        referenceUrl: `https://bazaar.abuse.ch/sample/${cleanHash}/`,
        lastAnalysisDate: null,
      };
    }
    
    return {
      source: "malwarebazaar",
      verdict: mapVerdict("malicious"),
      confidence: 85,
      details: parsed,
      referenceUrl: `https://bazaar.abuse.ch/sample/${cleanHash}/`,
      lastAnalysisDate: parsed.lastSeen ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchVirusTotalHash(hash: string): Promise<HashLookupResult["intelligence"][0] | null> {
  const type = detectHashType(hash) ?? "sha256";
  const cleanHash = normalizeIOC(hash, type);
  
  try {
    const data = await fetchFromProxy<Record<string, unknown>>("virustotal", cleanHash);
    if (!data) return null;
    
    const parsed = parseVirusTotalHashResponse(data, cleanHash, type);
    if (!parsed) {
      return {
        source: "virustotal",
        verdict: "no-detections",
        confidence: null,
        details: {},
        referenceUrl: `https://www.virustotal.com/gui/file/${cleanHash}`,
        lastAnalysisDate: null,
      };
    }
    
    const stats = (data as { data?: { attributes?: { last_analysis_stats?: Record<string, number> } } }).data?.attributes?.last_analysis_stats;
    const malicious = stats?.malicious ?? 0;
    const suspicious = stats?.suspicious ?? 0;
    const total = malicious + suspicious + (stats?.undetected ?? 0) + (stats?.harmless ?? 0) + (stats?.timeout ?? 0);
    
    return {
      source: "virustotal",
      verdict: malicious > 0 ? "malicious" : suspicious > 0 ? "suspicious" : "clean",
      confidence: total > 0 ? Math.round((malicious / total) * 100) : 50,
      details: parsed,
      referenceUrl: `https://www.virustotal.com/gui/file/${cleanHash}`,
      lastAnalysisDate: parsed.lastSeen ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchOTXHash(hash: string): Promise<HashLookupResult["intelligence"][0] | null> {
  const type = detectHashType(hash) ?? "sha256";
  const cleanHash = normalizeIOC(hash, type);
  
  try {
    const data = await fetchFromProxy<Record<string, unknown>>("otx", cleanHash);
    if (!data) return null;
    
    const parsed = parseOTXHashResponse(data, cleanHash, type);
    if (!parsed) {
      return {
        source: "otx",
        verdict: "no-detections",
        confidence: null,
        details: {},
        referenceUrl: `https://otx.alienvault.com/indicator/file/${cleanHash}`,
        lastAnalysisDate: null,
      };
    }
    
    return {
      source: "otx",
      verdict: "malicious",
      confidence: 75,
      details: parsed,
      referenceUrl: `https://otx.alienvault.com/indicator/file/${cleanHash}`,
      lastAnalysisDate: parsed.lastSeen ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchThreatFoxHash(hash: string): Promise<HashLookupResult["intelligence"][0] | null> {
  const type = detectHashType(hash) ?? "sha256";
  const cleanHash = normalizeIOC(hash, type);
  
  try {
    const data = await fetchFromProxy<Record<string, unknown>>("threatfox", cleanHash);
    if (!data) return null;
    
    return {
      source: "threatfox",
      verdict: "malicious",
      confidence: 80,
      details: data,
      referenceUrl: `https://threatfox.abuse.ch/ioc/?ioc=${encodeURIComponent(cleanHash)}`,
      lastAnalysisDate: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchURLhausHash(hash: string): Promise<HashLookupResult["intelligence"][0] | null> {
  const type = detectHashType(hash) ?? "sha256";
  const cleanHash = normalizeIOC(hash, type);
  
  try {
    const data = await fetchFromProxy<Record<string, unknown>>("urlhaus", cleanHash);
    if (!data) return null;
    
    return {
      source: "urlhaus",
      verdict: "malicious",
      confidence: 80,
      details: data,
      referenceUrl: `https://urlhaus.abuse.ch/sample/${cleanHash}/`,
      lastAnalysisDate: new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function fetchHashLookup(hash: string, forceRefresh = false): Promise<HashLookupResult | null> {
  const type = detectHashType(hash);
  if (!type) return null;
  
  const cleanHash = normalizeIOC(hash, type);
  const cacheKey = `hash-${cleanHash}`;
  const now = Date.now();
  
  if (!forceRefresh) {
    const cached = hashCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < HASH_CACHE_TTL_MS) {
      return { ...cached.data, isCached: true };
    }
  }
  
  const [
    malwareBazaar,
    virusTotal,
    otx,
    threatFox,
    urlhaus,
  ] = await Promise.allSettled([
    fetchMalwareBazaarHash(cleanHash),
    fetchVirusTotalHash(cleanHash),
    fetchOTXHash(cleanHash),
    fetchThreatFoxHash(cleanHash),
    fetchURLhausHash(cleanHash),
  ]);
  
  const intelligence: HashLookupResult["intelligence"] = [];
  let mergedDetails: Partial<HashLookupResult> = {};
  
  const results = [
    { source: "malwarebazaar", result: malwareBazaar },
    { source: "virustotal", result: virusTotal },
    { source: "otx", result: otx },
    { source: "threatfox", result: threatFox },
    { source: "urlhaus", result: urlhaus },
  ];
  
  for (const { source, result: r } of results) {
    if (r.status === "fulfilled" && r.value) {
      intelligence.push(r.value);
      if (r.value.details) {
        mergedDetails = { ...mergedDetails, ...r.value.details };
      }
    }
  }
  
  const hasDetections = intelligence.some(i => i.verdict === "malicious" || i.verdict === "suspicious");
  const overallVerdict: HashVerdict = hasDetections ? "malicious" : intelligence.length > 0 ? "no-detections" : "unknown";
  
  const relatedIOCs: HashLookupResult["relatedIOCs"] = [];
  if (mergedDetails.fileName) {
    relatedIOCs.push({
      type: "domain" as IOCType,
      value: mergedDetails.fileName,
      relationship: "filename",
      source: "merged",
    });
  }
  
  const result: HashLookupResult = {
    hash: cleanHash,
    type,
    fileName: mergedDetails.fileName ?? null,
    fileType: mergedDetails.fileType ?? null,
    fileSize: mergedDetails.fileSize ?? null,
    md5: mergedDetails.md5 ?? null,
    sha1: mergedDetails.sha1 ?? null,
    sha256: mergedDetails.sha256 ?? null,
    malwareFamily: mergedDetails.malwareFamily ?? null,
    malwareAlias: mergedDetails.malwareAlias ?? null,
    threatClassification: mergedDetails.threatClassification ?? null,
    firstSeen: mergedDetails.firstSeen ?? null,
    lastSeen: mergedDetails.lastSeen ?? null,
    vendorDetections: mergedDetails.vendorDetections ?? [],
    detectionRatio: mergedDetails.detectionRatio ?? null,
    threatTags: mergedDetails.threatTags ?? [],
    intelligence,
    relatedIOCs,
    isCached: false,
    error: intelligence.length === 0 ? "No intelligence sources returned data" : null,
    fetchedAt: new Date().toISOString(),
  };
  
  hashCache.set(cacheKey, { data: result, fetchedAt: now });
  return result;
}

export async function checkHashLookupStatus(): Promise<IOCInvestigatorStatus> {
  const proxyUrl = getProxyUrl();
  const now = Date.now();
  
  const sources: IOCInvestigatorSourceStatus[] = [
    {
      source: "malwarebazaar",
      name: "MalwareBazaar (abuse.ch)",
      type: "Malware Sample Repository",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure ABUSECH_AUTH_KEY in Supabase Edge Function" : null,
    },
    {
      source: "virustotal",
      name: "VirusTotal",
      type: "Multi-engine Malware Analysis",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure VIRUSTOTAL_API_KEY in Supabase Edge Function" : null,
    },
    {
      source: "otx",
      name: "AlienVault OTX",
      type: "Threat Intelligence Platform",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure OTX_API_KEY in Supabase Edge Function" : null,
    },
    {
      source: "threatfox",
      name: "ThreatFox (abuse.ch)",
      type: "IOC Repository",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure ABUSECH_AUTH_KEY in Supabase Edge Function" : null,
    },
    {
      source: "urlhaus",
      name: "URLhaus (abuse.ch)",
      type: "Malicious URL & Sample Repository",
      available: false,
      lastChecked: null,
      error: null,
      rateLimited: false,
      requiresConfiguration: !proxyUrl,
      configNote: !proxyUrl ? "Configure ABUSECH_AUTH_KEY in Supabase Edge Function" : null,
    },
  ];
  
  if (!proxyUrl) {
    return { sources, lastRefresh: new Date(now).toISOString(), overallAvailable: false };
  }
  
  const testHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"; // SHA256 of empty string
  
  const results = await Promise.all(
    sources.map(async (source) => {
      try {
        await throttleRequest();
        const response = await fetch(proxyUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
          },
          body: JSON.stringify({ source: source.source, hash: testHash }),
        });
        
        if (response.status === 401 || response.status === 403) {
          return { ...source, available: false, lastFetched: new Date(now).toISOString(), error: "Authentication required", rateLimited: false, requiresConfiguration: true, configNote: "API key invalid or missing in Supabase Edge Function" };
        }
        
        if (response.status === 429) {
          return { ...source, available: false, lastFetched: new Date(now).toISOString(), error: "Rate limited", rateLimited: true, requiresConfiguration: false, configNote: null };
        }
        
        return { ...source, available: response.ok, lastFetched: new Date(now).toISOString(), error: response.ok ? null : `HTTP ${response.status}`, rateLimited: false, requiresConfiguration: false, configNote: null };
      } catch (error) {
        return { ...source, available: false, lastFetched: null, error: error instanceof Error ? error.message : "Unknown error", rateLimited: false, requiresConfiguration: false, configNote: null };
      }
    })
  );
  
  return {
    sources: results,
    lastRefresh: new Date(now).toISOString(),
    overallAvailable: results.some(s => s.available),
  };
}

export function clearHashCache(): void {
  hashCache.clear();
}

export function getCachedHashLookup(hash: string): HashLookupResult | null {
  const type = detectHashType(hash);
  if (!type) return null;
  const cleanHash = normalizeIOC(hash, type);
  const cacheKey = `hash-${cleanHash}`;
  const cached = hashCache.get(cacheKey);
  return cached?.data ?? null;
}

export function addToHashHistory(entry: HashLookupHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("hash-lookup-history") ?? "[]") as HashLookupHistoryEntry[];
    const filtered = history.filter(h => h.hash !== entry.hash);
    const updated = [entry, ...filtered].slice(0, 20);
    localStorage.setItem("hash-lookup-history", JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function getHashHistory(): HashLookupHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("hash-lookup-history") ?? "[]") as HashLookupHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearHashHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("hash-lookup-history");
}

export function exportHashInvestigation(result: HashLookupResult): string {
  return JSON.stringify(result, null, 2);
}

export function getSourceLabel(source: HashSource): string {
  const labels: Record<HashSource, string> = {
    malwarebazaar: "MalwareBazaar",
    virustotal: "VirusTotal",
    otx: "AlienVault OTX",
    threatfox: "ThreatFox",
    urlhaus: "URLhaus",
  };
  return labels[source];
}

export function getSourceColor(source: HashSource): string {
  const colors: Record<HashSource, string> = {
    malwarebazaar: "#ff9a92",
    virustotal: "#bb86fc",
    otx: "#ffca8a",
    threatfox: "#58d7f7",
    urlhaus: "#ff7b72",
  };
  return colors[source];
}

export { getProxyUrl };