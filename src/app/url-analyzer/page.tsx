"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  normalizeUrl,
  parseUrlStructure,
  getVerdictColor,
  getVerdictLabel,
  getCategoryColor,
  getCategoryLabel,
  type UrlAnalysisResult,
  type UrlStructure,
  type UrlHeuristicIndicator,
  type UrlThreatResult,
  type UrlRedirectChain,
  type UrlRedirectHop,
  type UrlVerdict,
  type UrlThreatCategory,
} from "@/lib/cyber-intel/types/url-analyzer";
import {
  analyzeUrlHeuristics,
} from "@/lib/cyber-intel/utils/url-heuristics";
import {
  fetchAllUrlReputation,
  checkUrlAnalyzerStatus,
  getProxyUrl,
} from "@/lib/cyber-intel/api/url-reputation";
import { investigateRedirectChain } from "@/lib/cyber-intel/utils/url-redirect";

const VERDICT_ICONS: Record<UrlVerdict, string> = {
  malicious: "🔴",
  phishing: "🟠",
  malware: "🟣",
  suspicious: "🟡",
  safe: "🟢",
  unknown: "⚪",
  unavailable: "⚫",
};

function VercelAnalytics() {
  return null;
}

function UrlInputSection({
  url,
  setUrl,
  onAnalyze,
  isAnalyzing,
  history,
  onHistorySelect,
}: {
  url: string;
  setUrl: (url: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  history: Array<{ url: string; timestamp: string; verdict: string }>;
  onHistorySelect: (url: string) => void;
}) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1 flex gap-2">
          <label htmlFor="url-input" className="sr-only">
            URL to analyze
          </label>
          <input
            id="url-input"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
            placeholder="Enter URL to analyze (e.g., example.com or https://example.com/path)"
            className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            disabled={isAnalyzing}
            autoComplete="off"
            spellCheck={false}
          />
          <button
            onClick={onAnalyze}
            disabled={isAnalyzing || !url.trim()}
            className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
          >
            {isAnalyzing ? "Analyzing..." : "Analyze"}
          </button>
        </div>
      </div>

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Recent Analyses</span>
            <button
              onClick={() => localStorage.removeItem("url-analyzer-history")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((item, i) => (
              <button
                key={i}
                onClick={() => onHistorySelect(item.url)}
                className="px-3 py-1 bg-muted text-xs rounded-md hover:bg-muted/80 transition-colors truncate max-w-[200px] text-left"
                title={item.url}
              >
                {item.url.length > 50 ? item.url.substring(0, 47) + "..." : item.url}
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function VerdictBadge({ verdict, confidence }: { verdict: UrlVerdict; confidence: number | null }) {
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

function HeuristicsSection({ indicators, riskScore, verdict }: {
  indicators: UrlHeuristicIndicator[];
  riskScore: number;
  verdict: "clean" | "suspicious" | "high-risk";
}) {
  const detectedIndicators = indicators.filter((i) => i.detected);
  const cleanIndicators = indicators.filter((i) => !i.detected);

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Heuristic Analysis</h2>
        <VerdictBadge verdict={verdict === "high-risk" ? "malicious" : verdict === "suspicious" ? "suspicious" : "safe"} confidence={riskScore} />
      </div>

      <div className="mb-4">
        <div className="flex items-center gap-4 mb-2">
          <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.min(100, riskScore)}%`,
                backgroundColor:
                  riskScore >= 50 ? "#ff4444" : riskScore >= 20 ? "#ffaa00" : "#00cc66",
              }}
            />
          </div>
          <span className="font-mono text-lg font-semibold" style={{ color: riskScore >= 50 ? "#ff4444" : riskScore >= 20 ? "#ffaa00" : "#00cc66" }}>
            {riskScore}/100
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          Risk score based on {detectedIndicators.length} detected indicator{detectedIndicators.length !== 1 ? "s" : ""} out of {indicators.length} checks
        </p>
      </div>

      {detectedIndicators.length > 0 && (
        <details className="group open:mt-4">
          <summary className="cursor-pointer font-medium text-foreground flex items-center gap-2">
            <span>⚠️</span>
            Detected Indicators ({detectedIndicators.length})
            <span className="ml-auto text-sm text-muted-foreground">Click to expand</span>
          </summary>
          <div className="mt-4 space-y-3">
            {detectedIndicators.map((indicator) => (
              <div
                key={indicator.id}
                className="p-4 bg-muted/50 rounded-lg border-l-4"
                style={{ borderLeftColor: 
                  indicator.severity === "critical" ? "#ff4444" :
                  indicator.severity === "high" ? "#ff6600" :
                  indicator.severity === "medium" ? "#ffaa00" :
                  "#77847e"
                }}
              >
                <div className="flex items-start gap-3">
                  <span className="text-lg">
                    {indicator.severity === "critical" ? "🔴" :
                     indicator.severity === "high" ? "🟠" :
                     indicator.severity === "medium" ? "🟡" :
                     indicator.severity === "low" ? "🔵" : "⚪"}
                  </span>
                  <div className="flex-1">
                    <h4 className="font-medium">{indicator.name}</h4>
                    <p className="text-sm text-muted-foreground mt-1">{indicator.description}</p>
                    {indicator.details && (
                      <p className="text-xs font-mono text-muted-foreground mt-1">{indicator.details}</p>
                    )}
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-muted text-muted-foreground">
                        {indicator.category}
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded" style={{ 
                        backgroundColor: indicator.severity === "critical" ? "#ff444420" :
                                         indicator.severity === "high" ? "#ff660020" :
                                         indicator.severity === "medium" ? "#ffaa0020" : "#77847e20",
                        color: indicator.severity === "critical" ? "#ff4444" :
                               indicator.severity === "high" ? "#ff6600" :
                               indicator.severity === "medium" ? "#ffaa00" : "#77847e"
                      }}>
                        {indicator.severity}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      <details className="mt-4">
        <summary className="cursor-pointer font-medium text-muted-foreground flex items-center gap-2">
          <span>✅</span>
          Passed Checks ({cleanIndicators.length})
        </summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {cleanIndicators.map((indicator) => (
            <span
              key={indicator.id}
              className="px-2 py-1 text-xs rounded bg-green-500/10 text-green-400 border border-green-500/20"
            >
              {indicator.name}
            </span>
          ))}
        </div>
      </details>
    </section>
  );
}

function UrlStructureSection({ structure }: { structure: UrlStructure }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">URL Structure</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          { label: "Scheme", value: structure.scheme },
          { label: "Hostname", value: structure.hostname },
          { label: "Port", value: structure.port },
          { label: "Path", value: structure.path },
          { label: "Query", value: structure.query },
          { label: "Fragment", value: structure.fragment },
          { label: "Root Domain", value: structure.rootDomain },
          { label: "Subdomain", value: structure.subdomain },
          { label: "TLD", value: structure.tld },
          { label: "Is IP Address", value: structure.isIpAddress ? "Yes" : "No" },
          { label: "Encoded Components", value: structure.encodedComponents.length.toString() },
        ].map((item, i) => (
          <div key={i} className="p-3 bg-muted/30 rounded-lg">
            <div className="text-xs text-muted-foreground mb-1">{item.label}</div>
            <div className="font-mono text-sm break-all">{item.value || "—"}</div>
          </div>
        ))}
      </div>

      {structure.encodedComponents.length > 0 && (
        <details className="mt-4">
          <summary className="cursor-pointer font-medium text-foreground">Encoded Components</summary>
          <div className="mt-2 space-y-1">
            {structure.encodedComponents.map((enc, i) => (
              <div key={i} className="text-xs font-mono p-2 bg-muted rounded">
                <span className="text-muted-foreground">{enc.component}: </span>
                <span className="text-red-400">{enc.encoded}</span>
                <span className="text-muted-foreground mx-2">→</span>
                <span className="text-green-400">{enc.decoded}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </section>
  );
}

function ThreatResultsSection({ results }: { results: UrlThreatResult[] }) {
  const availableResults = results.filter((r) => r.verdict !== "unavailable");
  const detectionResults = results.filter((r) => r.verdict !== "safe" && r.verdict !== "unavailable");

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Threat Intelligence Results</h2>
        <div className="flex items-center gap-4 text-sm">
          <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">
            ✅ {results.filter(r => r.verdict === "safe").length} Clean
          </span>
          <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            ⚠️ {results.filter(r => r.verdict === "suspicious").length} Suspicious
          </span>
          <span className="px-2 py-1 rounded bg-red-500/10 text-red-400 border border-red-500/20">
            🔴 {results.filter(r => r.verdict === "malicious" || r.verdict === "phishing" || r.verdict === "malware").length} Malicious
          </span>
          <span className="px-2 py-1 rounded bg-gray-500/10 text-gray-400 border border-gray-500/20">
            ⚫ {results.filter(r => r.verdict === "unavailable").length} Unavailable
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {results.map((result) => (
          <div
            key={result.source}
            className="p-4 rounded-lg border"
            style={{ borderColor: getVerdictColor(result.verdict) + "40", backgroundColor: getVerdictColor(result.verdict) + "10" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center gap-3">
                <VerdictBadge verdict={result.verdict} confidence={result.confidence} />
                <div>
                  <div className="font-medium">{result.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {result.categories.length > 0 ? (
                      result.categories.map((cat, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs rounded mr-1"
                          style={{ backgroundColor: getCategoryColor(cat) + "20", color: getCategoryColor(cat) }}
                        >
                          {getCategoryLabel(cat)}
                        </span>
                      ))
                    ) : (
                      <span className="text-muted-foreground">No threat categories</span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {result.detectionCount !== null && (
                  <span>Detections: <span className="font-mono">{result.detectionCount}</span> / {result.totalVendors || "?"}</span>
                )}
                {result.lastAnalysisDate && (
                  <span>Last scan: <span className="font-mono">{new Date(result.lastAnalysisDate).toLocaleDateString()}</span></span>
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
            {result.error && (
              <div className="mt-3 p-2 bg-red-500/10 border border-red-500/20 rounded text-red-400 text-sm">
                Error: {result.error}
              </div>
            )}
          </div>
        ))}
      </div>

      {detectionResults.length > 0 && (
        <div className="mt-4 p-4 bg-red-500/10 border border-red-500/20 rounded">
          <h3 className="font-medium text-red-400 mb-2">⚠️ Threats Detected</h3>
          <p className="text-sm text-muted-foreground">
            This URL has been flagged by {detectionResults.length} threat intelligence source{detectionResults.length !== 1 ? "s" : ""}.
            Exercise extreme caution before visiting.
          </p>
        </div>
      )}
    </section>
  );
}

function RedirectChainSection({ chain }: { chain: UrlRedirectChain | null }) {
  if (!chain || chain.hops.length === 0) return null;

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Redirect Chain Investigation</h2>
      
      <div className="mb-4 flex flex-wrap gap-2">
        <span className="px-2 py-1 text-xs rounded bg-muted text-muted-foreground">
          {chain.totalHops} hop{chain.totalHops !== 1 ? "s" : ""}
        </span>
        {chain.hasLoop && (
          <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20">
            ⚠️ Loop Detected
          </span>
        )}
        {chain.maxHopsExceeded && (
          <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
            ⚠️ Max Hops Exceeded
          </span>
        )}
        {chain.error && (
          <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20">
            Error: {chain.error}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {chain.hops.map((hop, i) => (
          <div
            key={i}
            className="p-4 rounded-lg border bg-muted/30"
            style={{ borderLeftColor: hop.domainChange ? "#ffaa00" : "#00cc66" }}
          >
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="font-mono text-lg font-bold text-muted-foreground">{i + 1}</span>
                {hop.domainChange && <span className="text-yellow-400">🔄 Domain Change</span>}
                {hop.isPrivateIp && <span className="text-red-400">🚫 Private IP</span>}
                {hop.isLocalhost && <span className="text-red-400">🚫 Localhost</span>}
              </div>
              <div className="flex-1 text-sm font-mono break-all">{hop.url}</div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                {hop.statusCode && <span>Status: <span className="font-mono">{hop.statusCode}</span></span>}
                {hop.responseTime && <span>Time: <span className="font-mono">{hop.responseTime}ms</span></span>}
                {hop.contentType && <span>Type: <span className="font-mono">{hop.contentType}</span></span>}
              </div>
            </div>
            {hop.location && (
              <div className="mt-2 text-sm text-muted-foreground">
                Redirects to: <span className="font-mono break-all">{hop.location}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {chain.finalUrl && chain.finalUrl !== chain.hops[0]?.url && (
        <div className="mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded">
          <div className="font-medium text-green-400 mb-1">Final Destination</div>
          <div className="font-mono text-sm break-all">{chain.finalUrl}</div>
        </div>
      )}
    </section>
  );
}

function PhishingAnalysisSection({ 
  structure, 
  threatResults, 
  heuristicVerdict 
}: { 
  structure: UrlStructure; 
  threatResults: UrlThreatResult[];
  heuristicVerdict: "clean" | "suspicious" | "high-risk";
}) {
  const phishingResults = threatResults.filter(r => r.categories.includes("phishing"));
  const hasPhishingDetection = phishingResults.length > 0;
  const hasSuspiciousHeuristics = heuristicVerdict !== "clean";

  const indicators = [];
  if (structure.hostname) {
    if (structure.hostname.includes("login") || structure.hostname.includes("signin") || structure.hostname.includes("verify")) {
      indicators.push("Hostname contains authentication-related keywords");
    }
    if (structure.subdomain && (structure.subdomain.includes("security") || structure.subdomain.includes("account") || structure.subdomain.includes("support"))) {
      indicators.push("Subdomain mimics security/account/support services");
    }
  }
  if (structure.path && (structure.path.includes("/login") || structure.path.includes("/signin") || structure.path.includes("/verify") || structure.path.includes("/auth"))) {
    indicators.push("Path contains authentication endpoints");
  }
  if (structure.query && (structure.query.includes("redirect") || structure.query.includes("return") || structure.query.includes("next") || structure.query.includes("goto"))) {
    indicators.push("Query parameters suggest redirect chain (common in phishing)");
  }

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Phishing Analysis Workspace</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-3">Brand Impersonation Check</h3>
          <div className="space-y-2">
            {indicators.length > 0 ? (
              indicators.map((indicator, i) => (
                <div key={i} className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-400">
                  ⚠️ {indicator}
                </div>
              ))
            ) : (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                ✅ No obvious brand impersonation indicators detected
              </div>
            )}
          </div>

          <h3 className="font-medium mt-6 mb-3">Social Engineering Indicators</h3>
          <div className="space-y-2">
            {structure.query && structure.query.includes("urgent") && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-400">
                🔴 Query contains &quot;urgent&quot; - common social engineering tactic
              </div>
            )}
            {structure.query && (structure.query.includes("verify") || structure.query.includes("confirm") || structure.query.includes("update")) && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-400">
                🟡 Query suggests account verification - verify legitimacy
              </div>
            )}
            {structure.path && structure.path.includes(".php") && (
              <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded text-sm text-yellow-400">
                🟡 PHP endpoint - legacy tech often used in phishing kits
              </div>
            )}
            {indicators.length === 0 && !structure.query?.includes("urgent") && !structure.query?.includes("verify") && !structure.path?.includes(".php") && (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                ✅ No obvious social engineering patterns detected
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-medium mb-3">Phishing Intelligence Sources</h3>
          <div className="space-y-2">
            {phishingResults.length > 0 ? (
              phishingResults.map((result) => (
                <div key={result.source} className="p-3 bg-red-500/10 border border-red-500/20 rounded">
                  <div className="font-medium text-red-400">{result.name}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Verdict: <span className="font-mono">{getVerdictLabel(result.verdict)}</span>
                  </div>
                  {result.referenceUrl && (
                    <a href={result.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm underline mt-1 inline-block">
                      View Report →
                    </a>
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-400">
                ✅ No phishing detections from intelligence sources
              </div>
            )}
          </div>

          <h3 className="font-medium mt-6 mb-3">Quick Actions</h3>
          <div className="flex flex-wrap gap-2">
            <button className="px-3 py-2 text-sm border border-border rounded hover:bg-muted transition-colors">
              📋 Copy Analysis JSON
            </button>
            <button className="px-3 py-2 text-sm border border-border rounded hover:bg-muted transition-colors">
              📊 Export Report
            </button>
            <a 
              href={`https://www.virustotal.com/gui/url/${structure.normalized}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
            >
              🔍 VirusTotal
            </a>
            <a 
              href={`https://urlhaus.abuse.ch/url/${structure.normalized}`}
              target="_blank" 
              rel="noopener noreferrer"
              className="px-3 py-2 text-sm border border-border rounded hover:bg-muted transition-colors"
            >
              🏠 URLhaus
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function SafeControlsSection({ url, structure }: { url: string; structure: UrlStructure }) {
  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <h2 className="text-xl font-semibold mb-4">Safe Controls & Export</h2>
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => navigator.clipboard.writeText(url)}
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          📋 Copy Original URL
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(structure.normalized)}
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          📋 Copy Normalized URL
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(structure.hostname || "")}
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          📋 Copy Hostname
        </button>
        <button
          onClick={() => navigator.clipboard.writeText(structure.rootDomain || "")}
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          📋 Copy Root Domain
        </button>
        <a
          href={`https://www.virustotal.com/gui/url/${encodeURIComponent(structure.normalized)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          🔍 Open in VirusTotal
        </a>
        <a
          href={`https://urlhaus.abuse.ch/url/${encodeURIComponent(structure.normalized)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          🏠 Open in URLhaus
        </a>
        <a
          href={`https://otx.alienvault.com/indicator/url/${encodeURIComponent(structure.normalized)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-4 py-2 border border-border rounded hover:bg-muted transition-colors"
        >
          👁️ Open in OTX
        </a>
      </div>
    </section>
  );
}

function UrlAnalyzerContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [url, setUrl] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [result, setResult] = useState<UrlAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ sources: any[]; overallAvailable: boolean } | null>(null);
  const [history, setHistory] = useState<Array<{ url: string; timestamp: string; verdict: string }>>([]);
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleAnalyze = useCallback(async () => {
    const { url: normalizedUrl, error: normError } = normalizeUrl(url);
    if (normError || !normalizedUrl) {
      setError(normError || "Invalid URL");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setResult(null);

    abortControllerRef.current = new AbortController();

    try {
      const startTime = Date.now();
      const structure = parseUrlStructure(normalizedUrl);
      const { indicators, riskScore, verdict: heuristicVerdict } = analyzeUrlHeuristics(structure);
      const threatResults = await fetchAllUrlReputation(normalizedUrl);
      const redirectChain = await investigateRedirectChain(normalizedUrl, { maxRedirects: 10 });
      const scanDuration = Date.now() - startTime;

      const analysisResult: UrlAnalysisResult = {
        url: normalizedUrl,
        structure,
        heuristicIndicators: indicators,
        heuristicRiskScore: riskScore,
        heuristicVerdict,
        threatResults,
        redirectChain,
        domainIntel: null,
        ipReputation: null,
        scannedAt: new Date().toISOString(),
        scanDuration,
      };

      setResult(analysisResult);

      const newHistoryEntry = {
        url: normalizedUrl,
        timestamp: new Date().toISOString(),
        verdict: heuristicVerdict,
      };
      const newHistory = [newHistoryEntry, ...history.filter(h => h.url !== normalizedUrl)].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem("url-analyzer-history", JSON.stringify(newHistory));

      router.push(`/url-analyzer?url=${encodeURIComponent(normalizedUrl)}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [url, history, router]);

  useEffect(() => {
    const saved = localStorage.getItem("url-analyzer-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const paramUrl = searchParams.get("url");
    if (paramUrl) {
      setUrl(paramUrl);
      handleAnalyze();
    }
  }, [searchParams, handleAnalyze]);

  const checkStatus = useCallback(async () => {
    try {
      const statusData = await checkUrlAnalyzerStatus();
      setStatus(statusData);
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleHistorySelect = (selectedUrl: string) => {
    setUrl(selectedUrl);
    handleAnalyze();
  };

  const isProxyConfigured = !!getProxyUrl();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">URL Analyzer & Phishing Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            Deep URL analysis with heuristic inspection, threat intelligence, redirect investigation, and phishing detection
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

      <UrlInputSection
        url={url}
        setUrl={setUrl}
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
              <HeuristicsSection
                indicators={result.heuristicIndicators}
                riskScore={result.heuristicRiskScore}
                verdict={result.heuristicVerdict}
              />
              <UrlStructureSection structure={result.structure} />
              <ThreatResultsSection results={result.threatResults} />
              <RedirectChainSection chain={result.redirectChain} />
              <PhishingAnalysisSection
                structure={result.structure}
                threatResults={result.threatResults}
                heuristicVerdict={result.heuristicVerdict}
              />
              <SafeControlsSection url={result.url} structure={result.structure} />
            </div>
            <div className="space-y-6">
              <div className="bg-card border border-border rounded-xl p-6">
                <h3 className="font-semibold mb-4">Scan Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scanned At</span>
                    <span className="font-mono">{new Date(result.scannedAt).toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Scan Duration</span>
                    <span className="font-mono">{result.scanDuration}ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Heuristic Risk</span>
                    <span className="font-mono">{result.heuristicRiskScore}/100</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sources Queried</span>
                    <span className="font-mono">{result.threatResults.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Detections</span>
                    <span className="font-mono">{result.threatResults.filter(r => r.verdict !== "safe" && r.verdict !== "unavailable").length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Redirect Hops</span>
                    <span className="font-mono">{result.redirectChain?.totalHops || 0}</span>
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
                  <div className="pt-2 border-t border-border">
                    <span className="text-muted-foreground">Heuristics</span>
                    <span className="text-green-400">● Built-in</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default function UrlAnalyzerPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading...</div>}>
      <UrlAnalyzerContent />
    </Suspense>
  );
}