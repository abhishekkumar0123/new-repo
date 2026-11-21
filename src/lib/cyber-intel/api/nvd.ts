import {
  CveRecord,
  CveSearchParams,
  CveListResult,
  CveIntelligenceStatus,
  SourceStatus,
  CvssVersion,
  CvssSeverity,
} from "../types";

const NVD_BASE_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";
const NVD_REQUEST_DELAY_MS = 7000;

interface NvdCveItem {
  cve: {
    id: string;
    identifier: string;
    vulnStatus: string;
    descriptions: Array<{ lang: string; value: string }>;
    published: string;
    lastModified: string;
    cvssMetricV2?: Array<{
      cvssData: {
        version: string;
        vectorString: string;
        baseScore: number;
        baseSeverity: string;
        exploitabilityScore: number;
        impactScore: number;
      };
    }>;
    cvssMetricV31?: Array<{
      cvssData: {
        version: string;
        vectorString: string;
        baseScore: number;
        baseSeverity: string;
        exploitabilityScore: number;
        impactScore: number;
      };
    }>;
    cvssMetricV40?: Array<{
      cvssData: {
        version: string;
        vectorString: string;
        baseScore: number;
        baseSeverity: string;
        exploitabilityScore: number;
        impactScore: number;
      };
    }>;
    weaknesses?: Array<{
      type: string;
      description: Array<{ lang: string; value: string }>;
    }>;
    configurations?: Array<{
      nodes: Array<{
        cpeMatch: Array<{
          vulnerable: boolean;
          criteria: string;
          matchCriteriaId: string;
          versionStartIncluding?: string;
          versionStartExcluding?: string;
          versionEndIncluding?: string;
          versionEndExcluding?: string;
        }>;
      }>;
    }>;
    references: Array<{
      url: string;
      source: string;
      tags: string[];
    }>;
  };
}

interface NvdApiResponse {
  resultsPerPage: number;
  startIndex: number;
  totalResults: number;
  vulnerabilityConfigs: NvdCveItem[];
  vulnerabilityItems: NvdCveItem[];
}

interface NvdCveByIdResponse {
  vulnerabilityItems: NvdCveItem[];
}

let lastNvdRequestTime = 0;

async function throttleNvdRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastNvdRequestTime;
  if (elapsed < NVD_REQUEST_DELAY_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, NVD_REQUEST_DELAY_MS - elapsed),
    );
  }
  lastNvdRequestTime = Date.now();
}

function buildNvdUrl(params: CveSearchParams): string {
  const searchParams = new URLSearchParams();

  if (params.cveId) searchParams.set("cveId", params.cveId);
  if (params.keyword) searchParams.set("keywordSearch", params.keyword);
  if (params.severity) searchParams.set("cvssV3Severity", params.severity);
  if (params.cweId) searchParams.set("cweId", params.cweId);
  if (params.vendor) searchParams.set("vendorName", params.vendor);
  if (params.publishedStartDate)
    searchParams.set("pubStartDate", `${params.publishedStartDate}T00:00:00:000 UTC-00:00`);
  if (params.publishedEndDate)
    searchParams.set("pubEndDate", `${params.publishedEndDate}T23:59:59:999 UTC-00:00`);
  if (params.lastModifiedStartDate)
    searchParams.set("lastModStartDate", `${params.lastModifiedStartDate}T00:00:00:000 UTC-00:00`);
  if (params.lastModifiedEndDate)
    searchParams.set("lastModEndDate", `${params.lastModifiedEndDate}T23:59:59:999 UTC-00:00`);
  if (params.resultsPerPage)
    searchParams.set("resultsPerPage", String(params.resultsPerPage));
  if (params.startIndex) searchParams.set("startIndex", String(params.startIndex));

  return `${NVD_BASE_URL}?${searchParams.toString()}`;
}

function parseCvssMetric(item: NvdCveItem): CveRecord["cvss"] {
  const metrics: CveRecord["cvss"] = [];

  const versionMap: Record<string, CvssVersion> = {
    "2.0": "2.0",
    "3.1": "3.1",
    "4.0": "4.0",
  };

  const pushMetric = (key: "cvssMetricV2" | "cvssMetricV31" | "cvssMetricV40") => {
    const metric = item.cve[key]?.[0];
    if (!metric) return;
    const { cvssData } = metric;
    const version = versionMap[cvssData.version] || ("3.1" as CvssVersion);
    metrics.push({
      version,
      vectorString: cvssData.vectorString ?? null,
      baseScore: cvssData.baseScore ?? null,
      baseSeverity: cvssData.baseSeverity as CvssSeverity | null,
      exploitabilityScore: cvssData.exploitabilityScore ?? null,
      impactScore: cvssData.impactScore ?? null,
    });
  };

  pushMetric("cvssMetricV31");
  pushMetric("cvssMetricV2");
  pushMetric("cvssMetricV40");

  return metrics;
}

