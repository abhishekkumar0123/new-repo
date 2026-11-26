"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  fetchSecurityNews,
  formatRelativeTime,
  getNewsProxyUrl,
} from "@/lib/cyber-intel/api/security-news";
import {
  getNewsCategoryColor,
  getNewsCategoryLabel,
  type NewsArticle,
} from "@/lib/cyber-intel/types/security-news";

export function SecurityNewsHomePreview() {
  const [articles, setArticles] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableSources, setAvailableSources] = useState(0);
  const [totalSources, setTotalSources] = useState(0);
  const [lastFetched, setLastFetched] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const result = await fetchSecurityNews();
        setArticles(result.articles);
        setAvailableSources(result.availableSources);
        setTotalSources(result.totalSources);
        setLastFetched(result.fetchedAt);
      } catch (err) {
        console.error("Failed to load security news preview:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const featured = articles[0] ?? null;
  const secondary = articles.slice(1, 5);
  const isProxyConfigured = !!getNewsProxyUrl();

  return (
    <section className="border-b border-white/[0.06] px-5 py-20 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#00ff91]">
              // security news center
            </p>
            <h2 className="mt-4 text-4xl font-semibold">
              Live cybersecurity intelligence
            </h2>
            <p className="mt-2 text-sm text-[#9ba8a1] max-w-2xl">
              Real headlines aggregated from {totalSources || 16} security news
              and research sources — vulnerabilities, ransomware, threat
              intelligence and vendor advisories.
            </p>
          </div>
          <Link
            href="/security-news"
            className="inline-flex items-center gap-2 rounded-md border border-[#00ff91]/30 bg-[#00ff91]/[0.07] px-4 py-2.5 font-mono text-xs text-[#00ff91] transition hover:bg-[#00ff91]/[0.12] whitespace-nowrap"
          >
            Open News Center →
          </Link>
        </div>

        {!isProxyConfigured && (
          <div className="mb-6 rounded-lg border border-yellow-500/20 bg-yellow-500/[0.06] px-4 py-3 font-mono text-xs text-yellow-400">
            ⚠️ News feed proxy not configured — headlines unavailable until the
            edge function is deployed.
          </div>
        )}

        {loading ? (
          <div className="grid gap-5 lg:grid-cols-3">
            <div className="lg:col-span-2 h-64 rounded-xl bg-white/[0.03] animate-pulse" />
            <div className="h-64 rounded-xl bg-white/[0.03] animate-pulse" />
          </div>
        ) : articles.length === 0 ? (
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-10 text-center">
            <p className="text-sm text-[#9ba8a1]">
              No headlines could be loaded right now. The news center will
              populate automatically once feeds are reachable.
            </p>
          </div>
        ) : (
          <div className="grid gap-5 lg:grid-cols-3">
            {featured && (
              <Link
                href="/security-news"
                className="group lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-6 transition hover:border-[#00ff91]/30 hover:bg-white/[0.04]"
              >
                <div className="flex items-center gap-2 mb-4">
                  <span className="rounded border border-[#00ff91]/30 bg-[#00ff91]/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-[#00ff91]">
                    Latest
                  </span>
                  <span
                    className="rounded border px-2 py-0.5 font-mono text-[10px]"
                    style={{
                      color: getNewsCategoryColor(featured.category),
                      borderColor: `${getNewsCategoryColor(featured.category)}55`,
                      backgroundColor: `${getNewsCategoryColor(featured.category)}15`,
                    }}
                  >
                    {getNewsCategoryLabel(featured.category)}
                  </span>
                </div>
                <h3 className="text-xl font-semibold leading-snug text-white group-hover:text-[#00ff91] transition-colors">
                  {featured.title}
                </h3>
                {featured.excerpt && (
                  <p className="mt-3 text-sm leading-relaxed text-[#9ba8a1] line-clamp-2">
                    {featured.excerpt}
                  </p>
                )}
                <div className="mt-4 flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-[#77847e]">
                  <span className="text-[#00ff91]">{featured.sourceName}</span>
                  <span>· {formatRelativeTime(featured.publishedAt)}</span>
                </div>
              </Link>
            )}

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
                  // headlines
                </h3>
                <span className="font-mono text-[10px] text-[#77847e]">
                  {availableSources}/{totalSources} sources
                </span>
              </div>
              <div className="space-y-3">
                {secondary.map((article) => (
                  <Link
                    key={article.id}
                    href="/security-news"
                    className="group block border-b border-white/[0.05] pb-3 last:border-0 last:pb-0"
                  >
                    <div className="flex items-start gap-2">
                      <span
                        className="mt-1.5 size-1.5 shrink-0 rounded-full"
                        style={{ backgroundColor: getNewsCategoryColor(article.category) }}
                      />
                      <div className="min-w-0">
                        <p className="text-sm font-medium leading-snug text-[#dfe7e3] group-hover:text-[#00ff91] transition-colors line-clamp-2">
                          {article.title}
                        </p>
                        <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-[#77847e]">
                          {article.sourceName} · {formatRelativeTime(article.publishedAt)}
                        </p>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        )}

        {lastFetched && (
          <p className="mt-4 font-mono text-[10px] uppercase tracking-wider text-[#77847e]">
            Last refreshed {formatRelativeTime(lastFetched)} · Headlines link to
            original sources
          </p>
        )}
      </div>
    </section>
  );
}