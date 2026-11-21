import {
  IOCRecord,
  IOCSource,
  IOCType,
  ThreatClassification,
  ThreatIntelSourceStatus,
} from "../types/ioc";
import { escapeHtml } from "../utils/normalize";

const URLHAUS_BASE_URL = "https://urlhaus-api.abuse.ch/v1";

const URLHAUS_CACHE_TTL_MS = 60 * 60 * 1000;

let urlhausCache: {
  data: IOCRecord[] | null;
  fetchedAt: number | null;
} = {
  data: null,
  fetchedAt: null,
};

let urlhausLastRequestTime = 0;
const URLHAUS_REQUEST_DELAY_MS = 2000;

async function throttleUrlhausRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - urlhausLastRequestTime;
  if (elapsed < URLHAUS_REQUEST_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, URLHAUS_REQUEST_DELAY_MS - elapsed),
    );
  }
  urlhausLastRequestTime = Date.now();
}

function classifyUrlhausThreat(threat: string): ThreatClassification {
  const t = (threat ?? "").toLowerCase();
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

function mapUrlhausUrlToIOC(
  item: Record<string, unknown>,
): IOCRecord | null {
  const url = String(item.url ?? "");
  if (!url) return null;

  const id = String(item.id ?? "");
  const threat = String(item.threat ?? "");
  const tagsRaw = String(item.tags ?? "");
  const tags = tagsRaw ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const dateAdded = String(item.dateAdded ?? item.dateadded ?? null);
  const urlStatus = String(item.url_status ?? item.urlstatus ?? "");
  const reporter = String(item.reporter ?? null);

  let classification = classifyUrlhausThreat(threat);
  if (classification === "unknown" && tags.some((t) => t.toLowerCase().includes("phish"))) {
    classification = "phishing";
  }

  return {
    id: `urlhaus-${id}`,
    value: url,
    type: "url",
    classification,
    confidence: null,
    malwareFamily: null,
    malwareAlias: null,
    firstSeen: dateAdded || null,
    lastSeen: String(item.lastOnline ?? item.last_online ?? null) || null,
    tags,
    source: "urlhaus",
    sourceId: id || null,
    sourceName: "URLhaus (abuse.ch)",
    referenceUrl: `https://urlhaus.abuse.ch/url/${id}/`,
    relatedCampaign: null,
    relatedThreatActor: reporter || null,
    raw: item,
    fetchedAt: new Date().toISOString(),
  };
}

export async function fetchUrlhausRecent({
  authKey,
  limit = 50,
}: {
  authKey?: string;
  limit?: number;
}): Promise<IOCRecord[]> {
  const cacheKey = `urlhaus-recent-${limit}`;
  const now = Date.now();

  if (
    urlhausCache.data &&
    urlhausCache.fetchedAt &&
    now - urlhausCache.fetchedAt < URLHAUS_CACHE_TTL_MS
  ) {
    return urlhausCache.data;
  }

  try {
    await throttleUrlhausRequest();

    const url = new URL(`${URLHAUS_BASE_URL}/urls/recent/`);
    url.searchParams.set("limit", String(Math.min(limit, 1000)));

    const headers: HeadersInit = {
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    };

    if (authKey) {
      headers["Auth-Key"] = authKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new Error("URLhaus authentication required. Configure an Auth-Key.");
      }
      if (response.status === 429) {
        throw new Error("URLhaus rate limit exceeded. Try again later.");
      }
      throw new Error(`URLhaus API error: ${response.status}`);
    }

    const data = (await response.json()) as {
      query_status: string;
      urls: Array<Record<string, unknown>>;
    };

    if (data.query_status !== "ok" || !data.urls) {
      return [];
    }

    const iocs = data.urls.map(mapUrlhausUrlToIOC).filter(Boolean) as IOCRecord[];

    urlhausCache = { data: iocs, fetchedAt: now };
    return iocs;
  } catch {
    return urlhausCache.data ?? [];
  }
}

export async function checkUrlhausAvailability({
  authKey,
}: {
  authKey?: string;
}): Promise<ThreatIntelSourceStatus> {
  const now = Date.now();

  try {
    await throttleUrlhausRequest();

    const url = new URL(`${URLHAUS_BASE_URL}/urls/recent/`);
    url.searchParams.set("limit", "1");

    const headers: HeadersInit = {
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    };

    if (authKey) {
      headers["Auth-Key"] = authKey;
    }

    const response = await fetch(url.toString(), { headers });

    if (response.status === 401 || response.status === 403) {
      return {
        source: "urlhaus",
        name: "URLhaus (abuse.ch)",
        type: "Malicious URLs",
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
        source: "urlhaus",
        name: "URLhaus (abuse.ch)",
        type: "Malicious URLs",
        available: false,
        lastFetched: new Date(now).toISOString(),
        error: "Rate limited",
        rateLimited: true,
        requiresConfiguration: false,
        configNote: null,
      };
    }

    return {
      source: "urlhaus",
      name: "URLhaus (abuse.ch)",
      type: "Malicious URLs",
      available: response.ok,
      lastFetched: new Date(now).toISOString(),
      error: response.ok ? null : `HTTP ${response.status}`,
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  } catch (error) {
    return {
      source: "urlhaus",
      name: "URLhaus (abuse.ch)",
      type: "Malicious URLs",
      available: false,
      lastFetched: null,
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  }
}

export function clearUrlhausCache(): void {
  urlhausCache = { data: null, fetchedAt: null };
}
