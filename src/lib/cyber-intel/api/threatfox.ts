import {
  IOCRecord,
  IOCSource,
  IOCType,
  ThreatClassification,
  ThreatIntelSourceStatus,
} from "../types/ioc";
import { escapeHtml } from "../utils/normalize";

const THREATFOX_BASE_URL = "https://threatfox-api.abuse.ch/api/v1/";

const THREATFOX_CACHE_TTL_MS = 60 * 60 * 1000;

let threatfoxCache: {
  data: IOCRecord[] | null;
  fetchedAt: number | null;
} = {
  data: null,
  fetchedAt: null,
};

let threatfoxLastRequestTime = 0;
const THREATFOX_REQUEST_DELAY_MS = 1000;

async function throttleThreatFoxRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - threatfoxLastRequestTime;
  if (elapsed < THREATFOX_REQUEST_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, THREATFOX_REQUEST_DELAY_MS - elapsed),
    );
  }
  threatfoxLastRequestTime = Date.now();
}

function classifyThreatFoxThreat(threatType: string): ThreatClassification {
  const t = (threatType ?? "").toLowerCase();
  if (t.includes("ransomware")) return "ransomware";
  if (t.includes("botnet") || t.includes("botnet_cc")) return "botnet_cc";
  if (t.includes("phishing")) return "phishing";
  if (t.includes("trojan")) return "trojan";
  if (t.includes("spyware")) return "spyware";
  if (t.includes("miner")) return "miner";
  if (t.includes("dropper")) return "dropper";
  if (t.includes("loader")) return "loader";
  if (t.includes("malware")) return "malware_distribution";
  return "unknown";
}

function mapThreatFoxIOCToRecord(item: Record<string, unknown>): IOCRecord {
  const iocValue = String(item.ioc ?? "");
  const threatType = String(item.threat_type ?? "");
  const malware = String(item.malware ?? null);
  const malwareAlias = String(item.malware_alias ?? null);
  const confidenceRaw = String(item.confidence_level ?? item.confidence ?? null);
  const tagsRaw = Array.isArray(item.tags) ? item.tags : String(item.tags ?? "");
  const tags = Array.isArray(tagsRaw)
    ? tagsRaw.map(String).filter(Boolean)
    : tagsRaw.split(",").map((t) => t.trim()).filter(Boolean);
  const firstSeen = String(item.first_seen ?? item.firstSeen ?? null);
  const lastSeen = String(item.last_seen ?? item.lastSeen ?? null);
  const reference = String(item.reference ?? null);
  const reporter = String(item.reporter ?? null);
  const id = String(item.id ?? "");

  let confidence: "low" | "medium" | "high" | "critical" | null = null;
  if (confidenceRaw) {
    const c = confidenceRaw.toLowerCase();
    if (c === "high" || c === "critical") confidence = c as "high" | "critical";
    else if (c === "medium") confidence = "medium";
    else if (c === "low") confidence = "low";
  }

  return {
    id: `threatfox-${id}`,
    value: iocValue,
    type: classifyIOCType(iocValue),
    classification: classifyThreatFoxThreat(threatType),
    confidence,
    malwareFamily: malware || null,
    malwareAlias: malwareAlias || null,
    firstSeen: firstSeen || null,
    lastSeen: lastSeen || null,
    tags,
    source: "threatfox",
    sourceId: id || null,
    sourceName: "ThreatFox (abuse.ch)",
    referenceUrl: reference || null,
    relatedCampaign: null,
    relatedThreatActor: reporter || null,
    raw: item,
    fetchedAt: new Date().toISOString(),
  };
}

function classifyIOCType(value: string): IOCType {
  const v = value.trim();
  if (/^md5:[0-9a-f]{32}$/i.test(v) || /^[0-9a-f]{32}$/i.test(v)) return "hash";
  if (/^sha1:[0-9a-f]{40}$/i.test(v) || /^[0-9a-f]{40}$/i.test(v)) return "hash";
  if (/^sha256:[0-9a-f]{64}$/i.test(v) || /^[0-9a-f]{64}$/i.test(v)) return "hash";
  if (/^https?:\/\//i.test(v)) return "url";
  if (v.includes(".") && !/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return "domain";
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(v)) return "ip";
  if (v.includes("@")) return "email";
  return "url";
}

async function threatFoxRequest({
  authKey,
  body,
  proxyUrl,
}: {
  authKey?: string;
  body: Record<string, unknown>;
  proxyUrl?: string;
}): Promise<{ query_status: string; data: Array<Record<string, unknown>> }> {
  if (proxyUrl) {
    const proxyResponse = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
      body: JSON.stringify({
        source: "threatfox",
        body,
      }),
    });

    if (!proxyResponse.ok) {
      throw new Error(`ThreatFox proxy error: ${proxyResponse.status}`);
    }

    return proxyResponse.json();
  }

  await throttleThreatFoxRequest();

  const headers: HeadersInit = {
    Accept: "application/json",
    "Content-Type": "application/json",
    "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
  };

  if (authKey) {
    headers["Auth-Key"] = authKey;
  }

  const response = await fetch(THREATFOX_BASE_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error("ThreatFox authentication required. Configure an Auth-Key.");
    }
    if (response.status === 429) {
      throw new Error("ThreatFox rate limit exceeded. Try again later.");
    }
    throw new Error(`ThreatFox API error: ${response.status}`);
  }

  return response.json();
}

