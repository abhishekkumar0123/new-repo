"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  detectIOCType,
  normalizeIOC,
  getVerdictColor,
  getVerdictLabel,
  type IOCEnrichmentResult,
  type IOCType,
  type HashVerdict,
  type IOCEnrichmentHistoryEntry,
} from "@/lib/cyber-intel/types/ioc-investigator";
import {
  enrichIOC,
  checkIOCEnrichmentStatus,
  getProxyUrl,
} from "@/lib/cyber-intel/api/ioc-enrichment";

const VERDICT_ICONS: Record<HashVerdict, string> = {
  malicious: "🔴",
  suspicious: "🟠",
  clean: "🟢",
  unknown: "⚪",
  "no-detections": "🟢",
};

const TYPE_LABELS: Record<IOCType, string> = {
  ipv4: "IPv4 Address",
  ipv6: "IPv6 Address",
  domain: "Domain",
  url: "URL",
  md5: "MD5 Hash",
  sha1: "SHA1 Hash",
  sha256: "SHA256 Hash",
};

const TYPE_ICONS: Record<IOCType, string> = {
  ipv4: "📍",
  ipv6: "📍",
  domain: "🌐",
  url: "🔗",
  md5: "🔬",
  sha1: "🔬",
  sha256: "🔬",
};

