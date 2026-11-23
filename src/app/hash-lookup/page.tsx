"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  detectHashType,
  normalizeIOC,
  getVerdictColor,
  getVerdictLabel,
  type HashLookupResult,
  type HashType,
  type HashVerdict,
  type HashSource,
  type HashLookupHistoryEntry,
} from "@/lib/cyber-intel/types/ioc-investigator";
import {
  fetchHashLookup,
  checkHashLookupStatus,
  getProxyUrl,
} from "@/lib/cyber-intel/api/hash-lookup";

const VERDICT_ICONS: Record<HashVerdict, string> = {
  malicious: "🔴",
  suspicious: "🟠",
  clean: "🟢",
  unknown: "⚪",
  "no-detections": "🟢",
};

const SOURCE_LABELS: Record<HashSource, string> = {
  malwarebazaar: "MalwareBazaar",
  virustotal: "VirusTotal",
  otx: "AlienVault OTX",
  threatfox: "ThreatFox",
  urlhaus: "URLhaus",
};

function HashInputSection({
  hash,
  setHash,
  onAnalyze,
  isAnalyzing,
  history,
  onHistorySelect,
}: {
  hash: string;
  setHash: (hash: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  history: Array<{ hash: string; type: HashType; timestamp: string; verdict: string }>;
  onHistorySelect: (hash: string) => void;
}) {
  const detectedType = hash ? detectHashType(hash) : null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <label htmlFor="hash-input" className="sr-only">
            Hash to analyze
          </label>
          <input
            id="hash-input"
            type="text"
            value={hash}
            onChange={(e) => setHash(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
            placeholder="Enter hash (MD5, SHA1, SHA256) to analyze"
            className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={isAnalyzing}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || !hash.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {detectedType && (
        <div className="mt-3 flex items-center gap-3 text-sm">
          <span className="px-2 py-1 bg-primary/10 text-primary rounded-md font-mono">
            Detected: {detectedType.toUpperCase()}
          </span>
          <span className="text-muted-foreground">
            {detectedType === "md5" && "32 hex chars"}
            {detectedType === "sha1" && "40 hex chars"}
            {detectedType === "sha256" && "64 hex chars"}
          </span>
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Recent Analyses</span>
            <button
              onClick={() => localStorage.removeItem("hash-lookup-history")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((item, i) => (
              <button
                key={i}
                onClick={() => onHistorySelect(item.hash)}
                className="px-3 py-1 bg-muted text-xs rounded-md hover:bg-muted/80 transition-colors truncate max-w-[200px] text-left"
                title={`${item.hash} (${item.type})`}
              >
                {item.hash.length > 40 ? item.hash.substring(0, 37) + "..." : item.hash}
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-muted-foreground/20 rounded">{item.type.toUpperCase()}</span>
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

function FileInfoSection({ result }: { result: HashLookupResult }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">File Information</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "File Name", value: result.fileName },
          { label: "File Type", value: result.fileType },
          { label: "File Size", value: result.fileSize ? `${(result.fileSize / 1024).toFixed(1)} KB` : null },
          { label: "MD5", value: result.md5 },
          { label: "SHA1", value: result.sha1 },
          { label: "SHA256", value: result.sha256 },
          { label: "Malware Family", value: result.malwareFamily },
          { label: "Threat Classification", value: result.threatClassification },
          { label: "First Seen", value: result.firstSeen ? new Date(result.firstSeen).toLocaleDateString() : null },
          { label: "Last Seen", value: result.lastSeen ? new Date(result.lastSeen).toLocaleDateString() : null },
        ].map((item, i) => (
          <div key={i} className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
            <div className="font-mono text-sm break-all">{item.value || "—"}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function IntelligenceResultsSection({ result }: { result: HashLookupResult }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Intelligence Sources</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
            ✅ {result.intelligence.filter(i => i.verdict === "clean" || i.verdict === "no-detections").length} Clean
          </span>
          <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            ⚠️ {result.intelligence.filter(i => i.verdict === "suspicious").length} Suspicious
          </span>
          <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            🔴 {result.intelligence.filter(i => i.verdict === "malicious").length} Malicious
          </span>
          <span className="px-2 py-1 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
            ⚫ {result.intelligence.filter(i => i.verdict === "unknown").length} Unknown
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {result.intelligence.map((intel) => (
          <div
            key={intel.source}
            className="p-4 rounded-lg border"
            style={{ borderColor: getVerdictColor(intel.verdict) + "40", backgroundColor: getVerdictColor(intel.verdict) + "10" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <VerdictBadge verdict={intel.verdict} confidence={intel.confidence} />
                <div>
                  <div className="font-medium">{SOURCE_LABELS[intel.source]}</div>
                  {intel.lastAnalysisDate && (
                    <div className="text-sm text-muted-foreground">
                      Last analysis: {new Date(intel.lastAnalysisDate).toLocaleDateString()}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {intel.referenceUrl && (
                  <a
                    href={intel.referenceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline text-sm"
                  >
                    View Details →
                  </a>
                )}
              </div>
            </div>
            {intel.details && Object.keys(intel.details).length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm text-muted-foreground">Show raw details</summary>
                <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-x-auto font-mono text-muted-foreground">
                  {JSON.stringify(intel.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}
      </div>

      {result.intelligence.some(i => i.verdict === "malicious" || i.verdict === "suspicious") && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded">
          <h3 className="font-medium text-red-400 mb-2">⚠️ Malicious Detections Found</h3>
          <p className="text-sm text-muted-foreground">
            This hash has been flagged by {result.intelligence.filter(i => i.verdict === "malicious" || i.verdict === "suspicious").length} intelligence source{result.intelligence.filter(i => i.verdict === "malicious" || i.verdict === "suspicious").length !== 1 ? "s" : ""}.
            Exercise extreme caution when handling this file.
          </p>
        </div>
      )}
    </section>
  );
}

function VendorDetectionsSection({ result }: { result: HashLookupResult }) {
  if (!result.vendorDetections || result.vendorDetections.length === 0) return null;

  const maliciousDetections = result.vendorDetections.filter(d => d.category === "malicious");
  const suspiciousDetections = result.vendorDetections.filter(d => d.category === "suspicious");

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Vendor Detections ({result.vendorDetections.length} total)</h2>
      
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20">
          🔴 {maliciousDetections.length} Malicious
        </span>
        <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
          🟠 {suspiciousDetections.length} Suspicious
        </span>
        <span className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-400 border border-green-500/20">
          🟢 {result.vendorDetections.filter(d => d.category === "harmless" || d.category === "undetected").length} Clean/Undetected
        </span>
        {result.detectionRatio && (
          <span className="px-2 py-1 text-xs rounded bg-primary/10 text-primary border border-primary/20">
            Ratio: {result.detectionRatio}
          </span>
        )}
      </div>

      <details className="group">
        <summary className="cursor-pointer font-medium text-foreground flex items-center gap-2">
          View All Vendor Results
        </summary>
        <div className="mt-4 max-h-96 overflow-y-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-muted-foreground">
                <th className="pb-2 pr-4">Vendor</th>
                <th className="pb-2 pr-4">Category</th>
                <th className="pb-2 pr-4">Result</th>
                <th className="pb-2">Method</th>
              </tr>
            </thead>
            <tbody>
              {result.vendorDetections.map((detection, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2 pr-4 font-mono">{detection.vendor}</td>
                  <td className="py-2 pr-4">
                    <span
                      className="px-2 py-0.5 text-xs rounded"
                      style={{
                        backgroundColor:
                          detection.category === "malicious"
                            ? "#ff444420"
                            : detection.category === "suspicious"
                            ? "#ffaa0020"
                            : "#00cc6620",
                        color:
                          detection.category === "malicious"
                            ? "#ff4444"
                            : detection.category === "suspicious"
                            ? "#ffaa00"
                            : "#00cc66",
                      }}
                    >
                      {detection.category}
                    </span>
                  </td>
                  <td className="py-2 pr-4 font-mono text-red-400">{detection.result || "—"}</td>
                  <td className="py-2 text-muted-foreground">{detection.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </section>
  );
}

function ThreatTagsSection({ result }: { result: HashLookupResult }) {
  if (!result.threatTags || result.threatTags.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Threat Tags</h2>
      <div className="flex flex-wrap gap-2">
        {result.threatTags.map((tag, i) => (
          <span
            key={i}
            className="px-3 py-1 text-sm rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            {tag}
          </span>
        ))}
      </div>
    </section>
  );
}

function RelatedIOCsSection({ result }: { result: HashLookupResult }) {
  if (!result.relatedIOCs || result.relatedIOCs.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Related IOCs</h2>
      <div className="space-y-2">
        {result.relatedIOCs.map((ioc, i) => (
          <div
            key={i}
            className="p-3 bg-muted/30 rounded-lg flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-mono">
                {ioc.type.toUpperCase()}
              </span>
              <div>
                <div className="font-mono text-sm">{ioc.value}</div>
                <div className="text-xs text-muted-foreground">{ioc.relationship} · {ioc.source}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SafeControlsSection({ hash, type }: { hash: string; type: HashType }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Safe Controls & External Links</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(hash)}
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          📋 Copy Hash
        </button>
        <a
          href={`https://www.virustotal.com/gui/file/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          🔍 VirusTotal
        </a>
        <a
          href={`https://bazaar.abuse.ch/sample/${hash}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          🏠 MalwareBazaar
        </a>
        <a
          href={`https://otx.alienvault.com/indicator/file/${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          👁️ OTX
        </a>
        <a
          href={`https://threatfox.abuse.ch/ioc/?ioc=${hash}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          🦊 ThreatFox
        </a>
        <a
          href={`https://urlhaus.abuse.ch/sample/${hash}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          🌐 URLhaus
        </a>
      </div>
    </section>
  );
}

function HashLookupContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hash, setHash] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<HashLookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ sources: any[]; overallAvailable: boolean } | null>(null);
  const [history, setHistory] = useState<Array<{ hash: string; type: HashType; timestamp: string; verdict: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAnalyze = useCallback(async () => {
    const type = detectHashType(hash);
    if (!type) {
      setError("Invalid hash format. Supported: MD5 (32 chars), SHA1 (40 chars), SHA256 (64 chars)");
      return;
    }

    const cleanHash = normalizeIOC(hash, type);

    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const startTime = Date.now();
      const analysisResult = await fetchHashLookup(cleanHash);
      const scanDuration = Date.now() - startTime;

      if (!analysisResult) {
        throw new Error("No results returned from intelligence sources");
      }

      const finalResult = {
        ...analysisResult,
        scanDuration,
      };

      setResult(finalResult);

      const newHistoryEntry = {
        hash: cleanHash,
        type,
        timestamp: new Date().toISOString(),
        verdict: finalResult.intelligence.some(i => i.verdict === "malicious") ? "malicious" :
                 finalResult.intelligence.some(i => i.verdict === "suspicious") ? "suspicious" :
                 finalResult.intelligence.some(i => i.verdict === "clean" || i.verdict === "no-detections") ? "clean" : "unknown",
      };
      const newHistory = [newHistoryEntry, ...history.filter(h => h.hash !== cleanHash)].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem("hash-lookup-history", JSON.stringify(newHistory));

      router.push(`/hash-lookup?hash=${encodeURIComponent(cleanHash)}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [hash, history, router]);

  useEffect(() => {
    const saved = localStorage.getItem("hash-lookup-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const paramHash = searchParams.get("hash");
    if (paramHash) {
      setHash(paramHash);
      handleAnalyze();
    }
  }, [searchParams, handleAnalyze]);

  const checkStatus = useCallback(async () => {
    try {
      const statusData = await checkHashLookupStatus();
      setStatus(statusData);
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleHistorySelect = (selectedHash: string) => {
    setHash(selectedHash);
    handleAnalyze();
  };

  const isProxyConfigured = !!getProxyUrl();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Hash Lookup & Malware Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Multi-source malware sample analysis with MalwareBazaar, VirusTotal, OTX, ThreatFox & URLhaus
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

      <HashInputSection
        hash={hash}
        setHash={setHash}
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
                  <h2 className="text-xl font-semibold">Overall Verdict</h2>
                  <VerdictBadge verdict={result.intelligence.some(i => i.verdict === "malicious") ? "malicious" :
                                              result.intelligence.some(i => i.verdict === "suspicious") ? "suspicious" :
                                              result.intelligence.some(i => i.verdict === "clean" || i.verdict === "no-detections") ? "clean" : "unknown"}
                                              confidence={result.intelligence.length > 0 ? 85 : null} />
                </div>
                <p className="text-sm text-muted-foreground">
                  Based on {result.intelligence.length} intelligence source{result.intelligence.length !== 1 ? "s" : ""}
                  {result.intelligence.some(i => i.verdict === "malicious") && " · Malicious detections found"}
                </p>
              </div>
              <FileInfoSection result={result} />
              <IntelligenceResultsSection result={result} />
              <VendorDetectionsSection result={result} />
              <ThreatTagsSection result={result} />
              <RelatedIOCsSection result={result} />
              <SafeControlsSection hash={result.hash} type={result.type} />
            </div>
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Scan Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Hash</span>
                    <span className="font-mono text-xs truncate max-w-[180px]">{result.hash}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Type</span>
                    <span className="font-mono text-xs uppercase">{result.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sources Queried</span>
                    <span className="font-mono">{result.intelligence.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Malicious Detections</span>
                    <span className="font-mono text-red-400">{result.intelligence.filter(i => i.verdict === "malicious").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Suspicious Detections</span>
                    <span className="font-mono text-yellow-400">{result.intelligence.filter(i => i.verdict === "suspicious").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scan Duration</span>
                    <span className="font-mono">{result.scanDuration}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Cached</span>
                    <span className="font-mono">{result.isCached ? "Yes" : "No"}</span>
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

export default function HashLookupPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading...</div>}>
      <HashLookupContent />
    </Suspense>
  );
}