export async function fetchThreatFoxRecent({
  authKey,
  days = 1,
  proxyUrl,
}: {
  authKey?: string;
  days?: number;
  proxyUrl?: string;
}): Promise<IOCRecord[]> {
  const cacheKey = `threatfox-recent-${days}`;
  const now = Date.now();

  if (
    threatfoxCache.data &&
    threatfoxCache.fetchedAt &&
    now - threatfoxCache.fetchedAt < THREATFOX_CACHE_TTL_MS
  ) {
    return threatfoxCache.data;
  }

  try {
    const data = await threatFoxRequest({
      authKey,
      body: { query: "get_iocs", days: Math.min(Math.max(days, 1), 7) },
      proxyUrl,
    });

    if (data.query_status !== "ok" || !data.data) {
      return [];
    }

    const iocs = data.data.map(mapThreatFoxIOCToRecord);

    threatfoxCache = { data: iocs, fetchedAt: now };
    return iocs;
  } catch {
    return threatfoxCache.data ?? [];
  }
}

export async function searchThreatFoxIOC({
  authKey,
  searchTerm,
  exactMatch = false,
  proxyUrl,
}: {
  authKey?: string;
  searchTerm: string;
  exactMatch?: boolean;
  proxyUrl?: string;
}): Promise<IOCRecord[]> {
  try {
    const data = await threatFoxRequest({
      authKey,
      body: {
        query: "search_ioc",
        search_term: searchTerm,
        exact_match: exactMatch,
      },
      proxyUrl,
    });

    if (data.query_status !== "ok" || !data.data) {
      return [];
    }

    return data.data.map(mapThreatFoxIOCToRecord);
  } catch {
    return [];
  }
}

export async function checkThreatFoxAvailability({
  authKey,
  proxyUrl,
}: {
  authKey?: string;
  proxyUrl?: string;
}): Promise<ThreatIntelSourceStatus> {
  const now = Date.now();

  try {
    if (proxyUrl) {
      const proxyResponse = await fetch(proxyUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
        },
        body: JSON.stringify({
          source: "threatfox",
          body: { query: "get_iocs", days: 1 },
        }),
      });

      if (proxyResponse.status === 401 || proxyResponse.status === 403) {
        return {
          source: "threatfox",
          name: "ThreatFox (abuse.ch)",
          type: "IOCs (IP, domain, URL, hash)",
          available: false,
          lastFetched: new Date(now).toISOString(),
          error: "Authentication required",
          rateLimited: false,
          requiresConfiguration: true,
          configNote: "Configure ABUSECH_AUTH_KEY in Supabase Edge Function secrets.",
        };
      }

      if (proxyResponse.status === 429) {
        return {
          source: "threatfox",
          name: "ThreatFox (abuse.ch)",
          type: "IOCs (IP, domain, URL, hash)",
          available: false,
          lastFetched: new Date(now).toISOString(),
          error: "Rate limited",
          rateLimited: true,
          requiresConfiguration: false,
          configNote: null,
        };
      }

      return {
        source: "threatfox",
        name: "ThreatFox (abuse.ch)",
        type: "IOCs (IP, domain, URL, hash)",
        available: proxyResponse.ok,
        lastFetched: new Date(now).toISOString(),
        error: proxyResponse.ok ? null : `HTTP ${proxyResponse.status}`,
        rateLimited: false,
        requiresConfiguration: false,
        configNote: null,
      };
    }

    await throttleThreatFoxRequest();

    const headers: HeadersInit = {
      Accept: "application/json",
      "Content-Type": "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    };

    if (authKey) {
      headers["Auth-Key"] = authKey;
    }

    const response = await fetch(THREATFOX_BASE_URL, {
      method: "POST",
      headers,
      body: JSON.stringify({ query: "get_iocs", days: 1 }),
    });

    if (response.status === 401 || response.status === 403) {
      return {
        source: "threatfox",
        name: "ThreatFox (abuse.ch)",
        type: "IOCs (IP, domain, URL, hash)",
        available: false,
        lastFetched: new Date(now).toISOString(),
        error: "Authentication required",
        rateLimited: false,
        requiresConfiguration: true,
        configNote: "Get a free Auth-Key at auth.abuse.ch and configure a secure proxy.",
      };
    }

    if (response.status === 429) {
      return {
        source: "threatfox",
        name: "ThreatFox (abuse.ch)",
        type: "IOCs (IP, domain, URL, hash)",
        available: false,
        lastFetched: new Date(now).toISOString(),
        error: "Rate limited",
        rateLimited: true,
        requiresConfiguration: false,
        configNote: null,
      };
    }

    return {
      source: "threatfox",
      name: "ThreatFox (abuse.ch)",
      type: "IOCs (IP, domain, URL, hash)",
      available: response.ok,
      lastFetched: new Date(now).toISOString(),
      error: response.ok ? null : `HTTP ${response.status}`,
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  } catch (error) {
    return {
      source: "threatfox",
      name: "ThreatFox (abuse.ch)",
      type: "IOCs (IP, domain, URL, hash)",
      available: false,
      lastFetched: null,
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  }
}

export function clearThreatFoxCache(): void {
  threatfoxCache = { data: null, fetchedAt: null };
}
