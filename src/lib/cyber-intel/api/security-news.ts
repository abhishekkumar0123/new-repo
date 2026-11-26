import {
  NewsAggregationResult,
  NewsArticle,
  NewsFeedResult,
  NewsQueryOptions,
  NewsSource,
  NewsSourceId,
  NewsSourceStatus,
  NEWS_CACHE_TTL_MS,
  NEWS_SOURCES,
  NEWS_STALE_TTL_MS,
  classifyNewsCategory,
  getNewsSource,
} from "../types/security-news";

const NEWS_FEED_PROXY_URL =
  typeof process !== "undefined" && process.env
    ? (process.env.NEXT_PUBLIC_NEWS_FEED_PROXY_URL as string | undefined)
    : undefined;

const MAX_EXCERPT_LENGTH = 320;
const MAX_ARTICLES_PER_SOURCE = 25;
const PROXY_TIMEOUT_MS = 20000;

interface FeedCacheEntry {
  result: NewsAggregationResult;
  fetchedAt: number;
}

let newsCache: FeedCacheEntry | null = null;

export function getNewsProxyUrl(): string | undefined {
  return NEWS_FEED_PROXY_URL;
}

function stripHtml(input: string): string {
  if (!input) return "";
  let text = input;
  text = text.replace(/<script[\s\S]*?<\/script>/gi, " ");
  text = text.replace(/<style[\s\S]*?<\/style>/gi, " ");
  text = text.replace(/<[^>]+>/g, " ");
  text = text
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/gi, "'")
    .replace(/&#x27;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(parseInt(code, 10)))
    .replace(/\s+/g, " ")
    .trim();
  return text;
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1).trimEnd() + "…";
}

function sanitizeUrl(raw: string): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^https?:\/\//i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const CVE_REGEX = /\bCVE-\d{4}-\d{4,7}\b/gi;

export function extractCveIds(...texts: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    const matches = text.match(CVE_REGEX);
    if (matches) {
      for (const m of matches) found.add(m.toUpperCase());
    }
  }
  return Array.from(found).slice(0, 12);
}

function getDirectText(parent: Element | Document, localName: string): string {
  const direct = parent.getElementsByTagName(localName)[0];
  if (direct) return direct.textContent?.trim() ?? "";
  const byNs = parent.getElementsByTagNameNS("*", localName)[0];
  if (byNs) return byNs.textContent?.trim() ?? "";
  return "";
}

function getAtomLink(entry: Element): string {
  const links = Array.from(entry.getElementsByTagName("link"));
  for (const link of links) {
    const rel = link.getAttribute("rel");
    const href = link.getAttribute("href");
    if (!href) continue;
    if (rel === "alternate" || rel === null) return href;
  }
  for (const link of links) {
    const href = link.getAttribute("href");
    if (href) return href;
  }
  return "";
}

function extractImage(item: Element, rawDescription: string): string | null {
  const mediaContent =
    item.getElementsByTagName("media:content")[0] ??
    item.getElementsByTagNameNS("*", "content")[0];
  const mediaUrl =
    mediaContent?.getAttribute("url") ??
    item.getElementsByTagName("media:thumbnail")[0]?.getAttribute("url");
  if (mediaUrl) {
    const safe = sanitizeUrl(mediaUrl);
    if (safe) return safe;
  }
  const enclosure = item.getElementsByTagName("enclosure")[0];
  const enclosureUrl = enclosure?.getAttribute("url");
  if (enclosureUrl && /image\//i.test(enclosure?.getAttribute("type") ?? "")) {
    const safe = sanitizeUrl(enclosureUrl);
    if (safe) return safe;
  }
  const imgMatch = rawDescription.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) {
    return sanitizeUrl(imgMatch[1]);
  }
  return null;
}

