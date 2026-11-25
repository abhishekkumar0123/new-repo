"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { checkIOCEnrichmentStatus } from "@/lib/cyber-intel/api/ioc-enrichment";
import { getVerdictColor, getVerdictLabel, type HashVerdict } from "@/lib/cyber-intel/types/ioc-investigator";

export function IOCEnrichmentHomePreview() {
  const [status, setStatus] = useState<{
    sources: Array<{ source: string; name: string; available: boolean }>;
    overallAvailable: boolean;
  } | null>(null);
  const [lastCheck, setLastCheck] = useState<string | null>(null);

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const data = await checkIOCEnrichmentStatus();
        setStatus({
          sources: data.sources.map(s => ({ source: s.source, name: s.name, available: s.available })),
          overallAvailable: data.overallAvailable,
        });
        setLastCheck(new Date().toISOString());
      } catch (err) {
        console.error("Failed to fetch IOC enrichment status:", err);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const availableCount = status?.sources.filter(s => s.available).length ?? 0;
  const totalCount = status?.sources.length ?? 12;

  return (
    <section className="bg-card border border-border rounded-xl p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <span className="text-2xl">🎯</span>
          </div>
          <div>
            <h2 className="text-xl font-semibold">IOC Enrichment & Multi-Source Investigation</h2>
            <p className="text-sm text-muted-foreground">
              Universal IOC investigation across IP reputation, domain intelligence, URL analysis, and malware intelligence
            </p>
          </div>
        </div>
        <Link
          href="/ioc-enrichment"
          className="px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors whitespace-nowrap"
        >
          Investigate IOC →
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
          <div className="text-3xl font-bold text-blue-400">7</div>
          <div className="text-sm text-muted-foreground">IOC Types</div>
        </div>
        <div className="p-4 bg-muted/50 rounded-lg">
          <div className="text-3xl font-bold text-foreground">✓</div>
          <div className="text-sm text-muted-foreground">Auto-Detection</div>
        </div>
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="font-medium mb-3">Intelligence Sources</h3>
        <div className="flex flex-wrap gap-2 mb-3">
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
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ✓ IPv4/IPv6
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ✓ Domain
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ✓ URL
          </span>
          <span className="px-3 py-1 text-xs rounded-full bg-green-500/10 text-green-400 border border-green-500/30">
            ✓ MD5/SHA1/SHA256
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
            href="/ioc-enrichment"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">🔍 Investigate an IOC</div>
            <div className="text-muted-foreground">Multi-source enrichment</div>
          </Link>
          <Link
            href="/threat-intelligence"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">🛡️ Threat Intelligence</div>
            <div className="text-muted-foreground">IOC search & monitoring</div>
          </Link>
          <Link
            href="/ip-reputation"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">📍 IP Reputation</div>
            <div className="text-muted-foreground">AbuseIPDB, VT, GreyNoise</div>
          </Link>
          <Link
            href="/domain-intelligence"
            className="p-3 bg-muted/50 rounded-lg hover:bg-muted/80 transition-colors text-center"
          >
            <div className="font-medium">🌐 Domain Intelligence</div>
            <div className="text-muted-foreground">DNS, RDAP & CT logs</div>
          </Link>
        </div>
      </div>
    </section>
  );
}