function parseCweInfo(item: NvdCveItem): CveRecord["cwe"] {
  const cwes: CveRecord["cwe"] = [];
  const seen = new Set<string>();

  for (const weakness of item.cve.weaknesses ?? []) {
    for (const desc of weakness.description ?? []) {
      if (desc.lang !== "en") continue;
      const id = desc.value;
      if (id && !seen.has(id)) {
        seen.add(id);
        cwes.push({ id, name: null, description: null });
      }
    }
  }

  return cwes;
}

function parseAffectedProducts(item: NvdCveItem): CveRecord["affectedProducts"] {
  const products: CveRecord["affectedProducts"] = [];
  const seen = new Set<string>();

  for (const config of item.cve.configurations ?? []) {
    for (const node of config.nodes ?? []) {
      for (const match of node.cpeMatch ?? []) {
        if (!match.vulnerable) continue;
        const parts = match.criteria.split(":");
        const vendor = parts.length > 3 ? parts[3] : null;
        const product = parts.length > 4 ? parts[4] : null;
        const key = `${vendor ?? ""}|${product ?? ""}`;
        if (seen.has(key)) continue;
        seen.add(key);

        const versions: string[] = [];
        if (match.versionStartIncluding) versions.push(`>=${match.versionStartIncluding}`);
        if (match.versionStartExcluding) versions.push(`>${match.versionStartExcluding}`);
        if (match.versionEndIncluding) versions.push(`<=${match.versionEndIncluding}`);
        if (match.versionEndExcluding) versions.push(`<${match.versionEndExcluding}`);

        products.push({
          vendor,
          product,
          versions,
          versionStatus: "affected",
        });
      }
    }
  }

  return products;
}

function parseReferences(item: NvdCveItem): CveRecord["references"] {
  return (item.cve.references ?? []).map((ref) => ({
    url: ref.url ?? null,
    source: ref.source ?? null,
    tags: ref.tags ?? [],
  }));
}

function mapNvdItemToCveRecord(
  item: NvdCveItem,
): CveRecord {
  const descriptions = item.cve.descriptions ?? [];
  const englishDesc =
    descriptions.find((d) => d.lang === "en")?.value ?? descriptions[0]?.value ?? null;

  return {
    id: item.cve.id,
    cveId: item.cve.identifier || item.cve.id,
    description: englishDesc,
    publishedDate: item.cve.published ?? null,
    lastModifiedDate: item.cve.lastModified ?? null,
    cvss: parseCvssMetric(item),
    cwe: parseCweInfo(item),
    affectedProducts: parseAffectedProducts(item),
    references: parseReferences(item),
    kev: {
      inKev: false,
      dateAdded: null,
      dueDate: null,
      ransomwareCampaign: null,
      source: null,
    },
    epss: {
      score: null,
      percentile: null,
      date: null,
    },
    source: {
      source: "nvd",
      fetchedAt: null,
      rawUrl: null,
    },
  };
}

async function fetchNvdJson<T>(url: string): Promise<T> {
  await throttleNvdRequest();
  const response = await fetch(url, {
    headers: {
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  if (!response.ok) {
    if (response.status === 403) {
      throw new Error("NVD API rate limit exceeded. Please try again later.");
    }
    if (response.status === 404) {
      throw new Error("NVD API endpoint not found.");
    }
    throw new Error(`NVD API error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

export type { CveSearchParams } from "../types";

export async function fetchNvdCveList(
  params: CveSearchParams,
): Promise<CveListResult> {
  const url = buildNvdUrl(params);
  const data = await fetchNvdJson<NvdApiResponse>(url);

  const items = data.vulnerabilityItems ?? data.vulnerabilityConfigs ?? [];
  const cves = items.map(mapNvdItemToCveRecord);

  return {
    cves,
    totalResults: data.totalResults ?? 0,
    resultsPerPage: data.resultsPerPage ?? cves.length,
    startIndex: data.startIndex ?? 0,
    hasMore:
      (data.startIndex ?? 0) + cves.length < (data.totalResults ?? 0),
  };
}

export async function fetchNvdCveById(cveId: string): Promise<CveRecord | null> {
  const url = `${NVD_BASE_URL}?cveId=${encodeURIComponent(cveId)}`;
  const data = await fetchNvdJson<NvdCveByIdResponse>(url);

  const items = data.vulnerabilityItems ?? [];
  if (items.length === 0) return null;

  return mapNvdItemToCveRecord(items[0]);
}

export async function checkNvdAvailability(): Promise<SourceStatus> {
  try {
    await throttleNvdRequest();
    const response = await fetch(`${NVD_BASE_URL}?resultsPerPage=1`, {
      headers: {
        Accept: "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
    });

    if (response.status === 403) {
      return {
        available: false,
        lastFetched: new Date().toISOString(),
        error: "Rate limited",
        rateLimited: true,
      };
    }

    return {
      available: response.ok,
      lastFetched: new Date().toISOString(),
      error: response.ok ? null : `HTTP ${response.status}`,
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
