"use client";

import {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  Suspense,
} from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  fetchSecurityNews,
  formatRelativeTime,
  formatAbsoluteTime,
  getNewsProxyUrl,
} from "@/lib/cyber-intel/api/security-news";
import {
  NEWS_CATEGORIES,
  NEWS_SOURCES,
  NEWS_BOOKMARKS_KEY,
  NEWS_READ_KEY,
  NEWS_RECENT_KEY,
  getNewsCategory,
  getNewsCategoryColor,
  getNewsCategoryLabel,
  type NewsArticle,
  type NewsSourceStatus,
  type NewsSourceId,
  type NewsCategoryId,
  type NewsSortOrder,
  type NewsBookmarkEntry,
} from "@/lib/cyber-intel/types/security-news";

const PAGE_SIZE = 12;

const SORT_OPTIONS: Array<{ value: NewsSortOrder; label: string }> = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "source", label: "By source" },
];

function safeStorageGet(key: string): string | null {
  try {
    return typeof window !== "undefined" ? window.localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeStorageSet(key: string, value: string): void {
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {}
}

function loadBookmarks(): NewsBookmarkEntry[] {
  const raw = safeStorageGet(NEWS_BOOKMARKS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function loadReadState(): Record<string, string> {
  const raw = safeStorageGet(NEWS_READ_KEY);
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function loadRecent(): string[] {
  const raw = safeStorageGet(NEWS_RECENT_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function CategoryBadge({ categoryId }: { categoryId: NewsCategoryId }) {
  const color = getNewsCategoryColor(categoryId);
  const label = getNewsCategoryLabel(categoryId);
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded border"
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}15`,
      }}
    >
      {label}
    </span>
  );
}

function SourceBadge({ name }: { name: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] font-medium rounded bg-muted text-muted-foreground border border-border">
      {name}
    </span>
  );
}

function ArticleCard({
  article,
  isBookmarked,
  isRead,
  onOpen,
  onBookmark,
  onMarkRead,
}: {
  article: NewsArticle;
  isBookmarked: boolean;
  isRead: boolean;
  onOpen: () => void;
  onBookmark: () => void;
  onMarkRead: () => void;
}) {
  return (
    <article
      className={`group bg-card border border-border rounded-xl p-5 flex flex-col transition hover:border-primary/40 hover:shadow-lg ${
        isRead ? "opacity-70" : ""
      }`}
    >
      <div className="flex items-center justify-between gap-2 mb-3">
        <CategoryBadge categoryId={article.category} />
        <div className="flex items-center gap-1">
          <button
            onClick={onBookmark}
            aria-label={isBookmarked ? "Remove bookmark" : "Bookmark article"}
            className={`p-1.5 rounded-md transition-colors ${
              isBookmarked
                ? "text-yellow-400 bg-yellow-400/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={isBookmarked ? "Remove bookmark" : "Bookmark"}
          >
            <span>{isBookmarked ? "★" : "☆"}</span>
          </button>
          <button
            onClick={onMarkRead}
            aria-label={isRead ? "Mark as unread" : "Mark as read"}
            className={`p-1.5 rounded-md transition-colors ${
              isRead
                ? "text-green-400 bg-green-400/10"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
            title={isRead ? "Mark as unread" : "Mark as read"}
          >
            <span>{isRead ? "✓" : "○"}</span>
          </button>
        </div>
      </div>

      <button onClick={onOpen} className="text-left flex-1">
        <h3 className="font-semibold text-base leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-3">
          {article.title}
        </h3>
        {article.excerpt && (
          <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
            {article.excerpt}
          </p>
        )}
      </button>

      {article.cveIds.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {article.cveIds.slice(0, 3).map((cve) => (
            <Link
              key={cve}
              href={`/vulnerabilities/${cve}`}
              className="px-1.5 py-0.5 text-[10px] font-mono rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
            >
              {cve}
            </Link>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 mt-auto pt-3 border-t border-border">
        <div className="flex items-center gap-2 min-w-0">
          <SourceBadge name={article.sourceName} />
        </div>
        <span
          className="text-xs text-muted-foreground whitespace-nowrap"
          title={formatAbsoluteTime(article.publishedAt)}
        >
          {formatRelativeTime(article.publishedAt)}
        </span>
      </div>
    </article>
  );
}

function FeaturedStory({
  article,
  onOpen,
}: {
  article: NewsArticle;
  onOpen: () => void;
}) {
  return (
    <button
      onClick={onOpen}
      className="group relative w-full text-left bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all"
    >
      <div className="grid md:grid-cols-2">
        <div className="p-6 md:p-8 flex flex-col justify-center">
          <div className="flex items-center gap-2 mb-4">
            <span className="px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider rounded bg-primary/15 text-primary border border-primary/30">
              Featured
            </span>
            <CategoryBadge categoryId={article.category} />
          </div>
          <h2 className="text-xl md:text-2xl font-bold leading-tight mb-3 group-hover:text-primary transition-colors">
            {article.title}
          </h2>
          {article.excerpt && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
              {article.excerpt}
            </p>
          )}
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <SourceBadge name={article.sourceName} />
            <span>{formatRelativeTime(article.publishedAt)}</span>
            {article.author && <span className="truncate">· {article.author}</span>}
          </div>
        </div>
        <div className="relative min-h-[180px] bg-gradient-to-br from-primary/10 to-transparent flex items-center justify-center">
          {article.imageUrl ? (
            <img
              src={article.imageUrl}
              alt=""
              className="absolute inset-0 w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="text-5xl opacity-30">📰</span>
          )}
        </div>
      </div>
    </button>
  );
}

function SourceStatusPanel({ sources }: { sources: NewsSourceStatus[] }) {
  const [expanded, setExpanded] = useState(false);
  const available = sources.filter((s) => s.available).length;
  return (
    <div className="bg-card border border-border rounded-xl p-4">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between"
      >
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">Source Status</span>
          <span className="text-xs text-muted-foreground">
            {available}/{sources.length} available
          </span>
        </div>
        <span className="text-muted-foreground text-xs">{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="mt-3 space-y-1.5 max-h-72 overflow-y-auto">
          {sources.map((source) => {
            const statusColor =
              source.status === "live"
                ? "text-green-400"
                : source.status === "cached"
                  ? "text-yellow-400"
                  : source.status === "stale"
                    ? "text-orange-400"
                    : "text-red-400";
            const statusLabel =
              source.status === "live"
                ? "Live"
                : source.status === "cached"
                  ? "Cached"
                  : source.status === "stale"
                    ? "Stale"
                    : "Unavailable";
            return (
              <div
                key={source.sourceId}
                className="flex items-center justify-between text-xs py-1 border-b border-border/50 last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate">{source.name}</span>
                    <span className={`font-medium ${statusColor}`}>{statusLabel}</span>
                  </div>
                  {source.error && (
                    <div className="text-[10px] text-muted-foreground truncate">
                      {source.error}
                    </div>
                  )}
                </div>
                <div className="text-right text-muted-foreground whitespace-nowrap ml-2">
                  <div>{source.articleCount} articles</div>
                  {source.latestArticleAt && (
                    <div className="text-[10px]">
                      {formatRelativeTime(source.latestArticleAt)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ArticleDetailDrawer({
  article,
  onClose,
  isBookmarked,
  isRead,
  onBookmark,
  onMarkRead,
  relatedArticles,
  onOpenRelated,
}: {
  article: NewsArticle;
  onClose: () => void;
  isBookmarked: boolean;
  isRead: boolean;
  onBookmark: () => void;
  onMarkRead: () => void;
  relatedArticles: NewsArticle[];
  onOpenRelated: (article: NewsArticle) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(article.url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleShare = async () => {
    const shareData = { title: article.title, url: article.url };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(article.url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-[70] flex justify-end">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative w-full max-w-xl h-full bg-background border-l border-border overflow-y-auto">
        <div className="sticky top-0 z-10 flex items-center justify-between px-5 py-3 bg-background/95 backdrop-blur border-b border-border">
          <div className="flex items-center gap-2">
            <CategoryBadge categoryId={article.category} />
            <SourceBadge name={article.sourceName} />
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            aria-label="Close article"
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <h1 className="text-2xl font-bold leading-tight">{article.title}</h1>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            {article.author && <span>By {article.author}</span>}
            <span>{formatAbsoluteTime(article.publishedAt)}</span>
            <span>· {formatRelativeTime(article.publishedAt)}</span>
          </div>

          {article.imageUrl && (
            <img
              src={article.imageUrl}
              alt=""
              className="w-full rounded-lg border border-border max-h-64 object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          )}

          {article.excerpt && (
            <p className="text-sm leading-relaxed text-foreground/90">
              {article.excerpt}
            </p>
          )}

          <div className="bg-muted/40 border border-border rounded-lg p-3 text-xs text-muted-foreground">
            This is a source-provided summary. Read the full article at the
            original source.
          </div>

          {article.cveIds.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Related CVEs</h3>
              <div className="flex flex-wrap gap-2">
                {article.cveIds.map((cve) => (
                  <Link
                    key={cve}
                    href={`/vulnerabilities/${cve}`}
                    className="px-2 py-1 text-xs font-mono rounded bg-orange-500/10 text-orange-400 border border-orange-500/20 hover:bg-orange-500/20 transition-colors"
                  >
                    {cve} →
                  </Link>
                ))}
              </div>
            </div>
          )}

          {article.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {article.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-2 py-0.5 text-[10px] rounded bg-muted text-muted-foreground border border-border"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2 pt-2">
            <a
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 px-4 py-2.5 bg-primary text-primary-foreground rounded-lg text-sm font-medium text-center hover:bg-primary/90 transition-colors"
            >
              Read Original →
            </a>
            <button
              onClick={handleCopy}
              className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm hover:bg-muted/80 transition-colors"
              title="Copy link"
            >
              {copied ? "Copied" : "Copy"}
            </button>
            <button
              onClick={handleShare}
              className="px-3 py-2.5 bg-muted border border-border rounded-lg text-sm hover:bg-muted/80 transition-colors"
              title="Share"
            >
              Share
            </button>
            <button
              onClick={onBookmark}
              className={`px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                isBookmarked
                  ? "bg-yellow-400/10 text-yellow-400 border-yellow-400/30"
                  : "bg-muted border-border hover:bg-muted/80"
              }`}
              title="Bookmark"
            >
              {isBookmarked ? "★" : "☆"}
            </button>
            <button
              onClick={onMarkRead}
              className={`px-3 py-2.5 border rounded-lg text-sm transition-colors ${
                isRead
                  ? "bg-green-400/10 text-green-400 border-green-400/30"
                  : "bg-muted border-border hover:bg-muted/80"
              }`}
              title="Mark as read"
            >
              {isRead ? "✓" : "○"}
            </button>
          </div>

          {relatedArticles.length > 0 && (
            <div className="pt-4 border-t border-border">
              <h3 className="text-sm font-medium mb-3">Related Articles</h3>
              <div className="space-y-2">
                {relatedArticles.map((rel) => (
                  <button
                    key={rel.id}
                    onClick={() => onOpenRelated(rel)}
                    className="w-full text-left p-3 bg-muted/40 border border-border rounded-lg hover:border-primary/40 transition-colors"
                  >
                    <div className="text-sm font-medium line-clamp-1">{rel.title}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {rel.sourceName} · {formatRelativeTime(rel.publishedAt)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function SecurityNewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [sources, setSources] = useState<NewsSourceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<NewsCategoryId | "all">("all");
  const [sourceFilter, setSourceFilter] = useState<NewsSourceId | "all">("all");
  const [sortOrder, setSortOrder] = useState<NewsSortOrder>("newest");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [dateRange, setDateRange] = useState<"all" | "24h" | "7d" | "30d">("all");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  const [bookmarks, setBookmarks] = useState<NewsBookmarkEntry[]>([]);
  const [readState, setReadState] = useState<Record<string, string>>({});
  const [recent, setRecent] = useState<string[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const [now, setNow] = useState<number>(0);

  const initialized = useRef(false);

  useEffect(() => {
    setBookmarks(loadBookmarks());
    setReadState(loadReadState());
    setRecent(loadRecent());
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(interval);
  }, []);

  const loadNews = useCallback(async (force = false) => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchSecurityNews({ forceRefresh: force });
      setArticles(result.articles);
      setSources(result.sources);
      setFetchedAt(result.fetchedAt);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load security news");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    const q = searchParams.get("q");
    const cat = searchParams.get("category");
    const src = searchParams.get("source");
    const sort = searchParams.get("sort");
    const unread = searchParams.get("unread");
    const range = searchParams.get("range");
    const articleId = searchParams.get("article");

    if (q) setSearch(q);
    if (cat && NEWS_CATEGORIES.some((c) => c.id === cat)) {
      setCategory(cat as NewsCategoryId);
    }
    if (src && NEWS_SOURCES.some((s) => s.id === src)) {
      setSourceFilter(src as NewsSourceId);
    }
    if (sort && SORT_OPTIONS.some((s) => s.value === sort)) {
      setSortOrder(sort as NewsSortOrder);
    }
    if (unread === "1") setUnreadOnly(true);
    if (range === "24h" || range === "7d" || range === "30d") {
      setDateRange(range);
    }
    if (articleId) {
      setSelectedArticle({ id: articleId } as NewsArticle);
    }

    loadNews();
  }, [searchParams, loadNews]);

  useEffect(() => {
    if (!selectedArticle || !selectedArticle.title) {
      if (selectedArticle && articles.length > 0) {
        const found = articles.find((a) => a.id === selectedArticle.id);
        if (found) {
          setSelectedArticle(found);
          setRecent((prev) => {
            const next = [found.id, ...prev.filter((id) => id !== found.id)].slice(0, 20);
            safeStorageSet(NEWS_RECENT_KEY, JSON.stringify(next));
            return next;
          });
          setReadState((prev) => {
            const next = { ...prev, [found.id]: new Date().toISOString() };
            safeStorageSet(NEWS_READ_KEY, JSON.stringify(next));
            return next;
          });
        }
      }
    }
  }, [articles, selectedArticle]);

  const syncUrl = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === "") params.delete(key);
        else params.set(key, value);
      }
      const query = params.toString();
      router.replace(query ? `/security-news?${query}` : "/security-news", {
        scroll: false,
      });
    },
    [router, searchParams],
  );

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setVisibleCount(PAGE_SIZE);
    syncUrl({ q: value || null });
  };

  const handleCategoryChange = (value: NewsCategoryId | "all") => {
    setCategory(value);
    setVisibleCount(PAGE_SIZE);
    syncUrl({ category: value === "all" ? null : value });
  };

  const handleSourceChange = (value: NewsSourceId | "all") => {
    setSourceFilter(value);
    setVisibleCount(PAGE_SIZE);
    syncUrl({ source: value === "all" ? null : value });
  };

  const handleSortChange = (value: NewsSortOrder) => {
    setSortOrder(value);
    syncUrl({ sort: value === "newest" ? null : value });
  };

  const handleUnreadToggle = () => {
    const next = !unreadOnly;
    setUnreadOnly(next);
    setVisibleCount(PAGE_SIZE);
    syncUrl({ unread: next ? "1" : null });
  };

  const handleDateRangeChange = (value: "all" | "24h" | "7d" | "30d") => {
    setDateRange(value);
    setVisibleCount(PAGE_SIZE);
    syncUrl({ range: value === "all" ? null : value });
  };

  const resetFilters = () => {
    setSearch("");
    setCategory("all");
    setSourceFilter("all");
    setSortOrder("newest");
    setUnreadOnly(false);
    setDateRange("all");
    setVisibleCount(PAGE_SIZE);
    router.replace("/security-news", { scroll: false });
  };

  const openArticle = (article: NewsArticle) => {
    setSelectedArticle(article);
    setRecent((prev) => {
      const next = [article.id, ...prev.filter((id) => id !== article.id)].slice(0, 20);
      safeStorageSet(NEWS_RECENT_KEY, JSON.stringify(next));
      return next;
    });
    setReadState((prev) => {
      const next = { ...prev, [article.id]: new Date().toISOString() };
      safeStorageSet(NEWS_READ_KEY, JSON.stringify(next));
      return next;
    });
    syncUrl({ article: article.id });
  };

  const closeArticle = () => {
    setSelectedArticle(null);
    syncUrl({ article: null });
  };

  const toggleBookmark = (article: NewsArticle) => {
    setBookmarks((prev) => {
      const exists = prev.some((b) => b.articleId === article.id);
      const next = exists
        ? prev.filter((b) => b.articleId !== article.id)
        : [
            {
              articleId: article.id,
              title: article.title,
              url: article.url,
              sourceName: article.sourceName,
              savedAt: new Date().toISOString(),
            },
            ...prev,
          ];
      safeStorageSet(NEWS_BOOKMARKS_KEY, JSON.stringify(next));
      return next;
    });
  };

  const toggleRead = (article: NewsArticle) => {
    setReadState((prev) => {
      const next = { ...prev };
      if (next[article.id]) delete next[article.id];
      else next[article.id] = new Date().toISOString();
      safeStorageSet(NEWS_READ_KEY, JSON.stringify(next));
      return next;
    });
  };

  const filteredArticles = useMemo(() => {
    let list = [...articles];

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.sourceName.toLowerCase().includes(q) ||
          a.cveIds.some((cve) => cve.toLowerCase().includes(q)) ||
          a.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (category !== "all") {
      list = list.filter((a) => a.category === category);
    }

    if (sourceFilter !== "all") {
      list = list.filter((a) => a.sourceId === sourceFilter);
    }

    if (unreadOnly) {
      list = list.filter((a) => !readState[a.id]);
    }

    if (dateRange !== "all") {
      const windowMs =
        dateRange === "24h"
          ? 24 * 60 * 60 * 1000
          : dateRange === "7d"
            ? 7 * 24 * 60 * 60 * 1000
            : 30 * 24 * 60 * 60 * 1000;
      list = list.filter((a) => {
        if (!a.publishedAt) return false;
        return now - Date.parse(a.publishedAt) <= windowMs;
      });
    }

    if (sortOrder === "newest") {
      list.sort((a, b) => {
        const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return bt - at;
      });
    } else if (sortOrder === "oldest") {
      list.sort((a, b) => {
        const at = a.publishedAt ? Date.parse(a.publishedAt) : 0;
        const bt = b.publishedAt ? Date.parse(b.publishedAt) : 0;
        return at - bt;
      });
    } else {
      list.sort((a, b) => a.sourceName.localeCompare(b.sourceName));
    }

    return list;
  }, [articles, search, category, sourceFilter, unreadOnly, readState, dateRange, sortOrder, now]);

  const featuredArticle = useMemo(() => {
    if (filteredArticles.length === 0) return null;
    return filteredArticles[0];
  }, [filteredArticles]);

  const relatedArticles = useMemo(() => {
    if (!selectedArticle || !selectedArticle.title) return [];
    return articles
      .filter(
        (a) =>
          a.id !== selectedArticle.id &&
          (a.category === selectedArticle.category ||
            a.cveIds.some((cve) => selectedArticle.cveIds.includes(cve))),
      )
      .slice(0, 4);
  }, [articles, selectedArticle]);

  const visibleArticles = filteredArticles.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArticles.length;
  const isProxyConfigured = !!getNewsProxyUrl();
  const bookmarkedSet = useMemo(
    () => new Set(bookmarks.map((b) => b.articleId)),
    [bookmarks],
  );

  const activeFilterCount =
    (search ? 1 : 0) +
    (category !== "all" ? 1 : 0) +
    (sourceFilter !== "all" ? 1 : 0) +
    (unreadOnly ? 1 : 0) +
    (dateRange !== "all" ? 1 : 0);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold">Security News Center</h1>
          <p className="text-muted-foreground mt-1">
            Live cybersecurity news, vulnerability alerts, threat intelligence
            and vendor advisories aggregated from {NEWS_SOURCES.length} sources
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isProxyConfigured && (
            <div className="px-3 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              ⚠️ Feed proxy not configured
            </div>
          )}
          <button
            onClick={() => loadNews(true)}
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {loading ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
          <div className="font-medium text-red-400">Error</div>
          <div className="text-sm text-muted-foreground mt-1">{error}</div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  🔍
                </span>
                <input
                  type="text"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  placeholder="Search headlines, keywords, sources, or CVE IDs..."
                  className="w-full pl-9 pr-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                />
              </div>
              <select
                value={sortOrder}
                onChange={(e) => handleSortChange(e.target.value as NewsSortOrder)}
                className="px-3 py-2.5 bg-input border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap gap-2 mt-3">
              <select
                value={sourceFilter}
                onChange={(e) => handleSourceChange(e.target.value as NewsSourceId | "all")}
                className="px-3 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">All sources</option>
                {NEWS_SOURCES.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <select
                value={dateRange}
                onChange={(e) =>
                  handleDateRangeChange(e.target.value as "all" | "24h" | "7d" | "30d")
                }
                className="px-3 py-1.5 bg-input border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                <option value="all">Any time</option>
                <option value="24h">Last 24 hours</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
              </select>
              <button
                onClick={handleUnreadToggle}
                className={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${
                  unreadOnly
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-input text-foreground border-border hover:bg-muted"
                }`}
              >
                {unreadOnly ? "✓ Unread only" : "Unread only"}
              </button>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-3 py-1.5 rounded-lg text-xs border border-border bg-input text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  Reset ({activeFilterCount})
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            <button
              onClick={() => handleCategoryChange("all")}
              className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                category === "all"
                  ? "bg-primary/15 text-primary border-primary/30"
                  : "bg-card text-muted-foreground border-border hover:text-foreground"
              }`}
            >
              All
            </button>
            {NEWS_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => handleCategoryChange(cat.id)}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  category === cat.id
                    ? "bg-primary/15 text-primary border-primary/30"
                    : "bg-card text-muted-foreground border-border hover:text-foreground"
                }`}
              >
                {cat.shortLabel}
              </button>
            ))}
          </div>

          {loading && articles.length === 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="bg-card border border-border rounded-xl p-5 h-48 animate-pulse"
                />
              ))}
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center">
              <div className="text-4xl mb-3">📰</div>
              <h3 className="font-medium mb-1">No articles found</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {articles.length === 0
                  ? "No feeds could be loaded. Check source status and try refreshing."
                  : "Try adjusting your search or filters."}
              </p>
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm hover:bg-primary/90 transition-colors"
                >
                  Reset filters
                </button>
              )}
            </div>
          ) : (
            <>
              {featuredArticle && category === "all" && !search && visibleCount > 0 && (
                <FeaturedStory article={featuredArticle} onOpen={() => openArticle(featuredArticle)} />
              )}

              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">
                  {search
                    ? `Results for "${search}"`
                    : category !== "all"
                      ? getNewsCategoryLabel(category)
                      : "Latest Headlines"}
                </h2>
                <span className="text-xs text-muted-foreground">
                  {filteredArticles.length} articles
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(category === "all" && !search && featuredArticle
                  ? visibleArticles.filter((a) => a.id !== featuredArticle.id)
                  : visibleArticles
                ).map((article) => (
                  <ArticleCard
                    key={article.id}
                    article={article}
                    isBookmarked={bookmarkedSet.has(article.id)}
                    isRead={!!readState[article.id]}
                    onOpen={() => openArticle(article)}
                    onBookmark={() => toggleBookmark(article)}
                    onMarkRead={() => toggleRead(article)}
                  />
                ))}
              </div>

              {hasMore && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setVisibleCount((c) => c + PAGE_SIZE)}
                    className="px-6 py-2.5 bg-card border border-border rounded-lg text-sm font-medium hover:border-primary/40 hover:text-primary transition-colors"
                  >
                    Load more ({filteredArticles.length - visibleCount} remaining)
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        <div className="space-y-4">
          <SourceStatusPanel sources={sources} />

          {fetchedAt && (
            <div className="bg-card border border-border rounded-xl p-4 text-xs text-muted-foreground">
              <div className="font-medium text-foreground mb-1">Feed Freshness</div>
              <div>Last fetched: {formatRelativeTime(fetchedAt)}</div>
              <div className="mt-1">
                {articles.length} articles from {sources.filter((s) => s.available).length}{" "}
                available sources
              </div>
            </div>
          )}

          {bookmarks.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-2">
                Bookmarks ({bookmarks.length})
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {bookmarks.slice(0, 10).map((b) => (
                  <a
                    key={b.articleId}
                    href={b.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs p-2 bg-muted/40 rounded hover:bg-muted transition-colors"
                  >
                    <div className="line-clamp-1 text-foreground">{b.title}</div>
                    <div className="text-muted-foreground">{b.sourceName}</div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {recent.length > 0 && (
            <div className="bg-card border border-border rounded-xl p-4">
              <h3 className="text-sm font-medium mb-2">Recently Viewed</h3>
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {recent.slice(0, 6).map((id) => {
                  const article = articles.find((a) => a.id === id);
                  if (!article) return null;
                  return (
                    <button
                      key={id}
                      onClick={() => openArticle(article)}
                      className="block w-full text-left text-xs p-2 bg-muted/40 rounded hover:bg-muted transition-colors"
                    >
                      <div className="line-clamp-1 text-foreground">{article.title}</div>
                      <div className="text-muted-foreground">{article.sourceName}</div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="text-sm font-medium mb-2">Explore CVEs</h3>
            <p className="text-xs text-muted-foreground mb-3">
              Articles mentioning CVEs link directly to the CVE Intelligence Center.
            </p>
            <Link
              href="/vulnerabilities"
              className="block px-3 py-2 bg-muted/40 rounded-lg text-xs text-center hover:bg-muted transition-colors"
            >
              Open CVE Explorer →
            </Link>
          </div>
        </div>
      </div>

      {selectedArticle && selectedArticle.title && (
        <ArticleDetailDrawer
          article={selectedArticle}
          onClose={closeArticle}
          isBookmarked={bookmarkedSet.has(selectedArticle.id)}
          isRead={!!readState[selectedArticle.id]}
          onBookmark={() => toggleBookmark(selectedArticle)}
          onMarkRead={() => toggleRead(selectedArticle)}
          relatedArticles={relatedArticles}
          onOpenRelated={openArticle}
        />
      )}
    </div>
  );
}

export default function SecurityNewsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-8">Loading security news...</div>
      }
    >
      <SecurityNewsContent />
    </Suspense>
  );
}