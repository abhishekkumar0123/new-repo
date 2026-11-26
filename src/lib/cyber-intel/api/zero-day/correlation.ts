import { fetchNvdCvesByIds } from "../nvd";
import { fetchEpssBatch } from "../epss";
import {
  fetchSecurityNews,
  getNewsProxyUrl,
  sanitizeUrl,
} from "../security-news";
import {
  getKevFeedWithStatus,
  clearKevCache,
  type CisaKevVulnerability,
  type KevFeedResult,
} from "../cisa-kev";
import { clearEpssCache } from "../epss";
import type { CveRecord, EpssInfo } from "../../types";
import type {
  AlertCategory,
  ExploitEntry,
  ExploitationStatus,
  IntelAlert,
  SourceState,
  VendorProductIntel,
  ZeroDayDataset,
  ZeroDayRecord,
  ZeroDaySourceId,
  ZeroDaySourceStatus,
} from "../../types/zero-day";
import {
  fetchGithubAdvisories,
  clearGithubAdvisoriesCache,
  type GithubAdvisory,
  type GithubAdvisoryResult,
} from "./github-advisories";
import {
  fetchExploitDbEntries,
  clearExploitDbCache,
  type ExploitDbResult,
} from "./exploit-db";
import {
  fetchCisaAdvisories,
  clearCisaAdvisoriesCache,
  type CisaAdvisoryResult,
} from "./cisa-advisories";
import { classifyAlertText, hasExploitationEvidence, isZeroDayText } from "./classification";
import { isZeroDayProxyConfigured } from "./proxy";

const MAX_ENRICHED_CVES = 100;
const MAX_ALERTS = 120;
const MAX_NEWS_RECORDS = 25;
const MAX_EXPLOIT_RECORDS = 25;
const RECENT_CANDIDATE_DAYS = 365;

const SOURCE_META: Record<
  ZeroDaySourceId,
  { name: string; href: string; detail: string }
> = {
  "cisa-kev": {
    name: "CISA KEV",
    href: "https://www.cisa.gov/known-exploited-vulnerabilities-catalog",
    detail: "Known Exploited Vulnerabilities catalog",
  },
  nvd: {
    name: "NVD 2.0",
    href: "https://nvd.nist.gov/developers/vulnerabilities",
    detail: "CVSS, CWE, and affected-product enrichment",
  },
  "first-epss": {
    name: "FIRST EPSS",
    href: "https://www.first.org/epss/api/",
    detail: "Exploit Prediction Scoring System",
  },
  "github-advisories": {
    name: "GitHub Advisories",
    href: "https://github.com/advisories",
    detail: "GHSA critical/high advisories",
  },
  "exploit-db": {
    name: "Exploit-DB",
    href: "https://www.exploit-db.com/",
    detail: "Public exploit listings (metadata only)",
  },
  "cisa-advisories": {
    name: "CISA Advisories",
    href: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    detail: "Official cybersecurity advisories and alerts",
  },
  "security-news": {
    name: "Security News",
    href: "/security-news",
    detail: "Existing multi-source news aggregation",
  },
  "vulncheck-kev": {
    name: "VulnCheck KEV",
    href: "https://docs.vulncheck.com/kev",
    detail: "Requires an API token; not integrated without credentials",
  },
};

interface SourceFetchResults {
  kev: KevFeedResult;
  github: GithubAdvisoryResult;
  exploits: ExploitDbResult;
  cisaAlerts: CisaAdvisoryResult;
  news: Awaited<ReturnType<typeof fetchSecurityNews>>;
}

interface BuildRecordsInput extends SourceFetchResults {
  nvdRecords: Map<string, CveRecord>;
  epssRecords: Map<string, EpssInfo | null>;
}

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

function upperCveId(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  return /^CVE-\d{4}-\d{4,7}$/.test(trimmed) ? trimmed : null;
}

