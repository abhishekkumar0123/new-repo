"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { checkUrlAnalyzerStatus } from "@/lib/cyber-intel/api/url-reputation";
import { getVerdictColor, getVerdictLabel, type UrlVerdict } from "@/lib/cyber-intel/types/url-analyzer";

const VERDICT_ICONS: Record<UrlVerdict, string> = {
  malicious: "🔴",
  phishing: "🟠",
  malware: "🟣",
  suspicious: "🟡",
  safe: "🟢",
  unknown: "⚪",
  unavailable: "⚫",
};

export function UrlAnalyzerHomePreview() {
  const [status, setStatus] = useState<{
    sources: Array<{ source: string; name: string; available: boolean }>;
    overallAvailable: boolean;
  } | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await checkUrlAnalyzerStatus();
        setStatus({
          sources: data.sources.map(s => ({ source: s.source, name: s.name, available: s.available })),
          overallAvailable: data.overallAvailable,
        });
        setLastCheck(new Date().toISOString());
      } catch (err) {
        console.error("Failed to fetch URL analyzer status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const availableCount = status?.sources.filter(s => s.available).length ?? 0;
  const totalCount = status?.sources.length ?? 5;

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-orange-500/10 rounded-lg">
            <span className="text-2xl">🔗</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">URL Analyzer & Phishing Intelligence</h2>
            <p className="text-sm text-muted-foreground">
              Deep URL analysis with heuristic inspection, threat intelligence, and redirect investigation
            </p>
          </div>
        </div>
        <Link
          href="/url-analyzer"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Analyze URL →
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold text-foreground">{availableCount}</div>
          <div className="text-sm text-muted-foreground">Sources Available</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold text-foreground">{totalCount}</div>
          <div className="text-sm text-muted-foreground">Total Sources</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold text-green-400">✓</div>
          <div className="text-sm text-muted-foreground">Heuristics Engine</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold text-foreground">10</div>
          <div className="text-sm text-muted-foreground">Max Redirect Hops</div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="font-medium mb-3">Threat Intelligence Sources</h3>
        <div className="flex flex-wrap gap-2">
          {status?.sources.map((source) => (
            <span
              key={source.source}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                source.available
                  ? "bg-green-500/10 text-green-400 border-green-500/30"
                  : "bg-red-500/10 text-red-400 border-red-500/30"
              }`}
            >
              {source.available ? "✓" : "✗"} {source.name}
            </span>
          ))}
          <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ✓ Local Heuristics
          </span>
        </div>

        {lastCheck && (
          <p className="text-xs text-muted-foreground mt-3">
            Last checked: {new Date(lastCheck).toLocaleTimeString()}
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Link
            href="/url-analyzer"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">🔍 Analyze a URL</div>
            <div className="text-muted-foreground">Deep inspection & threat intel</div>
          </Link>
          <Link
            href="/threat-intelligence"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">🛡️ Threat Intelligence</div>
            <div className="text-muted-foreground">IOC search & monitoring</div>
          </Link>
          <Link
            href="/domain-intelligence"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">🌐 Domain Intelligence</div>
            <div className="text-muted-foreground">DNS, RDAP & CT logs</div>
          </Link>
          <Link
            href="/ip-reputation"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">📍 IP Reputation</div>
            <div className="text-muted-foreground">AbuseIPDB, VT, GreyNoise</div>
          </Link>
        </div>
      </div>
    </section>
  );
}