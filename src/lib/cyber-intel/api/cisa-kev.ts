import {
  CveRecord,
  KevInfo,
  SourceStatus,
} from "../types";
import {
  fetchZeroDayProxyResource,
  isZeroDayProxyConfigured,
} from "./zero-day/proxy";

const CISA_KEV_URL =
  "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json";

interface CisaKevVulnerability {
  cveID: string;
  vulnerabilityName: string;
  dateAdded: string;
  dueDate: string | null;
  knownRansomwareCampaignUse: string;
  requiredAction: string;
  vendorProject: string;
  product: string;
  shortDescription: string;
  cwes: string[];
}

interface CisaKevFeed {
  vulnerabilityCount: number;
  dateReleased: string;
  catalogVersion: string;
  vulnerabilities: CisaKevVulnerability[];
}

export type { CisaKevFeed, CisaKevVulnerability };

export interface KevFeedResult {
  feed: CisaKevFeed | null;
  viaProxy: boolean;
  error: string | null;
  fetchedAt: string | null;
  stale: boolean;
}

interface KevCacheEntry {
  data: CisaKevFeed;
  fetchedAt: number;
  viaProxy: boolean;
}

let kevCache: KevCacheEntry | null = null;

const KEV_CACHE_TTL_MS = 60 * 60 * 1000;

function parseKevInfo(vuln: CisaKevVulnerability | null): KevInfo {
  if (!vuln) {
    return {
      inKev: false,
      dateAdded: null,
      dueDate: null,
      ransomwareCampaign: null,
      source: null,
    };
  }

  return {
    inKev: true,
    dateAdded: vuln.dateAdded ?? null,
    dueDate: vuln.dueDate ?? null,
    ransomwareCampaign: vuln.knownRansomwareCampaignUse === "Known",
    source: "CISA Known Exploited Vulnerabilities Catalog",
  };
}

function parseKevFeed(text: string): CisaKevFeed {
  const payload = JSON.parse(text) as Record<string, unknown>;
  const vulnerabilities = Array.isArray(payload.vulnerabilities)
    ? (payload.vulnerabilities as CisaKevVulnerability[]).filter(
        (entry) => entry && typeof entry.cveID === "string",
      )
    : [];

  if (vulnerabilities.length === 0) {
    throw new Error("CISA KEV feed did not contain any vulnerabilities");
  }

  return {
    vulnerabilityCount:
      typeof payload.vulnerabilityCount === "number"
        ? payload.vulnerabilityCount
        : vulnerabilities.length,
    dateReleased:
      typeof payload.dateReleased === "string" ? payload.dateReleased : "",
    catalogVersion:
      typeof payload.catalogVersion === "string" ? payload.catalogVersion : "",
    vulnerabilities,
  };
}

/**
 * CISA KEV does not send Access-Control-Allow-Origin. Prefer the allowlisted
 * Supabase proxy when configured, then fall back to a direct browser request
 * for environments where CISA permits it.
 */
async function fetchKevFeed(): Promise<{ feed: CisaKevFeed; viaProxy: boolean }> {
  const errors: string[] = [];

  if (isZeroDayProxyConfigured()) {
    try {
      const proxied = await fetchZeroDayProxyResource("cisa-kev");
      return { feed: parseKevFeed(proxied.text), viaProxy: true };
    } catch (error) {
      errors.push(
        `Proxy: ${error instanceof Error ? error.message : "unknown error"}`,
      );
    }
  }

  try {
    const response = await fetch(CISA_KEV_URL, {
      headers: {
        Accept: "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }

    return { feed: parseKevFeed(await response.text()), viaProxy: false };
  } catch (error) {
    errors.push(
      `Direct: ${error instanceof Error ? error.message : "unknown error"}`,
    );
  }

  throw new Error(errors.join("; ") || "Unable to fetch CISA KEV catalog");
}

export async function getKevFeedWithStatus(): Promise<KevFeedResult> {
  const now = Date.now();

  if (
    kevCache &&
    now - kevCache.fetchedAt < KEV_CACHE_TTL_MS
  ) {
    return {
      feed: kevCache.data,
      viaProxy: kevCache.viaProxy,
      error: null,
      fetchedAt: new Date(kevCache.fetchedAt).toISOString(),
      stale: false,
    };
  }

  try {
    const { feed, viaProxy } = await fetchKevFeed();
    kevCache = { data: feed, fetchedAt: now, viaProxy };
    return {
      feed,
      viaProxy,
      error: null,
      fetchedAt: new Date(now).toISOString(),
      stale: false,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    if (kevCache) {
      return {
        feed: kevCache.data,
        viaProxy: kevCache.viaProxy,
        error: message,
        fetchedAt: new Date(kevCache.fetchedAt).toISOString(),
        stale: true,
      };
    }
    return { feed: null, viaProxy: false, error: message, fetchedAt: null, stale: false };
  }
}

export async function getCachedKevFeed(): Promise<CisaKevFeed | null> {
  const result = await getKevFeedWithStatus();
  return result.feed;
}

export async function enrichCveWithKev(
  cve: CveRecord,
): Promise<CveRecord> {
  try {
    const feed = await getCachedKevFeed();
    if (!feed) return cve;

    const match = feed.vulnerabilities.find(
      (v) => v.cveID.toUpperCase() === cve.cveId.toUpperCase(),
    );

    return {
      ...cve,
      kev: parseKevInfo(match ?? null),
    };
  } catch {
    return cve;
  }
}

export async function checkCisaKevAvailability(): Promise<SourceStatus> {
  try {
    const result = await getKevFeedWithStatus();
    if (!result.feed) {
      return {
        available: false,
        lastFetched: null,
        error: result.error ?? "Unable to fetch CISA KEV catalog",
        rateLimited: false,
      };
    }

    return {
      available: true,
      lastFetched: result.fetchedAt,
      error: result.error,
      rateLimited: false,
    };
  } catch (error) {
    return {
      available: false,
      lastFetched: null,
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
    };
  }
}

export async function checkKevStatusForCve(
  cveId: string,
): Promise<{ inKev: boolean; kevInfo: KevInfo | null }> {
  try {
    const feed = await getCachedKevFeed();
    if (!feed) {
      return { inKev: false, kevInfo: null };
    }

    const match = feed.vulnerabilities.find(
      (v) => v.cveID.toUpperCase() === cveId.toUpperCase(),
    );

    if (!match) {
      return { inKev: false, kevInfo: null };
    }

    return { inKev: true, kevInfo: parseKevInfo(match) };
  } catch {
    return { inKev: false, kevInfo: null };
  }
}

export function clearKevCache(): void {
  kevCache = null;
}
