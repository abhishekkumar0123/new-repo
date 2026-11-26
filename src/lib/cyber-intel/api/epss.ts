import { CveRecord, EpssInfo, SourceStatus } from "../types";

const EPSS_BASE_URL = "https://api.first.org/data/v1/epss";
const EPSS_MAX_IDS_PER_REQUEST = 100;

interface EpssApiResponse {
  status?: string;
  data?: Array<{
    cve: string;
    epss: string | number;
    percentile: string | number;
    date: string;
  }>;
}

interface EpssCacheEntry {
  data: EpssInfo;
  fetchedAt: number;
}

let epssCache: Record<string, EpssCacheEntry> = {};

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

function parseScore(value: string | number | undefined): number | null {
  if (value === undefined || value === null) return null;
  const parsed = typeof value === "number" ? value : parseFloat(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getCachedEpss(cveId: string): EpssInfo | null {
  const cached = epssCache[cveId.toUpperCase()];
  if (!cached) return null;
  return Date.now() - cached.fetchedAt < EPSS_CACHE_TTL_MS ? cached.data : null;
}

function chunkIds(ids: string[], size: number): string[][] {
  const chunks: string[][] = [];
  for (let i = 0; i < ids.length; i += size) {
    chunks.push(ids.slice(i, i + size));
  }
  return chunks;
}

async function fetchEpssChunk(
  cveIds: string[],
  results: Map<string, EpssInfo | null>,
  signal?: AbortSignal,
): Promise<void> {
  await throttleEpssRequest();

  // FIRST EPSS accepts a comma-separated `cve` parameter (up to 100 IDs).
  const params = new URLSearchParams({ cve: cveIds.join(",") });
  const response = await fetch(`${EPSS_BASE_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
    signal,
  });

  if (!response.ok) {
    throw new Error(`FIRST EPSS returned HTTP ${response.status}`);
  }

  const payload = (await response.json()) as EpssApiResponse;
  if (payload.status && payload.status !== "OK") {
    throw new Error(`FIRST EPSS returned status ${payload.status}`);
  }
  if (!Array.isArray(payload.data)) {
    throw new Error("FIRST EPSS returned an invalid response");
  }

  const requested = new Set(cveIds);
  const fetchedAt = Date.now();

  for (const entry of payload.data) {
    const cveId = typeof entry.cve === "string" ? entry.cve.toUpperCase() : "";
    if (!requested.has(cveId)) continue;

    const info: EpssInfo = {
      score: parseScore(entry.epss),
      percentile: parseScore(entry.percentile),
      date: typeof entry.date === "string" ? entry.date : null,
    };
    results.set(cveId, info);
    epssCache[cveId] = { data: info, fetchedAt };
  }
}

export async function fetchEpssForCve(cveId: string): Promise<EpssInfo | null> {
  const map = await fetchEpssBatch([cveId]);
  return map.get(cveId.toUpperCase()) ?? null;
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

/**
 * Batch EPSS lookup. One request handles up to 100 CVEs, avoiding per-CVE
 * request storms and the old 3-way concurrency throttle.
 */
export async function fetchEpssBatch(
  cveIds: string[],
  options: { signal?: AbortSignal } = {},
): Promise<Map<string, EpssInfo | null>> {
  const unique = [
    ...new Set(
      cveIds
        .map((id) => id.trim().toUpperCase())
        .filter((id) => /^CVE-\d{4}-\d{4,7}$/.test(id)),
    ),
  ];

  const results = new Map<string, EpssInfo | null>();
  for (const cveId of unique) {
    const cached = getCachedEpss(cveId);
    if (cached) results.set(cveId, cached);
  }

  const uncached = unique.filter((id) => !results.has(id));
  for (const chunk of chunkIds(uncached, EPSS_MAX_IDS_PER_REQUEST)) {
    if (options.signal?.aborted) break;
    try {
      await fetchEpssChunk(chunk, results, options.signal);
    } catch {
      for (const cveId of chunk) {
        if (!results.has(cveId)) results.set(cveId, null);
      }
    }
  }

  for (const cveId of unique) {
    if (!results.has(cveId)) results.set(cveId, null);
  }

  return results;
}

export async function checkFirstEpssAvailability(): Promise<SourceStatus> {
  try {
    const result = await fetchEpssForCve("CVE-2021-44228");

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