function normalizeItem(item: Element, source: NewsSource, isAtom: boolean): NewsArticle | null {
  const rawTitle = getDirectText(item, "title");
  const title = stripHtml(rawTitle);
  if (!title) return null;

  let link = "";
  let rawDescription = "";
  let publishedRaw = "";
  let author = "";
  const tags: string[] = [];

  if (isAtom) {
    link = getAtomLink(item);
    rawDescription =
      getDirectText(item, "summary") || getDirectText(item, "content");
    publishedRaw = getDirectText(item, "published") || getDirectText(item, "updated");
    const authorEl = item.getElementsByTagName("author")[0];
    if (authorEl) author = getDirectText(authorEl, "name");
    for (const cat of Array.from(item.getElementsByTagName("category"))) {
      const term = cat.getAttribute("term");
      if (term) tags.push(term.trim());
    }
  } else {
    link = getDirectText(item, "link") || getDirectText(item, "guid");
    rawDescription =
      getDirectText(item, "description") ||
      getDirectText(item, "encoded") ||
      "";
    publishedRaw = getDirectText(item, "pubDate") || getDirectText(item, "date");
    author = getDirectText(item, "creator") || getDirectText(item, "author");
    for (const cat of Array.from(item.getElementsByTagName("category"))) {
      const text = cat.textContent?.trim();
      if (text) tags.push(text);
    }
  }

  const url = sanitizeUrl(link);
  if (!url) return null;

  const excerpt = truncate(stripHtml(rawDescription), MAX_EXCERPT_LENGTH);
  const publishedAt = parseDate(publishedRaw);
  const imageUrl = extractImage(item, rawDescription);
  const category = classifyNewsCategory(title, excerpt);
  const cveIds = extractCveIds(title, rawDescription);

  const cleanTags = Array.from(
    new Set(tags.map((t) => t.trim()).filter(Boolean)),
  ).slice(0, 6);

  const idSource = `${source.id}:${url}`;

  return {
    id: idSource,
    title,
    excerpt,
    sourceId: source.id,
    sourceName: source.name,
    sourceHomepage: source.homepage,
    url,
    publishedAt,
    author: author ? stripHtml(author).slice(0, 120) : null,
    category,
    tags: cleanTags,
    imageUrl,
    cveIds,
    fetchedAt: new Date().toISOString(),
  };
}

function parseDate(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();
  if (!cleaned) return null;
  const timestamp = Date.parse(cleaned);
  if (Number.isNaN(timestamp)) return null;
  return new Date(timestamp).toISOString();
}

function parseFeedXml(xml: string, source: NewsSource): NewsArticle[] {
  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, "text/xml");
  } catch {
    return [];
  }
  if (doc.getElementsByTagName("parsererror").length > 0) {
    return [];
  }

  let items = Array.from(doc.getElementsByTagName("item"));
  const isAtom = items.length === 0;
  if (isAtom) {
    items = Array.from(doc.getElementsByTagName("entry"));
  }

  const articles: NewsArticle[] = [];
  for (const item of items) {
    const article = normalizeItem(item, source, isAtom);
    if (article) articles.push(article);
    if (articles.length >= MAX_ARTICLES_PER_SOURCE) break;
  }
  return articles;
}

