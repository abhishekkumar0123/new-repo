"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronRight, Clock2, ShieldAlert } from "lucide-react";
import {
  getCachedKevFeed,
  fetchNvdCveList,
  fetchEpssBatch,
  formatDate,
  formatEpssScore,
  highestCvssScore,
  highestCvssSeverity,
} from "@/lib/cyber-intel";

interface IntelCardProps {
  title: string;
  subtitle: string;
  href: string;
  items: Array<{
    cveId: string;
    label: string;
    value: string;
    date: string;
    status: "kev" | "epss" | "ransomware" | "info";
  }>;
  loading: boolean;
  error: string | null;
}

function IntelCard({ title, subtitle, href, items, loading, error }: IntelCardProps) {
  return (
    <article className="premium-card glass-panel p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="font-mono text-[8px] uppercase tracking-[.15em] text-[#77847e] mb-1">
            {subtitle}
          </p>
          <h3 className="font-mono text-sm font-semibold">{title}</h3>
        </div>
        <Link
          href={href}
          className="inline-flex items-center gap-1 font-mono text-[9px] text-[#58d7f7] hover:text-[#00ff91] transition-colors"
        >
          Open <ChevronRight size={12} />
        </Link>
      </div>

      {loading && (
        <div className="h-24 flex items-center justify-center">
          <Clock2 className="animate-spin text-[#58d7f7]" size={16} />
        </div>
      )}

      {error && (
        <p className="font-mono text-xs text-[#ff9a92] text-center py-4">
          {error}
        </p>
      )}

      {!loading && !error && items.length > 0 && (
        <ul className="space-y-3 font-mono text-xs text-[#9ba8a1]">
          {items.map((item) => (
            <li key={item.cveId} className="flex items-start gap-3">
              <Link
                href={`/vulnerabilities?cveId=${encodeURIComponent(item.cveId)}`}
                className="text-[#dfe7e3] hover:text-[#58d7f7] transition-colors truncate flex-1"
              >
                {item.cveId}
              </Link>
              <div className="flex-shrink-0 text-right">
                <p className="text-[#58d7f7] font-semibold">{item.value}</p>
                <p className="text-[8px] text-[#77847e]">{item.label}</p>
                <p className="text-[8px] text-[#77847e]">{item.date}</p>
              </div>
              <span
                className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-[8px] font-semibold ${
                  item.status === "kev"
                    ? "border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a]"
                    : item.status === "ransomware"
                    ? "border-[#ff7b72]/30 bg-[#ff7b72]/[0.1] text-[#ff7b72]"
                    : item.status === "epss"
                    ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]"
                    : "border-white/[0.08] bg-white/[0.05] text-[#77847e]"
                }`}
              >
                {item.status}
              </span>
            </li>
          ))}
        </ul>
      )}

      {!loading && !error && items.length === 0 && (
        <p className="font-mono text-xs text-[#77847e] text-center py-4">
          No data available
        </p>
      )}
    </article>
  );
}

export function CyberIntelHomeCards() {
  const [kevData, setKevData] = useState<Array<{
    cveID: string;
    vulnerabilityName: string;
    dateAdded: string;
    knownRansomwareCampaignUse: string;
  }> | null>(null);
  const [highEpss, setHighEpss] = useState<Array<{
    cveId: string;
    score: number;
    percentile: number;
    date: string;
  }> | null>(null);
  const [ransomware, setRansomware] = useState<Array<{
    cveID: string;
    vulnerabilityName: string;
    dateAdded: string;
  }> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        setLoading(true);
        const feed = await getCachedKevFeed();

        if (!cancelled && feed) {
          const vulns = feed.vulnerabilities;

          // Latest KEV additions (most recent 5)
          const latestKev = [...vulns]
            .sort(
              (a, b) =>
                new Date(b.dateAdded).getTime() - new Date(a.dateAdded).getTime(),
            )
            .slice(0, 5)
            .map((v) => ({
              cveId: v.cveID,
              label: v.vulnerabilityName,
              value: "",
              date: new Date(v.dateAdded).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              }),
              status: "kev" as const,
            }));

          setKevData(latestKev.map((v) => ({
            cveID: v.cveId,
            vulnerabilityName: v.label,
            dateAdded: v.date,
            knownRansomwareCampaignUse: "Known",
          })));

          // Ransomware-linked (most recent 5)
          const ransomwareList = vulns
            .filter((v: { knownRansomwareCampaignUse: string }) =>
              v.knownRansomwareCampaignUse === "Known",
            )
            .sort(
              (a: { dateAdded: string }, b: { dateAdded: string }) =>
                new Date(b.dateAdded).getTime() -
                new Date(a.dateAdded).getTime(),
            )
            .slice(0, 5);

          setRansomware(ransomwareList);
        }
      } catch {
        if (!cancelled) setError("Unable to load KEV data.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch EPSS for top CVEs from NVD
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const result = await fetchNvdCveList({
          resultsPerPage: 10,
          startIndex: 0,
        });

        if (!cancelled && result.cves.length > 0) {
          const cveIds = result.cves.map((c) => c.cveId);
          const epssMap = await fetchEpssBatch(cveIds);

          const withEpss = result.cves
            .map((c) => {
              const e = epssMap.get(c.cveId);
              return {
                cveId: c.cveId,
                score: e?.score ?? 0,
                percentile: e?.percentile ?? 0,
                date: e?.date ?? "",
              };
            })
            .filter((c) => c.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 5);

          if (!cancelled) {
            setHighEpss(withEpss);
          }
        }
      } catch {
        // EPSS failures are non-fatal for homepage
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const kevItems = (kevData ?? []).map((v) => ({
    cveId: v.cveID,
    label: v.vulnerabilityName,
    value: "",
    date: new Date(v.dateAdded).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    status: "kev" as const,
  }));

  const ransomwareItems = (ransomware ?? []).map((v) => ({
    cveId: v.cveID,
    label: v.vulnerabilityName,
    value: "",
    date: new Date(v.dateAdded).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
    status: "ransomware" as const,
  }));

  const epssItems = (highEpss ?? []).map((v) => ({
    cveId: v.cveId,
    label: "Exploitation probability",
    value: formatEpssScore(v.score),
    date: v.date
      ? new Date(v.date).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : "—",
    status: "epss" as const,
  }));

  return (
    <section id="intelligence" className="px-5 py-24 lg:px-8 border-t border-white/[0.06]">
      <div className="mx-auto max-w-7xl">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // 10 — live intelligence cards
            </p>
            <h2 className="mt-3 text-4xl font-semibold">
              Live Intelligence
            </h2>
            <p className="mt-4 max-w-xl text-sm leading-7 text-[#9ba8a1]">
              Quick snapshot of actively exploited vulnerabilities and
              exploitation probability leaders.
            </p>
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          <IntelCard
            title="Latest KEV Additions"
            subtitle="CISA Known Exploited Vulnerabilities"
            href="/kev"
            items={kevItems}
            loading={loading}
            error={error}
          />
          <IntelCard
            title="Highest EPSS Scores"
            subtitle="FIRST Exploitation Probability"
            href="/vulnerabilities?epssRange=75-100"
            items={epssItems}
            loading={loading}
            error={null}
          />
          <IntelCard
            title="Ransomware-Linked"
            subtitle="CISA KEV with ransomware use"
            href="/kev?ransomware=Yes"
            items={ransomwareItems}
            loading={loading}
            error={null}
          />
          <IntelCard
            title="Recently Exploited"
            subtitle="KEV catalog — latest entries"
            href="/kev"
            items={kevItems.slice(0, 3)}
            loading={loading}
            error={null}
          />
        </div>
      </div>
    </section>
  );
}