function IOCInputSection({
  ioc,
  setIoc,
  onAnalyze,
  isAnalyzing,
  history,
  onHistorySelect,
}: {
  ioc: string;
  setIoc: (ioc: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  history: Array<{ ioc: string; type: IOCType; timestamp: string; verdict: string }>;
  onHistorySelect: (ioc: string) => void;
}) {
  const detectedType = ioc ? detectIOCType(ioc) : null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <label htmlFor="ioc-input" className="sr-only">
            IOC to investigate
          </label>
          <input
            id="ioc-input"
            type="text"
            value={ioc}
            onChange={(e) => setIoc(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
            placeholder="Enter IOC (IP, domain, URL, or hash) to investigate"
            className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isAnalyzing}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || !ioc.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isAnalyzing ? "Investigating..." : "Investigate"}
          </button>
        </div>
      </div>

      {detectedType && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-mono">
            {TYPE_ICONS[detectedType]} Detected: {TYPE_LABELS[detectedType]}
          </span>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Recent Investigations</span>
            <button
              onClick={() => localStorage.removeItem("ioc-enrichment-history")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((item, i) => (
              <button
                key={i}
                onClick={() => onHistorySelect(item.ioc)}
                className="px-3 py-1 bg-muted text-xs rounded-md hover:bg-muted/80 transition-colors truncate max-w-[200px] text-left"
                title={`${item.ioc} (${TYPE_LABELS[item.type]})`}
              >
                {item.ioc.length > 40 ? item.ioc.substring(0, 37) + "..." : item.ioc}
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-muted-foreground/20 rounded">{TYPE_LABELS[item.type]}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function VerdictBadge({ verdict, confidence }: { verdict: HashVerdict; confidence: number | null }) {
  const color = getVerdictColor(verdict);
  const label = getVerdictLabel(verdict);
  const icon = VERDICT_ICONS[verdict];

  return (
    <div
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-medium"
      style={{ backgroundColor: `${color}20`, borderColor: color, color }}
    >
      <span style={{ fontSize: "1.2em" }}>{icon}</span>
      <span>{label}</span>
      {confidence !== null && (
        <span className="ml-2 px-2 py-0.5 text-xs rounded" style={{ backgroundColor: `${color}30` }}>
          {confidence}% confidence
        </span>
      )}
    </div>
  );
}

function SourceCard({ result }: { result: IOCEnrichmentResult["reputation"][0] }) {
  const color = getVerdictColor(result.verdict);

  return (
    <div
      className="p-4 rounded-lg border"
      style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <VerdictBadge verdict={result.verdict} confidence={result.confidence} />
          <div>
            <div className="font-medium">{result.source}</div>
            {result.lastAnalysisDate && (
              <div className="text-sm text-muted-foreground">
                Last analysis: {new Date(result.lastAnalysisDate).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {result.detectionCount !== null && (
            <span>Detections: <span className="font-mono">{result.detectionCount}</span> / {result.totalVendors || "?"}</span>
          )}
          {result.categories.length > 0 && (
            <span>Categories: <span className="font-mono">{result.categories.join(", ")}</span></span>
          )}
          {result.referenceUrl && (
            <a
              href={result.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline text-sm"
            >
              View Details →
            </a>
          )}
        </div>
      </div>
      {result.details && Object.keys(result.details).length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm text-muted-foreground">Show raw details</summary>
          <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-x-auto font-mono text-muted-foreground">
            {JSON.stringify(result.details, null, 2)}
          </pre>
        </details>
      )}
    </div>
  );
}

function ReputationSection({ result }: { result: IOCEnrichmentResult }) {
  const maliciousCount = result.reputation.filter(r => r.verdict === "malicious").length;
  const suspiciousCount = result.reputation.filter(r => r.verdict === "suspicious").length;
  const cleanCount = result.reputation.filter(r => r.verdict === "clean" || r.verdict === "no-detections").length;
  const unknownCount = result.reputation.filter(r => r.verdict === "unknown").length;

  const overallVerdict = maliciousCount > 0 ? "malicious" : 
    suspiciousCount > 0 ? "suspicious" : 
    cleanCount > 0 ? "clean" : "unknown";

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Reputation Results</h2>
        <VerdictBadge verdict={overallVerdict} confidence={null} />
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <span className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-400 border border-green-500/20">
          ✅ {cleanCount} Clean
        </span>
        <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          ⚠️ {suspiciousCount} Suspicious
        </span>
        <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20">
          🔴 {maliciousCount} Malicious
        </span>
        <span className="px-2 py-1 text-xs rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
          ⚫ {unknownCount} Unknown
        </span>
      </div>

      <div className="space-y-3">
        {result.reputation.length > 0 ? (
          result.reputation.map((rep) => (
            <SourceCard key={`${rep.source}-${rep.verdict}`} result={rep} />
          ))
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No reputation data available from any source.
          </div>
        )}
      </div>

      {result.errors.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer text-sm text-red-400">Errors ({result.errors.length})</summary>
          <div className="mt-2 space-y-1">
            {result.errors.map((err, i) => (
              <div key={i} className="text-sm text-red-400 font-mono">
                {err.source}: {err.error}
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function ContextLinksSection({ result }: { result: IOCEnrichmentResult }) {
  const links = Object.entries(result.contextLinks).filter(([, v]) => v);

  if (links.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Contextual Investigation Links</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Navigate to specialized tools for deeper investigation of this IOC type.
      </p>
      <div className="flex flex-wrap gap-3">
        {links.map(([key, url]) => (
          <Link
            key={key}
            href={url}
            className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
          >
            {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, ' $1').trim()}
          </Link>
        ))}
      </div>
    </section>
  );
}

function RelatedIndicatorsSection({ result }: { result: IOCEnrichmentResult }) {
  if (!result.relatedIndicators || result.relatedIndicators.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Related Indicators</h2>
      <div className="space-y-2">
        {result.relatedIndicators.map((indicator, i) => (
          <div key={i} className="p-3 bg-muted/30 rounded-lg flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-mono">
                {indicator.type.toUpperCase()}
              </span>
              <div>
                <div className="font-mono text-sm">{indicator.value}</div>
                <div className="text-xs text-muted-foreground">{indicator.relationship} · {indicator.source} · {indicator.confidence !== null ? `${indicator.confidence}%` : "N/A"}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IOCEnrichmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [ioc, setIoc] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<IOCEnrichmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ sources: any[]; overallAvailable: boolean } | null>(null);
  const [history, setHistory] = useState<Array<{ ioc: string; type: IOCType; timestamp: string; verdict: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAnalyze = useCallback(async () => {
    const type = detectIOCType(ioc);
    if (!type) {
      setError("Invalid IOC format. Supported: IPv4, IPv6, Domain, URL, MD5, SHA1, SHA256");
      return;
    }

    const normalized = normalizeIOC(ioc, type);

    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const startTime = Date.now();
      const analysisResult = await enrichIOC(normalized);
      const scanDuration = Date.now() - startTime;

      if (!analysisResult) {
        throw new Error("No results returned from intelligence sources");
      }

      const finalResult = {
        ...analysisResult,
        scanDuration,
      };

      setResult(finalResult);

      const verdict = finalResult.reputation.some(r => r.verdict === "malicious") ? "malicious" :
        finalResult.reputation.some(r => r.verdict === "suspicious") ? "suspicious" :
        finalResult.reputation.some(r => r.verdict === "clean" || r.verdict === "no-detections") ? "clean" : "unknown";

      const newHistoryEntry = {
        ioc: normalized,
        type,
        timestamp: new Date().toISOString(),
        verdict,
      };
      const newHistory = [newHistoryEntry, ...history.filter(h => h.ioc !== normalized)].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem("ioc-enrichment-history", JSON.stringify(newHistory));

      router.push(`/ioc-enrichment?ioc=${encodeURIComponent(normalized)}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Investigation failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [ioc, history, router]);

  useEffect(() => {
    const saved = localStorage.getItem("ioc-enrichment-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const paramIoc = searchParams.get("ioc");
    if (paramIoc) {
      setIoc(paramIoc);
      handleAnalyze();
    }
  }, [searchParams, handleAnalyze]);

  const checkStatus = useCallback(async () => {
    try {
      const statusData = await checkIOCEnrichmentStatus();
      setStatus(statusData);
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleHistorySelect = (selectedIoc: string) => {
    setIoc(selectedIoc);
    handleAnalyze();
  };

  const isProxyConfigured = !!getProxyUrl();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">IOC Enrichment & Multi-Source Investigation</h1>
          <p className="text-muted-foreground mt-1">
            Universal IOC investigation across threat intelligence, IP reputation, domain intelligence, URL analysis, and malware intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!isProxyConfigured && (
            <div className="px-3 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              ⚠️ Proxy not configured - limited sources
            </div>
          )}
          {status && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className={`w-2 h-2 rounded-full ${status.overallAvailable ? "bg-green-400" : "bg-red-400"}`} />
              {status.sources.filter(s => s.available).length} / {status.sources.length} sources available
            </div>
          )}
        </div>
      </div>

      <IOCInputSection
        ioc={ioc}
        setIoc={setIoc}
        onAnalyze={handleAnalyze}
        isAnalyzing={isAnalyzing}
        history={history}
        onHistorySelect={handleHistorySelect}
      />

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="font-medium text-red-400">Error</div>
          <div className="text-sm text-muted-foreground mt-1">{error}</div>
        </div>
      )}

      {result && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold">Investigation Summary</h2>
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-1 text-xs rounded font-mono ${TYPE_ICONS[result.ioc.type]}`}>
                      {TYPE_LABELS[result.ioc.type]}
                    </span>
                    <span className="font-mono text-sm">{result.ioc.value}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Normalized: <span className="font-mono">{result.ioc.normalized}</span>
                </p>
              </div>
              <ReputationSection result={result} />
              <ContextLinksSection result={result} />
              <RelatedIndicatorsSection result={result} />
            </div>
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Scan Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">IOC Type</span>
                    <span className="font-mono">{TYPE_LABELS[result.ioc.type]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sources Queried</span>
                    <span className="font-mono">{result.sourcesQueried.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Results</span>
                    <span className="font-mono">{result.reputation.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Malicious</span>
                    <span className="font-mono text-red-400">{result.reputation.filter(r => r.verdict === "malicious").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suspicious</span>
                    <span className="font-mono text-yellow-400">{result.reputation.filter(r => r.verdict === "suspicious").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Clean</span>
                    <span className="font-mono text-green-400">{result.reputation.filter(r => r.verdict === "clean" || r.verdict === "no-detections").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Errors</span>
                    <span className="font-mono text-red-400">{result.errors.length}</span>
                  </div>
                </div>
              </div>

              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Source Status</h3>
                <div className="space-y-2">
                  {(status?.sources || []).map((source) => (
                    <div key={source.source} className="flex items-center justify-between text-sm">
                      <span>{source.name}</span>
                      <span className={source.available ? "text-green-400" : "text-red-400"}>
                        {source.available ? "● Available" : "● Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function IOCEnrichmentPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading...</div>}>
      <IOCEnrichmentContent />
    </Suspense>
  );
}