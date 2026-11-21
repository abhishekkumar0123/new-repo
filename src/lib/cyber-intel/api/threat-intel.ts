import {
  checkUrlhausAvailability,
  fetchUrlhausRecent,
  clearUrlhausCache,
} from "./urlhaus";
import {
  checkThreatFoxAvailability,
  fetchThreatFoxRecent,
  searchThreatFoxIOC,
  clearThreatFoxCache,
} from "./threatfox";
import type {
  IOCRecord,
  IOCListResult,
  IOCSearchParams,
  ThreatActivityEntry,
  ThreatIntelSourceStatus,
  ThreatIntelStatus,
  ThreatClassification,
  IOCType,
  IOCSource,
} from "../types/ioc";

const AUTH_KEY = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_THREAT_INTEL_AUTH_KEY as string | undefined)
  : undefined;

function getAuthKey(): string | undefined {
  return AUTH_KEY;
}

export {
  fetchUrlhausRecent,
  fetchThreatFoxRecent,
  searchThreatFoxIOC,
  clearUrlhausCache,
  clearThreatFoxCache,
  getAuthKey,
  type IOCRecord,
};

export async function fetchAllThreatIntel({
  urlhausDays,
  threatfoxDays,
}: {
  urlhausDays?: number;
  threatfoxDays?: number;
}): Promise<IOCRecord[]> {
  const authKey = getAuthKey();
  const [urlhausIOCs, threatfoxIOCs] = await Promise.all([
    fetchUrlhausRecent({ authKey, limit: 100 }),
    fetchThreatFoxRecent({ authKey, days: threatfoxDays ?? 1 }),
  ]);

  return [...urlhausIOCs, ...threatfoxIOCs];
}

export async function checkThreatIntelStatus(): Promise<ThreatIntelStatus> {
  const authKey = getAuthKey();
  const [urlhaus, threatfox] = await Promise.all([
    checkUrlhausAvailability({ authKey }),
    checkThreatFoxAvailability({ authKey }),
  ]);

  const sources = [urlhaus, threatfox];
  const overallAvailable = sources.some((s) => s.available);

  return {
    sources,
    lastRefresh: new Date().toISOString(),
    overallAvailable,
  };
}

export function normalizeIOCs(rawIOCs: IOCRecord[]): IOCRecord[] {
  const seen = new Set<string>();
  const normalized: IOCRecord[] = [];

  for (const ioc of rawIOCs) {
    const dedupeKey = `${ioc.type}:${ioc.value.toLowerCase()}:${ioc.source}`;
    if (seen.has(dedupeKey)) continue;
    seen.add(dedupeKey);
    normalized.push(ioc);
  }

  return normalized;
}

export function filterIOCs(
  iocs: IOCRecord[],
  params: IOCSearchParams,
): IOCRecord[] {
  let result = [...iocs];

  if (params.query) {
    const q = params.query.trim().toLowerCase();
    result = result.filter((ioc) => {
      const haystack = [
        ioc.value,
        ioc.malwareFamily ?? "",
        ioc.malwareAlias ?? "",
        ioc.tags.join(" "),
        ioc.classification,
      ].join(" ").toLowerCase();
      return haystack.includes(q);
    });
  }

  if (params.type !== "All") {
    result = result.filter((ioc) => ioc.type === params.type);
  }

  if (params.classification !== "All") {
    result = result.filter((ioc) => ioc.classification === params.classification);
  }

  if (params.source !== "All") {
    result = result.filter((ioc) => ioc.source === params.source);
  }

  if (params.malwareFamily !== "All") {
    result = result.filter(
      (ioc) =>
        (ioc.malwareFamily ?? "").toLowerCase() ===
        params.malwareFamily!.toLowerCase(),
    );
  }

  if (params.tag !== "All") {
    result = result.filter((ioc) => ioc.tags.includes(params.tag!));
  }

  if (params.confidence !== "All") {
    result = result.filter((ioc) => ioc.confidence === params.confidence);
  }

  return result;
}