function parseTime(value: string | null | undefined): number {
  if (!value) return 0;
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function alertCategoryFromNews(article: {
  title: string;
  excerpt: string | null;
  category: string;
}): AlertCategory {
  switch (article.category) {
    case "zero-day":
      return "zero-day";
    case "ransomware":
      return "active-exploitation";
    case "research":
      return "research-disclosure";
    case "vendor-advisory":
      return "vendor-advisory";
    default:
      return classifyAlertText(article.title, article.excerpt);
  }
}

function mergeCategories(...groups: Array<Array<AlertCategory> | undefined>): AlertCategory[] {
  return unique(groups.flatMap((group) => group ?? []));
}

function makeStatus(
  id: ZeroDaySourceId,
  state: SourceState,
  detail: string,
  fetchedAt: string | null,
  error: string | null = null,
): ZeroDaySourceStatus {
  const meta = SOURCE_META[id];
  return {
    id,
    name: meta.name,
    state,
    available: state === "live",
    error,
    detail: error && detail ? `${detail} — ${error}` : detail || meta.detail,
    href: meta.href,
    fetchedAt,
  };
}

function buildStatuses(
  input: SourceFetchResults,
  nvdMap: Map<string, CveRecord>,
  epssMap: Map<string, EpssInfo | null>,
  nvdError: string | null,
  epssError: string | null,
  priorityCount: number,
): ZeroDaySourceStatus[] {
  const { kev, github, exploits, cisaAlerts, news } = input;
  const now = new Date().toISOString();

  const kevStatus =
    kev.feed && !kev.error
      ? makeStatus("cisa-kev", "live", kev.viaProxy ? "Live via configured proxy" : "Live direct feed", kev.fetchedAt)
      : kev.feed
        ? makeStatus("cisa-kev", "unavailable", `Cached catalog in use (${kev.feed.catalogVersion || "unknown version"})`, kev.fetchedAt, kev.error)
        : makeStatus("cisa-kev", "unavailable", "CISA KEV catalog could not be loaded", kev.fetchedAt, kev.error ?? "No data returned");

  const nvdStatus =
    priorityCount === 0
      ? makeStatus("nvd", "no-data", "No CVE IDs selected for enrichment", null)
      : nvdError
        ? makeStatus("nvd", "unavailable", "NVD enrichment request failed", null, nvdError)
        : nvdMap.size > 0
          ? makeStatus("nvd", "live", `${nvdMap.size} CVE records enriched`, now)
          : makeStatus("nvd", "no-data", "NVD responded but returned no matching records", now);

  const epssStatus =
    priorityCount === 0
      ? makeStatus("first-epss", "no-data", "No CVE IDs selected for enrichment", null)
      : epssError
        ? makeStatus("first-epss", "unavailable", "EPSS enrichment request failed", null, epssError)
        : [...epssMap.values()].some((entry) => entry !== null)
          ? makeStatus("first-epss", "live", "EPSS scores loaded", now)
          : makeStatus("first-epss", "no-data", "EPSS responded but returned no matching scores", github.fetchedAt);

  const githubStatus =
    github.advisories.length > 0
      ? makeStatus("github-advisories", "live", `${github.advisories.length} critical/high advisories`, github.fetchedAt, github.error)
      : github.error
        ? makeStatus("github-advisories", "unavailable", "GitHub advisories could not be loaded", github.fetchedAt, github.error)
        : makeStatus("github-advisories", "no-data", "No advisories returned", github.fetchedAt);

  const exploitStatus = !isZeroDayProxyConfigured()
    ? makeStatus("exploit-db", "not-configured", "RSS fetch requires the configured proxy", null, exploits.error)
    : exploits.entries.length > 0
      ? makeStatus("exploit-db", "live", `${exploits.entries.length} recent listings`, exploits.fetchedAt, exploits.error)
      : makeStatus("exploit-db", "unavailable", "No exploit listings could be loaded", exploits.fetchedAt, exploits.error ?? "No data returned");

  const cisaAdvisoryStatus = !isZeroDayProxyConfigured()
    ? makeStatus("cisa-advisories", "not-configured", "RSS fetch requires the configured proxy", null, cisaAlerts.error)
    : cisaAlerts.alerts.length > 0
      ? makeStatus("cisa-advisories", "live", `${cisaAlerts.alerts.length} advisories and alerts`, cisaAlerts.fetchedAt, cisaAlerts.error)
      : makeStatus("cisa-advisories", "unavailable", "No CISA advisories could be loaded", cisaAlerts.fetchedAt, cisaAlerts.error ?? "No data returned");

  const availableNews = news.availableSources;
  const newsStatus = availableNews > 0
    ? makeStatus("security-news", "live", `${availableNews}/${news.totalSources} feeds available · ${news.articles.length} articles`, news.fetchedAt)
    : !getNewsProxyUrl()
      ? makeStatus("security-news", "not-configured", "News feed proxy is not configured", null, "NEXT_PUBLIC_NEWS_FEED_PROXY_URL is required")
      : makeStatus("security-news", "unavailable", "No security-news feeds could be loaded", news.fetchedAt, "All configured feeds failed");

  const vulnCheckStatus = makeStatus(
    "vulncheck-kev",
    "requires-token",
    "Not integrated: official API requires a bearer token",
    null,
  );

  return [
    kevStatus,
    nvdStatus,
    epssStatus,
    githubStatus,
    exploitStatus,
    cisaAdvisoryStatus,
    newsStatus,
    vulnCheckStatus,
  ];
}

function primaryMetric(record: CveRecord | undefined): CveRecord["cvss"][number] | null {
  if (!record) return null;
  return (
    record.cvss.find((metric) => metric.version === "3.1") ??
    record.cvss.find((metric) => metric.version === "4.0") ??
    record.cvss[0] ??
    null
  );
}

function primaryProduct(record: CveRecord | undefined): CveRecord["affectedProducts"][number] | null {
  if (!record) return null;
  return (
    record.affectedProducts.find((product) => product.vendor && product.product) ??
    record.affectedProducts[0] ??
    null
  );
}

function collectReferences(
  ...groups: Array<Array<string | null | undefined> | undefined>
): string[] {
  return unique(
    groups
      .flatMap((group) => group ?? [])
      .map((value) => (typeof value === "string" ? sanitizeUrl(value) : null))
      .filter((value): value is string => Boolean(value)),
  ).slice(0, 10);
}

function buildPriorityCves(input: SourceFetchResults): string[] {
  const threshold = Date.now() - RECENT_CANDIDATE_DAYS * 24 * 60 * 60 * 1000;
  const candidates = new Map<string, number>();

  const kevCandidates = [...(input.kev.feed?.vulnerabilities ?? [])]
    .filter((vuln) => parseTime(vuln.dateAdded) >= threshold)
    .sort((a, b) => parseTime(b.dateAdded) - parseTime(a.dateAdded))
    .slice(0, 40);
  for (const vuln of kevCandidates) {
    const cveId = upperCveId(vuln.cveID);
    if (cveId) candidates.set(cveId, parseTime(vuln.dateAdded));
  }

  for (const advisory of input.github.advisories) {
    const cveId = upperCveId(advisory.cveId);
    if (!cveId) continue;
    const score = parseTime(advisory.publishedAt) + (advisory.severity === "CRITICAL" ? 1 : 0);
    candidates.set(cveId, Math.max(candidates.get(cveId) ?? 0, score));
  }

  for (const alert of input.cisaAlerts.alerts.slice(0, 50)) {
    for (const cveId of alert.cveIds) {
      candidates.set(cveId, Math.max(candidates.get(cveId) ?? 0, parseTime(alert.publishedAt)));
    }
  }

  for (const article of input.news.articles.slice(0, 60)) {
    for (const cveId of article.cveIds) {
      candidates.set(cveId, Math.max(candidates.get(cveId) ?? 0, parseTime(article.publishedAt)));
    }
  }

  for (const entry of input.exploits.entries) {
    for (const cveId of entry.cveIds) {
      candidates.set(cveId, Math.max(candidates.get(cveId) ?? 0, parseTime(entry.publishedDate)));
    }
  }

  return [...candidates.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([cveId]) => cveId)
    .slice(0, MAX_ENRICHED_CVES);
}

function buildRecords(input: BuildRecordsInput): ZeroDayRecord[] {
  const { kev, github, exploits, cisaAlerts, news, nvdRecords, epssRecords } = input;
  const records = new Map<string, ZeroDayRecord>();

  const ghsaByCve = new Map<string, GithubAdvisory>();
  for (const advisory of github.advisories) {
    const cveId = upperCveId(advisory.cveId);
    if (!cveId) continue;
    const existing = ghsaByCve.get(cveId);
    if (!existing || parseTime(advisory.publishedAt) > parseTime(existing.publishedAt)) {
      ghsaByCve.set(cveId, advisory);
    }
  }

  const exploitsByCve = new Map<string, ExploitEntry[]>();
  for (const entry of exploits.entries) {
    for (const cveId of entry.cveIds) {
      const list = exploitsByCve.get(cveId) ?? [];
      list.push(entry);
      exploitsByCve.set(cveId, list);
    }
  }

  const cisaByCve = new Map<string, IntelAlert[]>();
  for (const alert of cisaAlerts.alerts) {
    for (const cveId of alert.cveIds) {
      const list = cisaByCve.get(cveId) ?? [];
      list.push(alert);
      cisaByCve.set(cveId, list);
    }
  }

  const newsByCve = new Map<string, typeof news.articles>();
  for (const article of news.articles) {
    for (const cveId of article.cveIds) {
      const list = newsByCve.get(cveId) ?? [];
      list.push(article);
      newsByCve.set(cveId, list);
    }
  }

  const getEpss = (cveId: string | null): EpssInfo | null =>
    cveId ? epssRecords.get(cveId) ?? null : null;

  const getReferences = (
    nvd: CveRecord | undefined,
    advisory: GithubAdvisory | undefined,
    matchedCisa: IntelAlert[],
  ): string[] =>
    collectReferences(
      nvd?.references.map((ref) => ref.url),
      advisory?.references,
      matchedCisa.map((alert) => alert.url),
    );

  // 1. Confirmed exploitation records from the complete CISA KEV catalog.
  const kevVulnerabilities = [...(kev.feed?.vulnerabilities ?? [])].sort(
    (a, b) => parseTime(b.dateAdded) - parseTime(a.dateAdded),
  );
  for (const vuln of kevVulnerabilities as CisaKevVulnerability[]) {
    const cveId = upperCveId(vuln.cveID);
    if (!cveId) continue;

    const nvd = nvdRecords.get(cveId);
    const advisory = ghsaByCve.get(cveId);
    const epss = getEpss(cveId);
    const matchedExploits = exploitsByCve.get(cveId) ?? [];
    const matchedCisa = cisaByCve.get(cveId) ?? [];
    const matchedNews = newsByCve.get(cveId) ?? [];
    const metric = primaryMetric(nvd);
    const product = primaryProduct(nvd);
    const sources = new Set<ZeroDaySourceId>(["cisa-kev"]);
    if (nvd) sources.add("nvd");
    if (epss) sources.add("first-epss");
    if (advisory) sources.add("github-advisories");
    if (matchedExploits.length > 0) sources.add("exploit-db");
    if (matchedCisa.length > 0) sources.add("cisa-advisories");
    if (matchedNews.length > 0) sources.add("security-news");

    records.set(cveId, {
      id: cveId,
      cveId,
      identifier: cveId,
      title: vuln.vulnerabilityName || nvd?.description || cveId,
      description: nvd?.description ?? vuln.shortDescription ?? null,
      publishedDate: nvd?.publishedDate ?? null,
      updatedDate: nvd?.lastModifiedDate ?? advisory?.updatedAt ?? null,
      kevDateAdded: vuln.dateAdded ?? null,
      kevDueDate: vuln.dueDate ?? null,
      inKev: true,
      ransomwareCampaign:
        vuln.knownRansomwareCampaignUse === "Known"
          ? true
          : vuln.knownRansomwareCampaignUse === "Unknown"
            ? false
            : null,
      severity: metric?.baseSeverity ?? advisory?.severity ?? null,
      cvssScore: metric?.baseScore ?? advisory?.cvssScore ?? null,
      cvssVector: metric?.vectorString ?? advisory?.cvssVector ?? null,
      epssScore: epss?.score ?? advisory?.epssScore ?? null,
      epssPercentile: epss?.percentile ?? advisory?.epssPercentile ?? null,
      epssDate: epss?.date ?? null,
      vendor: product?.vendor ?? vuln.vendorProject ?? null,
      product: product?.product ?? vuln.product ?? null,
      affectedVersions:
        nvd?.affectedProducts.flatMap((item) => item.versions).slice(0, 10) ??
        advisory?.vulnerableVersions ??
        [],
      cwes: nvd?.cwe.map((entry) => entry.id).filter((id): id is string => Boolean(id)) ?? advisory?.cwes ?? [],
      exploitationStatus: "confirmed-kev",
      exploitIds: unique(matchedExploits.map((entry) => entry.id)),
      advisories: unique([
        ...(advisory ? [advisory.ghsaId] : []),
        ...matchedCisa.map((alert) => alert.title),
      ]),
      referenceUrls: getReferences(nvd, advisory, matchedCisa),
      categories: mergeCategories(
        ["active-exploitation"],
        advisory ? [classifyAlertText(advisory.title, advisory.description)] : [],
        matchedCisa.map((alert) => alert.category),
        matchedNews.map((article) => alertCategoryFromNews(article)),
        [isZeroDayText(`${vuln.vulnerabilityName} ${vuln.shortDescription}`) ? "zero-day" : undefined].filter(
          (value): value is AlertCategory => value !== undefined,
        ),
      ),
      sources: [...sources],
      detailPath: `/vulnerabilities/${cveId}`,
      sourceUrl: advisory?.url ?? matchedCisa[0]?.url ?? null,
    });
  }

  // 2. Recent GitHub advisories, including GHSA-only disclosures.
  for (const advisory of github.advisories) {
    const cveId = upperCveId(advisory.cveId);
    if (cveId && records.has(cveId)) continue;

    const nvd = cveId ? nvdRecords.get(cveId) : undefined;
    const epss = getEpss(cveId);
    const matchedExploits = cveId ? exploitsByCve.get(cveId) ?? [] : [];
    const matchedCisa = cveId ? cisaByCve.get(cveId) ?? [] : [];
    const metric = primaryMetric(nvd);
    const product = primaryProduct(nvd);
    const packageName = advisory.packages[0] ?? null;
    const ecosystem = packageName?.includes(":") ? packageName.split(":")[0] : null;
    const productName = packageName?.includes(":") ? packageName.slice(packageName.indexOf(":") + 1) : packageName;
    const sources = new Set<ZeroDaySourceId>(["github-advisories"]);
    if (nvd) sources.add("nvd");
    if (epss) sources.add("first-epss");
    if (matchedExploits.length > 0) sources.add("exploit-db");
    if (matchedCisa.length > 0) sources.add("cisa-advisories");

    const id = cveId ?? advisory.ghsaId;
    const exploitationStatus: ExploitationStatus =
      matchedExploits.length > 0
        ? "public-exploit-listing"
        : hasExploitationEvidence(`${advisory.title} ${advisory.description ?? ""}`)
          ? "reported-exploitation"
          : "not-reported";

    records.set(id, {
      id,
      cveId,
      identifier: cveId ?? advisory.ghsaId,
      title: advisory.title,
      description: advisory.description,
      publishedDate: advisory.publishedAt,
      updatedDate: advisory.updatedAt,
      kevDateAdded: null,
      kevDueDate: null,
      inKev: false,
      ransomwareCampaign: null,
      severity: metric?.baseSeverity ?? advisory.severity,
      cvssScore: metric?.baseScore ?? advisory.cvssScore,
      cvssVector: metric?.vectorString ?? advisory.cvssVector,
      epssScore: epss?.score ?? advisory.epssScore,
      epssPercentile: epss?.percentile ?? advisory.epssPercentile,
      epssDate: epss?.date ?? null,
      vendor: product?.vendor ?? ecosystem,
      product: product?.product ?? productName,
      affectedVersions:
        nvd?.affectedProducts.flatMap((item) => item.versions).slice(0, 10) ??
        advisory.vulnerableVersions,
      cwes: nvd?.cwe.map((entry) => entry.id).filter((id): id is string => Boolean(id)) ?? advisory.cwes,
      exploitationStatus,
      exploitIds: unique(matchedExploits.map((entry) => entry.id)),
      advisories: unique([advisory.ghsaId, ...matchedCisa.map((alert) => alert.title)]),
      referenceUrls: getReferences(nvd, advisory, matchedCisa),
      categories: mergeCategories(
        [classifyAlertText(advisory.title, advisory.description)],
        matchedCisa.map((alert) => alert.category),
      ),
      sources: [...sources],
      detailPath: cveId ? `/vulnerabilities/${cveId}` : null,
      sourceUrl: advisory.url,
    });
  }

  // 3. CVEs that only appear in the existing security-news aggregation.
  const newsCveIds = [...newsByCve.entries()]
    .filter(([cveId]) => !records.has(cveId))
    .sort((a, b) => {
      const aDate = Math.max(...a[1].map((article) => parseTime(article.publishedAt)));
      const bDate = Math.max(...b[1].map((article) => parseTime(article.publishedAt)));
      return bDate - aDate;
    })
    .slice(0, MAX_NEWS_RECORDS);

  for (const [cveId, articles] of newsCveIds) {
    const nvd = nvdRecords.get(cveId);
    const epss = getEpss(cveId);
    const matchedExploits = exploitsByCve.get(cveId) ?? [];
    const matchedCisa = cisaByCve.get(cveId) ?? [];
    const metric = primaryMetric(nvd);
    const product = primaryProduct(nvd);
    const sources = new Set<ZeroDaySourceId>(["security-news"]);
    if (nvd) sources.add("nvd");
    if (epss) sources.add("first-epss");
    if (matchedExploits.length > 0) sources.add("exploit-db");
    if (matchedCisa.length > 0) sources.add("cisa-advisories");

    const hasExploitation = articles.some((article) =>
      hasExploitationEvidence(`${article.title} ${article.excerpt ?? ""}`),
    );
    const exploitationStatus: ExploitationStatus =
      matchedExploits.length > 0
        ? "public-exploit-listing"
        : hasExploitation
          ? "reported-exploitation"
          : "not-reported";

    records.set(cveId, {
      id: cveId,
      cveId,
      identifier: cveId,
      title: articles[0].title,
      description: articles[0].excerpt,
      publishedDate: articles[0].publishedAt ?? nvd?.publishedDate ?? null,
      updatedDate: nvd?.lastModifiedDate ?? null,
      kevDateAdded: null,
      kevDueDate: null,
      inKev: false,
      ransomwareCampaign: null,
      severity: metric?.baseSeverity ?? null,
      cvssScore: metric?.baseScore ?? null,
      cvssVector: metric?.vectorString ?? null,
      epssScore: epss?.score ?? null,
      epssPercentile: epss?.percentile ?? null,
      epssDate: epss?.date ?? null,
      vendor: product?.vendor ?? null,
      product: product?.product ?? null,
      affectedVersions: nvd?.affectedProducts.flatMap((item) => item.versions).slice(0, 10) ?? [],
      cwes: nvd?.cwe.map((entry) => entry.id).filter((id): id is string => Boolean(id)) ?? [],
      exploitationStatus,
      exploitIds: unique(matchedExploits.map((entry) => entry.id)),
      advisories: matchedCisa.map((alert) => alert.title),
      referenceUrls: collectReferences(
        articles.map((article) => article.url),
        nvd?.references.map((ref) => ref.url),
        matchedCisa.map((alert) => alert.url),
      ),
      categories: mergeCategories(
        articles.map((article) => alertCategoryFromNews(article)),
        matchedCisa.map((alert) => alert.category),
      ),
      sources: [...sources],
      detailPath: `/vulnerabilities/${cveId}`,
      sourceUrl: articles[0].url,
    });
  }

  // 4. Public exploit listings without a published CVE remain visible, but are
  //    never presented as confirmed zero-days or in-the-wild exploitation.
  let exploitRecordsAdded = 0;
  for (const entry of exploits.entries) {
    if (exploitRecordsAdded >= MAX_EXPLOIT_RECORDS) break;
    if (entry.cveIds.some((cveId) => records.has(cveId))) continue;
    exploitRecordsAdded += 1;

    records.set(entry.id, {
      id: entry.id,
      cveId: null,
      identifier: entry.id,
      title: entry.title,
      description: entry.description,
      publishedDate: entry.publishedDate,
      updatedDate: null,
      kevDateAdded: null,
      kevDueDate: null,
      inKev: false,
      ransomwareCampaign: null,
      severity: null,
      cvssScore: null,
      cvssVector: null,
      epssScore: null,
      epssPercentile: null,
      epssDate: null,
      vendor: null,
      product: entry.affectedSoftware,
      affectedVersions: entry.versionHints,
      cwes: [],
      exploitationStatus: "public-exploit-listing",
      exploitIds: [entry.id],
      advisories: [],
      referenceUrls: [entry.url],
      categories: [classifyAlertText(entry.title, entry.description)],
      sources: ["exploit-db"],
      detailPath: null,
      sourceUrl: entry.url,
    });
  }

  return [...records.values()].sort(
    (a, b) =>
      parseTime(b.kevDateAdded ?? b.publishedDate) -
      parseTime(a.kevDateAdded ?? a.publishedDate),
  );
}

function buildAlerts(
  input: SourceFetchResults,
  records: ZeroDayRecord[],
): IntelAlert[] {
  const severityByCve = new Map<string, ZeroDayRecord["severity"]>();
  for (const record of records) {
    if (record.cveId && record.severity) severityByCve.set(record.cveId, record.severity);
  }

  const githubAlerts: IntelAlert[] = input.github.advisories
    .filter((advisory) => advisory.severity === "CRITICAL" || advisory.severity === "HIGH")
    .slice(0, 60)
    .map((advisory) => ({
      id: `github:${advisory.ghsaId}`,
      title: advisory.title,
      excerpt: advisory.description,
      url: advisory.url,
      publishedAt: advisory.publishedAt,
      sourceName: "GitHub Advisory Database",
      sourceType: "github-advisory" as const,
      verification: "published-advisory" as const,
      category: classifyAlertText(advisory.title, advisory.description),
      cveIds: advisory.cveId ? [advisory.cveId.toUpperCase()] : [],
      severity: advisory.severity,
    }));

  const newsAlerts: IntelAlert[] = input.news.articles
    .filter((article) => {
      const text = `${article.title} ${article.excerpt ?? ""}`;
      return (
        isZeroDayText(text) ||
        hasExploitationEvidence(text) ||
        article.cveIds.length > 0 ||
        classifyAlertText(article.title, article.excerpt) === "vendor-advisory"
      );
    })
    .slice(0, 60)
    .map((article) => ({
      id: `news:${article.id}`,
      title: article.title,
      excerpt: article.excerpt,
      url: article.url,
      publishedAt: article.publishedAt,
      sourceName: article.sourceName,
      sourceType: "news-report" as const,
      verification: "unverified" as const,
      category: alertCategoryFromNews(article),
      cveIds: article.cveIds,
      severity: null,
    }));

  const all = [...input.cisaAlerts.alerts, ...githubAlerts, ...newsAlerts];
  const byId = new Map<string, IntelAlert>();
  for (const alert of all) {
    if (!byId.has(alert.id)) byId.set(alert.id, alert);
  }

  return [...byId.values()]
    .map((alert) => ({
      ...alert,
      severity:
        alert.severity ??
        alert.cveIds.map((cveId) => severityByCve.get(cveId)).find(Boolean) ??
        null,
    }))
    .sort((a, b) => parseTime(b.publishedAt) - parseTime(a.publishedAt))
    .slice(0, MAX_ALERTS);
}

function buildVendorIntel(records: ZeroDayRecord[]): VendorProductIntel[] {
  const vendors = new Map<
    string,
    Map<string, { cveIds: Set<string>; exploitIds: Set<string>; advisories: Set<string>; latestDate: string | null }>
  >();

  for (const record of records) {
    const vendor = record.vendor?.trim() || "Unattributed";
    const product = record.product?.trim() || "Unspecified";
    const products = vendors.get(vendor) ?? new Map();
    const entry = products.get(product) ?? {
      cveIds: new Set<string>(),
      exploitIds: new Set<string>(),
      advisories: new Set<string>(),
      latestDate: null,
    };

    if (record.cveId) entry.cveIds.add(record.cveId);
    for (const id of record.exploitIds) entry.exploitIds.add(id);
    for (const advisory of record.advisories) entry.advisories.add(advisory);

    const recordDate = record.kevDateAdded ?? record.publishedDate ?? record.updatedDate;
    if (recordDate && (!entry.latestDate || parseTime(recordDate) > parseTime(entry.latestDate))) {
      entry.latestDate = recordDate;
    }

    products.set(product, entry);
    vendors.set(vendor, products);
  }

  return [...vendors.entries()]
    .map(([vendor, products]) => ({
      vendor,
      products: [...products.entries()]
        .map(([product, data]) => ({
          product,
          cveIds: [...data.cveIds],
          exploitIds: [...data.exploitIds],
          advisories: [...data.advisories],
          latestDate: data.latestDate,
        }))
        .sort((a, b) => parseTime(b.latestDate) - parseTime(a.latestDate)),
    }))
    .sort((a, b) => {
      const aCount = a.products.reduce((sum, product) => sum + product.cveIds.length, 0);
      const bCount = b.products.reduce((sum, product) => sum + product.cveIds.length, 0);
      return bCount - aCount || a.vendor.localeCompare(b.vendor);
    });
}

export async function fetchZeroDayDataset(
  options: { forceRefresh?: boolean; signal?: AbortSignal } = {},
): Promise<ZeroDayDataset> {
  const { forceRefresh = false, signal } = options;

  if (forceRefresh) {
    clearKevCache();
    clearGithubAdvisoriesCache();
    clearExploitDbCache();
    clearCisaAdvisoriesCache();
    clearEpssCache();
  }

  const [kev, github, exploits, cisaAlerts, news] = await Promise.all([
    getKevFeedWithStatus(),
    fetchGithubAdvisories({ forceRefresh }),
    fetchExploitDbEntries({ forceRefresh }),
    fetchCisaAdvisories({ forceRefresh }),
    fetchSecurityNews({ forceRefresh }),
  ]);

  const sourceFetchResults: SourceFetchResults = {
    kev,
    github,
    exploits,
    cisaAlerts,
    news,
  };

  const priorityCves = buildPriorityCves(sourceFetchResults);
  const [nvdOutcome, epssOutcome] = await Promise.allSettled([
    fetchNvdCvesByIds(priorityCves, { signal }),
    fetchEpssBatch(priorityCves, { signal }),
  ]);

  const nvdRecords =
    nvdOutcome.status === "fulfilled" ? nvdOutcome.value : new Map<string, CveRecord>();
  const epssRecords =
    epssOutcome.status === "fulfilled" ? epssOutcome.value : new Map<string, EpssInfo | null>();
  const nvdError =
    nvdOutcome.status === "rejected"
      ? nvdOutcome.reason instanceof Error
        ? nvdOutcome.reason.message
        : "NVD request failed"
      : null;
  const epssError =
    epssOutcome.status === "rejected"
      ? epssOutcome.reason instanceof Error
        ? epssOutcome.reason.message
        : "EPSS request failed"
      : null;

  const exploitedCves = new Set(
    (kev.feed?.vulnerabilities ?? [])
      .map((vuln) => upperCveId(vuln.cveID))
      .filter((id): id is string => Boolean(id)),
  );
  const markedExploits = exploits.entries.map((entry) => ({
    ...entry,
    observedInWild: entry.cveIds.some((cveId) => exploitedCves.has(cveId)),
  }));

  const recordsInput: BuildRecordsInput = {
    ...sourceFetchResults,
    exploits: { ...exploits, entries: markedExploits },
    nvdRecords,
    epssRecords,
  };

  const records = buildRecords(recordsInput);
  const alerts = buildAlerts(recordsInput, records);
  const vendors = buildVendorIntel(records);
  const sources = buildStatuses(
    sourceFetchResults,
    nvdRecords,
    epssRecords,
    nvdError,
    epssError,
    priorityCves.length,
  );

  return {
    records,
    exploits: markedExploits,
    alerts,
    vendors,
    sources,
    kevTotal: kev.feed?.vulnerabilityCount ?? kev.feed?.vulnerabilities.length ?? 0,
    kevReleaseDate: kev.feed?.dateReleased || null,
    kevCatalogVersion: kev.feed?.catalogVersion || null,
    fetchedAt: new Date().toISOString(),
  };
}

export function clearZeroDayCache(): void {
  clearKevCache();
  clearGithubAdvisoriesCache();
  clearExploitDbCache();
  clearCisaAdvisoriesCache();
  clearEpssCache();
}

export { buildRecords as buildZeroDayRecords, buildAlerts as buildZeroDayAlerts };
