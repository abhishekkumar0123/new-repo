import {
  CveRecord,
  KevInfo,
  SourceStatus,
} from "../types";

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

let kevCache: { data: CisaKevFeed | null; fetchedAt: number | null } = {
  data: null,
  fetchedAt: null,
};

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
    ransomwareCampaign:
      vuln.knownRansomwareCampaignUse === "Known" ? true : false,
    source: "CISA Known Exploited Vulnerabilities Catalog",
  };
}

async function fetchKevFeed(): Promise<CisaKevFeed> {
  const response = await fetch(CISA_KEV_URL, {
    headers: {
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  if (!response.ok) {
    throw new Error(
      `CISA KEV API error: ${response.status} ${response.statusText}`,
    );
  }

  return response.json();
}

export async function getCachedKevFeed(): Promise<CisaKevFeed | null> {
  const now = Date.now();
  if (
    kevCache.data &&
    kevCache.fetchedAt &&
    now - kevCache.fetchedAt < KEV_CACHE_TTL_MS
  ) {
    return kevCache.data;
  }

  try {
    const data = await fetchKevFeed();
    kevCache = { data, fetchedAt: now };
    return data;
  } catch {
    return kevCache.data ?? null;
  }
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
    const feed = await getCachedKevFeed();
    if (!feed) {
      return {
        available: false,
        lastFetched: null,
        error: "Unable to fetch CISA KEV catalog",
        rateLimited: false,
      };
    }

    return {
      available: true,
      lastFetched: new Date(kevCache.fetchedAt ?? 0).toISOString(),
      error: null,
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
  kevCache = { data: null, fetchedAt: null };
}