export function sortIOCs(
  iocs: IOCRecord[],
  sortBy: IOCSearchParams["sortBy"],
  sortOrder: IOCSearchParams["sortOrder"],
): IOCRecord[] {
  return [...iocs].sort((a, b) => {
    let comparison = 0;

    if (sortBy === "firstSeen") {
      const aDate = a.firstSeen ? new Date(a.firstSeen).getTime() : 0;
      const bDate = b.firstSeen ? new Date(b.firstSeen).getTime() : 0;
      comparison = aDate - bDate;
    } else if (sortBy === "lastSeen") {
      const aDate = a.lastSeen ? new Date(a.lastSeen).getTime() : 0;
      const bDate = b.lastSeen ? new Date(b.lastSeen).getTime() : 0;
      comparison = aDate - bDate;
    } else if (sortBy === "value") {
      comparison = a.value.localeCompare(b.value);
    } else {
      comparison = a.type.localeCompare(b.type);
    }

    return sortOrder === "desc" ? -comparison : comparison;
  });
}

export function paginateIOCs<T>(
  items: T[],
  page: number,
  pageSize: number,
): { items: T[]; totalPages: number; totalItems: number; currentPage: number } {
  const totalItems = items.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.max(1, Math.min(page, totalPages));
  const start = (safePage - 1) * pageSize;
  const end = start + pageSize;

  return {
    items: items.slice(start, end),
    totalPages,
    totalItems,
    currentPage: safePage,
  };
}

export function buildIOCListResult(
  iocs: IOCRecord[],
  params: IOCSearchParams,
  totalResults: number,
): IOCListResult {
  const resultsPerPage = params.pageSize ?? 25;
  const startIndex = params.page ?? 1;
  const paginated = iocs.slice(
    (startIndex - 1) * resultsPerPage,
    startIndex * resultsPerPage,
  );

  return {
    iocs: paginated,
    totalResults,
    resultsPerPage,
    startIndex,
    hasMore: startIndex * resultsPerPage < totalResults,
  };
}

export function getIOCTypeLabel(type: IOCType): string {
  const labels: Record<IOCType, string> = {
    ip: "IP Address",
    domain: "Domain",
    url: "URL",
    hash: "File Hash",
    email: "Email",
  };
  return labels[type];
}

export function getIOCTypeColor(type: IOCType): string {
  const colors: Record<IOCType, string> = {
    ip: "#58d7f7",
    domain: "#00ff91",
    url: "#ffca8a",
    hash: "#ff7b72",
    email: "#bb86fc",
  };
  return colors[type];
}

export function getClassificationColor(classification: ThreatClassification): string {
  const colors: Record<ThreatClassification, string> = {
    malware_distribution: "#ff7b72",
    phishing: "#ffca8a",
    botnet_cc: "#ff6b6b",
    trojan: "#fb8500",
    ransomware: "#ff0000",
    spyware: "#ff9a92",
    botnet: "#ff6b6b",
    miner: "#fbbf24",
    dropper: "#ff9a92",
    loader: "#ffca8a",
    unknown: "#77847e",
  };
  return colors[classification];
}

export function getClassificationLabel(classification: ThreatClassification): string {
  const labels: Record<ThreatClassification, string> = {
    malware_distribution: "Malware Distribution",
    phishing: "Phishing",
    botnet_cc: "Botnet C2",
    trojan: "Trojan",
    ransomware: "Ransomware",
    spyware: "Spyware",
    botnet: "Botnet",
    miner: "Crypto Miner",
    dropper: "Dropper",
    loader: "Loader",
    unknown: "Unknown",
  };
  return labels[classification];
}

export function getSourceLabel(source: IOCSource): string {
  const labels: Record<IOCSource, string> = {
    urlhaus: "URLhaus",
    threatfox: "ThreatFox",
    otx: "AlienVault OTX",
  };
  return labels[source];
}

export function buildThreatActivity(iocs: IOCRecord[]): ThreatActivityEntry[] {
  return iocs
    .sort(
      (a, b) =>
        new Date(b.lastSeen ?? b.firstSeen ?? 0).getTime() -
        new Date(a.lastSeen ?? a.firstSeen ?? 0).getTime(),
    )
    .slice(0, 10)
    .map((ioc) => ({
      id: ioc.id,
      type: "new-ioc",
      indicator: ioc.value,
      indicatorType: ioc.type,
      classification: ioc.classification,
      date: ioc.lastSeen ?? ioc.firstSeen ?? "",
      source: ioc.source,
      sourceName: ioc.sourceName,
      tags: ioc.tags,
      href: `/threat-intelligence?ioc=${encodeURIComponent(ioc.value)}`,
    }));
}
