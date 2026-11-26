import { stripHtml, sanitizeUrl } from "../security-news";
import type { CvssSeverity } from "../../types";

const GITHUB_ADVISORIES_URL = "https://api.github.com/advisories";
const CACHE_TTL_MS = 20 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 15000;
const MAX_DESCRIPTION_LENGTH = 1200;

export interface GithubAdvisory {
  ghsaId: string;
  cveId: string | null;
  url: string;
  title: string;
  description: string | null;
  advisoryType: "reviewed" | "unreviewed" | "malware";
  severity: CvssSeverity | null;
  cvssScore: number | null;
  cvssVector: string | null;
  epssScore: number | null;
  epssPercentile: number | null;
  publishedAt: string | null;
  updatedAt: string | null;
  cwes: string[];
  packages: string[];
  vulnerableVersions: string[];
  references: string[];
}

export interface GithubAdvisoryResult {
  advisories: GithubAdvisory[];
  available: boolean;
  error: string | null;
  fetchedAt: string;
}

interface CacheEntry {
  result: GithubAdvisoryResult;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

function asSeverity(raw: unknown): CvssSeverity | null {
  if (typeof raw !== "string") return null;
  const upper = raw.toUpperCase();
  return upper === "CRITICAL" ||
    upper === "HIGH" ||
    upper === "MEDIUM" ||
    upper === "LOW"
    ? (upper as CvssSeverity)
    : null;
}

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const text = stripHtml(value).slice(0, max).trim();
  return text || null;
}

function parseDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? null : new Date(timestamp).toISOString();
}

function normalizeAdvisory(raw: Record<string, unknown>): GithubAdvisory | null {
  const ghsaId = typeof raw.ghsa_id === "string" ? raw.ghsa_id : null;
  const rawUrl = typeof raw.html_url === "string" ? raw.html_url : "";
  const url = sanitizeUrl(rawUrl);
  const title = cleanText(raw.summary, 512);
  if (!ghsaId || !url || !title) return null;

  const cvss = raw.cvss as Record<string, unknown> | undefined;
  const cvssV3 = cvss?.cvss_v3 as Record<string, unknown> | undefined;
  const cvssV4 = cvss?.cvss_v4 as Record<string, unknown> | undefined;
  const primary = cvssV3 ?? cvssV4;
  const score = typeof primary?.score === "number" ? primary.score : null;
  const vector = typeof primary?.vector_string === "string" ? primary.vector_string : null;

  const epss = raw.epss as Record<string, unknown> | undefined;
  const cwes = Array.isArray(raw.cwes)
    ? raw.cwes
        .map((entry) => {
          const item = entry as Record<string, unknown>;
          return typeof item.cwe_id === "string" ? item.cwe_id : null;
        })
        .filter((id): id is string => Boolean(id))
        .slice(0, 8)
    : [];

  const packages: string[] = [];
  const vulnerableVersions: string[] = [];
  if (Array.isArray(raw.vulnerabilities)) {
    for (const entry of raw.vulnerabilities.slice(0, 20)) {
      const item = entry as Record<string, unknown>;
      const pkg = item.package as Record<string, unknown> | undefined;
      const name = typeof pkg?.name === "string" ? pkg.name : null;
      const ecosystem = typeof pkg?.ecosystem === "string" ? pkg.ecosystem : null;
      if (name) packages.push(ecosystem ? `${ecosystem}:${name}` : name);
      if (typeof item.vulnerable_version_range === "string") {
        vulnerableVersions.push(item.vulnerable_version_range);
      }
      if (typeof item.first_patched_version === "string") {
        vulnerableVersions.push(`fixed in ${item.first_patched_version}`);
      }
    }
  }

  const references = Array.isArray(raw.references)
    ? raw.references
        .map((ref) => (typeof ref === "string" ? sanitizeUrl(ref) : null))
        .filter((ref): ref is string => Boolean(ref))
        .slice(0, 12)
    : [];

  const advisoryType =
    raw.type === "unreviewed" || raw.type === "malware" ? raw.type : "reviewed";

  return {
    ghsaId,
    cveId: typeof raw.cve_id === "string" ? raw.cve_id.toUpperCase() : null,
    url,
    title,
    description: cleanText(raw.description, MAX_DESCRIPTION_LENGTH),
    advisoryType,
    severity: asSeverity(raw.severity),
    cvssScore: score,
    cvssVector: vector,
    epssScore: typeof epss?.percentage === "number" ? epss.percentage / 100 : null,
    epssPercentile: typeof epss?.percentile === "number" ? epss.percentile : null,
    publishedAt: parseDate(raw.published_at),
    updatedAt: parseDate(raw.updated_at),
    cwes,
    packages: [...new Set(packages)].slice(0, 10),
    vulnerableVersions: [...new Set(vulnerableVersions)].slice(0, 10),
    references,
  };
}

async function fetchSeverityPage(
  severity: "critical" | "high",
): Promise<GithubAdvisory[]> {
  const params = new URLSearchParams({
    severity,
    sort: "published",
    direction: "desc",
    per_page: "100",
  });

  const response = await fetch(`${GITHUB_ADVISORIES_URL}?${params.toString()}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  if (response.status === 403 || response.status === 429) {
    throw new Error(
      "GitHub unauthenticated API rate limit reached (60 requests/hour). Try again later.",
    );
  }
  if (!response.ok) {
    throw new Error(`GitHub advisories returned HTTP ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!Array.isArray(body)) return [];

  const advisories: GithubAdvisory[] = [];
  for (const entry of body) {
    if (!entry || typeof entry !== "object") continue;
    const normalized = normalizeAdvisory(entry as Record<string, unknown>);
    if (normalized) advisories.push(normalized);
  }
  return advisories;
}

export async function fetchGithubAdvisories(
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
): Promise<GithubAdvisoryResult> {
  const fetchedAt = new Date().toISOString();
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.result;
  }

  const results = await Promise.allSettled([
    fetchSeverityPage("critical"),
    fetchSeverityPage("high"),
  ]);
  const advisories: GithubAdvisory[] = [];
  const errors: string[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      advisories.push(...result.value);
    } else {
      errors.push(
        result.reason instanceof Error ? result.reason.message : "Request failed",
      );
    }
  }

  const byId = new Map<string, GithubAdvisory>();
  for (const advisory of advisories) {
    if (!byId.has(advisory.ghsaId)) byId.set(advisory.ghsaId, advisory);
  }
  const unique = [...byId.values()].sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return bTime - aTime;
  });

  const result: GithubAdvisoryResult = {
    advisories: unique,
    available: unique.length > 0,
    error: errors.length > 0 ? errors.join("; ") : null,
    fetchedAt,
  };
  cache = { result, fetchedAt: Date.now() };
  return result;
}

export function clearGithubAdvisoriesCache(): void {
  cache = null;
}