async function fetchSourceFeed(
  source: NewsSource,
  forceRefresh: boolean,
): Promise<NewsFeedResult> {
  const fetchedAt = new Date().toISOString();
  const proxyUrl = getNewsProxyUrl();

  if (!proxyUrl) {
    return {
      sourceId: source.id,
      available: false,
      articles: [],
      error: "News feed proxy is not configured",
      fetchedAt,
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
      body: JSON.stringify({ source: source.id, forceRefresh }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        sourceId: source.id,
        available: false,
        articles: [],
        error: `Proxy returned HTTP ${response.status}`,
        fetchedAt,
      };
    }

    const data = (await response.json()) as {
      ok?: boolean;
      xml?: string;
      error?: string;
    };

    if (!data.ok || !data.xml) {
      return {
        sourceId: source.id,
        available: false,
        articles: [],
        error: data.error ?? "Empty feed response",
        fetchedAt,
      };
    }

    const articles = parseFeedXml(data.xml, source);
    return {
      sourceId: source.id,
      available: true,
      articles,
      error: articles.length === 0 ? "No articles parsed from feed" : null,
      fetchedAt,
    };
  } catch (error) {
    return {
      sourceId: source.id,
      available: false,
      articles: [],
      error:
        error instanceof Error && error.name === "AbortError"
          ? "Feed request timed out"
          : error instanceof Error
            ? error.message
            : "Unknown error fetching feed",
      fetchedAt,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function dedupeArticles(articles: NewsArticle[]): NewsArticle[] {
  const byUrl = new Map<string, NewsArticle>();
  const byTitle = new Map<string, string>();

  for (const article of articles) {
    const normalizedUrl = article.url.replace(/\/$/, "");
    const normalizedTitle = article.title.toLowerCase().trim();

    const existingUrl = byUrl.get(normalizedUrl);
    if (existingUrl) {
      if (
        (article.publishedAt ?? "") > (existingUrl.publishedAt ?? "") &&
        article.excerpt.length > existingUrl.excerpt.length
      ) {
        byUrl.set(normalizedUrl, article);
      }
      continue;
    }

    const titleKey = byTitle.get(normalizedTitle);
    if (titleKey) {
      const existing = byUrl.get(titleKey);
      if (
        existing &&
        (article.publishedAt ?? "") > (existing.publishedAt ?? "")
      ) {
        byUrl.set(titleKey, article);
        byUrl.delete(normalizedUrl);
      }
      continue;
    }

    byUrl.set(normalizedUrl, article);
    byTitle.set(normalizedTitle, normalizedUrl);
  }

  return Array.from(byUrl.values());
}

function sortArticles(articles: NewsArticle[]): NewsArticle[] {
  return [...articles].sort((a, b) => {
    const aTime = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const bTime = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    if (bTime !== aTime) return bTime - aTime;
    return a.title.localeCompare(b.title);
  });
}

function buildSourceStatuses(
  results: NewsFeedResult[],
  now: number,
): NewsSourceStatus[] {
  return NEWS_SOURCES.map((source) => {
    const result = results.find((r) => r.sourceId === source.id);
    if (!result) {
      return {
        sourceId: source.id,
        name: source.name,
        group: source.group,
        status: "unavailable" as const,
        available: false,
        articleCount: 0,
        latestArticleAt: null,
        lastSuccessfulUpdate: null,
        error: "Source not queried",
      };
    }

    const ageMs = now - Date.parse(result.fetchedAt);
    let status: NewsSourceStatus["status"];
    if (!result.available) {
      status = "unavailable";
    } else if (ageMs <= NEWS_CACHE_TTL_MS) {
      status = "live";
    } else if (ageMs <= NEWS_STALE_TTL_MS) {
      status = "cached";
    } else {
      status = "stale";
    }

    const latest = result.articles.reduce<string | null>((acc, article) => {
      if (!article.publishedAt) return acc;
      if (!acc) return article.publishedAt;
      return Date.parse(article.publishedAt) > Date.parse(acc)
        ? article.publishedAt
        : acc;
    }, null);

    return {
      sourceId: source.id,
      name: source.name,
      group: source.group,
      status,
      available: result.available,
      articleCount: result.articles.length,
      latestArticleAt: latest,
      lastSuccessfulUpdate: result.available ? result.fetchedAt : null,
      error: result.error,
    };
  });
}

export async function fetchSecurityNews(
  options: NewsQueryOptions = {},
): Promise<NewsAggregationResult> {
  const { sources, forceRefresh = false } = options;
  const now = Date.now();

  if (
    !forceRefresh &&
    newsCache &&
    now - newsCache.fetchedAt < NEWS_CACHE_TTL_MS
  ) {
    return newsCache.result;
  }

  const activeSources = sources?.length
    ? NEWS_SOURCES.filter((s) => sources.includes(s.id))
    : NEWS_SOURCES;

  const results = await Promise.allSettled(
    activeSources.map((source) => fetchSourceFeed(source, forceRefresh)),
  );

  const feedResults: NewsFeedResult[] = results.map((outcome, index) => {
    if (outcome.status === "fulfilled") return outcome.value;
    return {
      sourceId: activeSources[index].id,
      available: false,
      articles: [],
      error:
        outcome.reason instanceof Error
          ? outcome.reason.message
          : "Feed request rejected",
      fetchedAt: new Date().toISOString(),
    };
  });

  const allArticles = feedResults.flatMap((r) => r.articles);
  const deduped = sortArticles(dedupeArticles(allArticles));

  const aggregation: NewsAggregationResult = {
    articles: deduped,
    sources: buildSourceStatuses(feedResults, now),
    fetchedAt: new Date(now).toISOString(),
    totalArticles: deduped.length,
    availableSources: feedResults.filter((r) => r.available).length,
    totalSources: activeSources.length,
  };

  newsCache = { result: aggregation, fetchedAt: now };
  return aggregation;
}

export function clearNewsCache(): void {
  newsCache = null;
}

export async function checkNewsSourcesStatus(): Promise<NewsSourceStatus[]> {
  const result = await fetchSecurityNews();
  return result.sources;
}

export function getSourceDisplayName(sourceId: NewsSourceId): string {
  return getNewsSource(sourceId)?.name ?? sourceId;
}

export function formatRelativeTime(iso: string | null): string {
  if (!iso) return "Unknown date";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "Unknown date";
  const diffMs = Date.now() - then;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const date = new Date(then);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatAbsoluteTime(iso: string | null): string {
  if (!iso) return "Unknown date";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}