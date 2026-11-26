import { extractCveIds, sanitizeUrl, stripHtml } from "../security-news";
import type { IntelAlert } from "../../types/zero-day";
import { classifyAlertText, hasExploitationEvidence } from "./classification";
import {
  getFeedItems,
  getFeedLink,
  getFeedText,
  parseFeedDate,
  parseXmlDocument,
  truncateText,
} from "./feed";
import {
  fetchZeroDayProxyResource,
  isZeroDayProxyConfigured,
} from "./proxy";

const CACHE_TTL_MS = 20 * 60 * 1000;
const MAX_ALERTS = 100;

export interface CisaAdvisoryResult {
  alerts: IntelAlert[];
  available: boolean;
  error: string | null;
  fetchedAt: string;
}

interface CacheEntry {
  result: CisaAdvisoryResult;
  fetchedAt: number;
}

let cache: CacheEntry | null = null;

function normalizeItem(item: Element): IntelAlert | null {
  const title = stripHtml(getFeedText(item, "title"));
  const url = sanitizeUrl(getFeedLink(item));
  if (!title || !url) return null;

  const excerptRaw = stripHtml(
    getFeedText(item, "description") || getFeedText(item, "summary"),
  );
  const excerpt = excerptRaw ? truncateText(excerptRaw, 500) : null;
  const combined = `${title} ${excerptRaw}`;

  const isAlert = /\balert\b|\bAA\d{2}-\d{3}\b|\bSA\d{2}-\d{3}\b/i.test(title);

  return {
    id: `cisa:${url}`,
    title: truncateText(title, 400),
    excerpt,
    url,
    publishedAt: parseFeedDate(
      getFeedText(item, "pubDate") || getFeedText(item, "published") || getFeedText(item, "updated"),
    ),
    sourceName: "CISA",
    sourceType: isAlert ? "cisa-alert" : "cisa-advisory",
    verification: hasExploitationEvidence(combined) ? "confirmed" : "published-advisory",
    category: classifyAlertText(title, excerptRaw),
    cveIds: extractCveIds(title, excerptRaw),
    severity: null,
  };
}

export async function fetchCisaAdvisories(
  { forceRefresh = false }: { forceRefresh?: boolean } = {},
): Promise<CisaAdvisoryResult> {
  if (!forceRefresh && cache && Date.now() - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.result;
  }

  const fetchedAt = new Date().toISOString();
  if (!isZeroDayProxyConfigured()) {
    const result: CisaAdvisoryResult = {
      alerts: [],
      available: false,
      error:
        "CISA advisory RSS does not send CORS headers; configure NEXT_PUBLIC_ZERO_DAY_PROXY_URL to enable this source.",
      fetchedAt,
    };
    cache = { result, fetchedAt: Date.now() };
    return result;
  }

  try {
    const proxied = await fetchZeroDayProxyResource("cisa-advisories");
    const doc = parseXmlDocument(proxied.text);
    if (!doc) throw new Error("CISA advisory feed returned invalid XML");

    const byId = new Map<string, IntelAlert>();
    for (const item of getFeedItems(doc).slice(0, MAX_ALERTS)) {
      const alert = normalizeItem(item);
      if (alert && !byId.has(alert.id)) byId.set(alert.id, alert);
    }

    const alerts = [...byId.values()].sort((a, b) => {
      const aDate = a.publishedAt ? Date.parse(a.publishedAt) : 0;
      const bDate = b.publishedAt ? Date.parse(b.publishedAt) : 0;
      return bDate - aDate;
    });

    const result: CisaAdvisoryResult = {
      alerts,
      available: alerts.length > 0,
      error: alerts.length === 0 ? "No CISA advisories found in feed" : null,
      fetchedAt: proxied.fetchedAt,
    };
    cache = { result, fetchedAt: Date.now() };
    return result;
  } catch (error) {
    const result: CisaAdvisoryResult = {
      alerts: [],
      available: false,
      error: error instanceof Error ? error.message : "Unknown CISA advisory error",
      fetchedAt,
    };
    cache = { result, fetchedAt: Date.now() };
    return result;
  }
}

export function clearCisaAdvisoriesCache(): void {
  cache = null;
}
