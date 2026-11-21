import { CveRecord, EpssInfo, SourceStatus } from "../types";

const EPSS_BASE_URL = "https://api.first.org/data/v1/epss";

interface EpssApiResponse {
  status: string;
  data: Array<{
    cve: string;
    epss: string;
    percentile: string;
    date: string;
  }>;
}

let epssCache: Record<string, { data: EpssInfo; fetchedAt: number }> = {};

const EPSS_CACHE_TTL_MS = 60 * 60 * 1000;
const EPSS_REQUEST_DELAY_MS = 1000;
let lastEpssRequestTime = 0;

async function throttleEpssRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastEpssRequestTime;
  if (elapsed < EPSS_REQUEST_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, EPSS_REQUEST_DELAY_MS - elapsed),
    );
  }
  lastEpssRequestTime = Date.now();
}

async function fetchEpssForCve(cveId: string): Promise<EpssInfo | null> {
  const now = Date.now();
  const cached = epssCache[cveId.toUpperCase()];
  if (cached && now - cached.fetchedAt < EPSS_CACHE_TTL_MS) {
    return cached.data;
  }

  await throttleEpssRequest();

  const url = `${EPSS_BASE_URL}?cve=${encodeURIComponent(cveId)}`;
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as EpssApiResponse;

  if (data.status !== "OK" || !data.data || data.data.length === 0) {
    return null;
  }

  const entry = data.data[0];
  const result: EpssInfo = {
    score: parseFloat(entry.epss) || null,
    percentile: parseFloat(entry.percentile) || null,
    date: entry.date ?? null,
  };

  epssCache[cveId.toUpperCase()] = { data: result, fetchedAt: now };
  return result;
}

export async function enrichCveWithEpss(cve: CveRecord): Promise<CveRecord> {
  try {
    const epss = await fetchEpssForCve(cve.cveId);
    return {
      ...cve,
      epss: epss ?? {
        score: null,
        percentile: null,
        date: null,
      },
    };
  } catch {
    return cve;
  }
}

export async function checkFirstEpssAvailability(): Promise<SourceStatus> {
  try {
    const testId = "CVE-2021-44228";
    const result = await fetchEpssForCve(testId);

    return {
      available: result !== null,
      lastFetched: new Date().toISOString(),
      error: result === null ? "No data returned for test CVE" : null,
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

export function clearEpssCache(): void {
  epssCache = {};
}
