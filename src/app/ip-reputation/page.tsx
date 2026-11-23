"use client";

import * as React from "react";
import { Suspense } from "react";
import { Search, X, RefreshCw, Copy, ChevronDown, ChevronUp, ExternalLink, Download, History, ShieldAlert, Globe, Network, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchIPReputation,
  checkIPReputationSourceStatus,
  addToHistory,
  getHistory,
  clearHistory,
  exportInvestigation,
  getSourceLabel,
  getRiskColor,
  getRiskLabel,
  getClassificationColor,
  getClassificationLabel,
  validateIP,
  type IPReputationResult,
  type IPReputationStatus,
  type IPLookupHistoryEntry,
  type IPReputationSource,
  type IPReputationSourceStatus,
  type AbuseIPDBData,
  type VirusTotalData,
  type GreyNoiseData,
  type IPinfoData,
  type OTXData,
} from "@/lib/cyber-intel";

function formatDate(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "Invalid date";
  }
}

function formatNumber(num: number | null): string {
  if (num === null || num === undefined) return "Not available";
  return num.toLocaleString();
}

function truncate(str: string, len: number = 50): string {
  if (str.length <= len) return str;
  return `${str.slice(0, len)}…`;
}

function copyToClipboard(text: string, setCopied: React.Dispatch<React.SetStateAction<string | null>>, label: string) {
  navigator.clipboard.writeText(text);
  setCopied(label);
  setTimeout(() => setCopied(null), 2000);
}

export function IPReputationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialIP = searchParams.get("ip") ?? "";

  const [ipInput, setIpInput] = React.useState(initialIP);
  const [result, setResult] = React.useState<IPReputationResult | null>(null);
  const [status, setStatus] = React.useState<IPReputationStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [expandedSources, setExpandedSources] = React.useState<Record<string, boolean>>({});
  const [copiedLabel, setCopiedLabel] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [history, setHistory] = React.useState<IPLookupHistoryEntry[]>([]);
  const [inputError, setInputError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const h = getHistory();
    setHistory(h);
  }, []);

  const fetchStatus = React.useCallback(async () => {
    setStatusLoading(true);
    try {
      const s = await checkIPReputationSourceStatus();
      setStatus(s);
    } catch {
      setStatus({
        sources: [],
        lastRefresh: new Date().toISOString(),
        overallAvailable: false,
      });
    } finally {
      setStatusLoading(false);
    }
  }, []);

  const investigate = React.useCallback(async (ip: string) => {
    const validation = validateIP(ip);
    if (!validation.valid) {
      setInputError("Invalid IP address format");
      return;
    }
    setInputError(null);
    setLoading(true);
    setError(null);
    
    try {
      const res = await fetchIPReputation(ip);
      if (res) {
        setResult(res);
        addToHistory({
          ip: res.ip,
          timestamp: res.lastUpdated,
          riskLevel: res.overallRisk,
          sourcesQueried: Object.entries(res.sources)
            .filter(([, v]) => v !== null)
            .map(([k]) => k as IPReputationSource),
        });
        const h = getHistory();
        setHistory(h);
      } else {
        setError("Failed to fetch IP reputation data. Check API configuration.");
        setResult(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Investigation failed");
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRefresh = React.useCallback(async () => {
    if (!result) return;
    setRefreshing(true);
    try {
      const res = await fetchIPReputation(result.ip);
      if (res) setResult(res);
    } finally {
      setRefreshing(false);
    }
  }, [result]);

  const handleSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    investigate(ipInput.trim());
  }, [ipInput, investigate]);

  const handleHistorySelect = React.useCallback((entry: IPLookupHistoryEntry) => {
    setIpInput(entry.ip);
    investigate(entry.ip);
  }, [investigate]);

  const handleExport = React.useCallback(() => {
    if (!result) return;
    const json = exportInvestigation(result);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ip-reputation-${result.ip}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result]);

  const handleClearHistory = React.useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  React.useEffect(() => {
    fetchStatus();
    if (initialIP) {
      investigate(initialIP);
    }
  }, [fetchStatus, initialIP, investigate]);

  if (initialIP && !loading && !result && !error) {
    return null; // Will show error state below
  }

  return (
    <main className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
              // 14 — ip reputation & investigation
            </p>
            <h1 className="mt-3 text-4xl font-semibold">
              IP Reputation Lookup
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9ba8a1]">
              Investigate IPv4 and IPv6 addresses across multiple threat intelligence
              sources. Get geolocation, network intelligence, abuse reports, and risk
              assessment in a single unified interface.
            </p>
          </div>
        </div>

        {/* Source Status Bar */}
        <div className="mb-8 border border-white/[0.06] bg-black/10 rounded-md p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="text-[#58d7f7]" size={14} />
              <div>
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                  Intelligence source status
                </p>
                <p className={`font-mono text-xs ${
                  statusLoading ? "text-[#58d7f7]" : 
                  status?.overallAvailable ? "text-[#dfe7e3]" : "text-[#ff9a92]"
                }`}>
                  {statusLoading
                    ? "Checking source availability…"
                    : status?.overallAvailable
                    ? `${status.sources.filter((s: IPReputationSourceStatus) => s.available).length} of ${status.sources.length} sources online`
                    : "No sources available — configure API keys"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={fetchStatus}
              disabled={statusLoading}
              className="inline-flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50"
            >
              <RefreshCw size={13} className={statusLoading ? "animate-spin" : ""} />
              {statusLoading ? "Checking…" : "Refresh status"}
            </button>
          </div>
        </div>

        {/* Search Form */}
        <div className="mb-10 glass-panel rounded-xl p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1 relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#77847e]" size={16} />
                <input
                  ref={inputRef}
                  type="text"
                  value={ipInput}
                  onChange={(e) => {
                    setIpInput(e.target.value);
                    if (inputError) setInputError(null);
                  }}
                  placeholder="Enter IPv4 or IPv6 address (e.g., 8.8.8.8 or 2001:4860:4860::8888)"
                  className={`h-12 w-full rounded-md border ${
                    inputError ? "border-[#ff7b72]/40" : "border-white/[0.08]"
                  } bg-[#070b10]/80 pl-10 pr-12 font-mono text-sm text-[#dfe7e3] outline-none transition focus:border-[#58d7f7]/40`}
                  disabled={loading}
                  autoFocus
                />
                {inputError && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[#ff7b72] text-sm">
                    ⚠
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={loading || !ipInput.trim()}
                className="inline-flex items-center gap-2 h-12 px-6 bg-[#58d7f7] border border-[#58d7f7]/40 text-[#061016] font-mono text-sm font-bold uppercase tracking-tighter rounded-md hover:bg-[#91e8fb] hover:border-[#58d7f7] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Investigating…
                  </>
                ) : (
                  <>
                    <Search size={16} />
                    Investigate
                  </>
                )}
              </button>
              {result && (
                <button
                  type="button"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="inline-flex items-center gap-2 h-12 px-4 border border-white/[0.08] bg-[#0d1218] text-[#77847e] font-mono text-[10px] uppercase rounded-md hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                  {refreshing ? "Refreshing…" : "Refresh"}
                </button>
              )}
            </div>
            
            {ipInput && (
              <div className="flex flex-wrap items-center gap-2 font-mono text-[9px] uppercase text-[#77847e]">
                <span>Quick actions:</span>
                <button
                  type="button"
                  onClick={() => copyToClipboard(ipInput, setCopiedLabel, "IP address")}
                  className="border border-white/[0.08] px-2 py-1 rounded text-[#9ba8a1] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] transition-colors"
                >
                  Copy IP
                </button>
                <button
                  type="button"
                  onClick={() => setShowHistory(!showHistory)}
                  className="border border-white/[0.08] px-2 py-1 rounded text-[#9ba8a1] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] transition-colors"
                >
                  {showHistory ? "Hide" : "Show"} History
                </button>
                {result && (
                  <button
                    type="button"
                    onClick={handleExport}
                    className="border border-white/[0.08] px-2 py-1 rounded text-[#9ba8a1] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] transition-colors"
                  >
                    Export JSON
                  </button>
                )}
              </div>
            )}
          </form>

          {inputError && (
            <p className="mt-3 font-mono text-[9px] text-[#ff7b72]">{inputError}</p>
          )}
        </div>

        {/* History Panel */}
        {showHistory && history.length > 0 && (
          <div className="mb-10 glass-panel rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">
                Recent investigations
              </p>
              <button
                type="button"
                onClick={handleClearHistory}
                className="font-mono text-[9px] uppercase text-[#ff7b72] hover:text-[#ff9a92] transition-colors"
              >
                Clear history
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((entry) => (
                <button
                  key={entry.ip}
                  type="button"
                  onClick={() => handleHistorySelect(entry)}
                  className="flex items-center gap-2 px-3 py-2 rounded-md border border-white/[0.06] bg-black/20 text-[#bdc8c2] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] transition-colors"
                >
                  <History size={12} className="text-[#77847e]" />
                  <span className="font-mono text-xs">{entry.ip}</span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[8px] font-mono ${getRiskColor(entry.riskLevel)}/20 bg-${getRiskColor(entry.riskLevel)}/10 text-${getRiskColor(entry.riskLevel)}`}
                  >
                    {getRiskLabel(entry.riskLevel)}
                  </span>
                  <span className="text-[8px] text-[#77847e]">
                    {formatDate(entry.timestamp)}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && !result && (
          <div className="mb-10 glass-panel rounded-xl border border-[#ff7b72]/30 bg-[#ff7b72]/[0.03] p-6 text-center">
            <AlertTriangle className="mx-auto mb-3 text-[#ff7b72]" size={24} />
            <h2 className="mb-2 text-lg font-semibold">Investigation Failed</h2>
            <p className="mb-4 font-mono text-sm text-[#ff9a92]">{error}</p>
            <button
              type="button"
              onClick={() => investigate(ipInput.trim())}
              className="inline-flex items-center gap-2 border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:border-[#58d7f7] hover:bg-[#58d7f7]/0.06 transition-colors"
            >
              <RefreshCw size={13} /> Retry
            </button>
          </div>
        )}

        {/* Results */}
        {result && (
          <>
            {/* Risk Overview */}
            <div className="mb-10 grid gap-4 md:grid-cols-4">
              <div className="col-span-1 md:col-span-2 glass-panel rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e]">
                    Target IP
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border ${getClassificationColor(result.classification)}/30 bg-${getClassificationColor(result.classification)}/[0.05] text-${getClassificationColor(result.classification)} text-[8px] font-semibold uppercase`}
                  >
                    {getClassificationLabel(result.classification)}
                  </span>
                </div>
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="font-mono text-3xl font-semibold text-[#dfe7e3]">
                    {result.ip}
                  </span>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.ip, setCopiedLabel, "IP address")}
                    className="p-1.5 text-[#77847e] hover:text-white hover:bg-white/[0.05] rounded transition-colors"
                    aria-label="Copy IP address"
                  >
                    <Copy size={14} />
                  </button>
                  <span className="font-mono text-xs text-[#9ba8a1]">
                    {result.version.toUpperCase()}
                  </span>
                </div>
                <p className="font-mono text-[9px] text-[#77847e]">
                  Last updated: {formatDate(result.lastUpdated)}
                </p>
              </div>
              <div className="col-span-1 glass-panel rounded-xl p-6">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                  Overall Risk
                </p>
                <div className={`inline-flex items-center gap-2 px-4 py-3 rounded-md border ${getRiskColor(result.overallRisk)}/30 bg-${getRiskColor(result.overallRisk)}/[0.05] text-${getRiskColor(result.overallRisk)}`}>
                  <span className="font-mono text-lg font-semibold">{getRiskLabel(result.overallRisk)}</span>
                  <span className="font-mono text-xs text-[#77847e]">Score: {result.riskScore}/100</span>
                </div>
              </div>
              <div className="col-span-1 glass-panel rounded-xl p-6">
                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                  Sources Queried
                </p>
                <div className="space-y-1.5">
                  {Object.entries(result.sources).map(([source, data]) => (
                    <div key={source} className="flex items-center justify-between text-xs">
                      <span className="text-[#9ba8a1]">{getSourceLabel(source as any)}</span>
                      <span className={`font-mono ${data ? "text-[#00ff91]" : "text-[#ff7b72]"}`}>
                        {data ? "✓ Data" : "✗ Unavailable"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Geolocation & Network */}
            <div className="mb-10 grid gap-6 lg:grid-cols-2">
              <div className="glass-panel rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Globe className="text-[#58d7f7]" size={16} />
                  <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">
                    Geolocation
                  </p>
                </div>
                <div className="space-y-3">
                  {result.geolocation.country && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Country</span>
                      <span className="font-mono text-xs text-[#dfe7e3] font-semibold">
                        {result.geolocation.country} {result.geolocation.countryCode ? `(${result.geolocation.countryCode})` : ""}
                        {result.geolocation.isEU === true && <span className="ml-2 text-[#00ff91] text-[8px]">EU</span>}
                      </span>
                    </div>
                  )}
                  {result.geolocation.continent && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Continent</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">
                        {result.geolocation.continent} {result.geolocation.continentCode ? `(${result.geolocation.continentCode})` : ""}
                      </span>
                    </div>
                  )}
                  {result.geolocation.region && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Region</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">
                        {result.geolocation.region} {result.geolocation.regionCode ? `(${result.geolocation.regionCode})` : ""}
                      </span>
                    </div>
                  )}
                  {result.geolocation.city && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">City</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">{result.geolocation.city}</span>
                    </div>
                  )}
                  {result.geolocation.latitude !== null && result.geolocation.longitude !== null && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Coordinates</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">
                        {result.geolocation.latitude.toFixed(4)}, {result.geolocation.longitude.toFixed(4)}
                      </span>
                    </div>
                  )}
                  {result.geolocation.timezone && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Timezone</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">{result.geolocation.timezone}</span>
                    </div>
                  )}
                  {result.geolocation.postalCode && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Postal Code</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">{result.geolocation.postalCode}</span>
                    </div>
                  )}
                  {!result.geolocation.country && (
                    <p className="font-mono text-xs text-[#77847e] text-center py-4">No geolocation data available</p>
                  )}
                </div>
              </div>

              <div className="glass-panel rounded-xl p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Network className="text-[#58d7f7]" size={16} />
                  <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">
                    Network Intelligence
                  </p>
                </div>
                <div className="space-y-3">
                  {result.network.asn && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">ASN</span>
                      <span className="font-mono text-xs text-[#dfe7e3] font-semibold">{result.network.asn}</span>
                    </div>
                  )}
                  {result.network.asnName && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">ASN Name</span>
                      <span className="font-mono text-xs text-[#dfe7e3] truncate max-w-[200px]">{result.network.asnName}</span>
                    </div>
                  )}
                  {result.network.asnDomain && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">ASN Domain</span>
                      <span className="font-mono text-xs text-[#58d7f7] truncate max-w-[200px]">{result.network.asnDomain}</span>
                    </div>
                  )}
                  {result.network.isp && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">ISP</span>
                      <span className="font-mono text-xs text-[#dfe7e3] truncate max-w-[200px]">{result.network.isp}</span>
                    </div>
                  )}
                  {result.network.org && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Organization</span>
                      <span className="font-mono text-xs text-[#dfe7e3] truncate max-w-[200px]">{result.network.org}</span>
                    </div>
                  )}
                  {result.network.networkRange && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Network Range</span>
                      <span className="font-mono text-xs text-[#dfe7e3]">{result.network.networkRange}</span>
                    </div>
                  )}
                  {result.network.reverseDns && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Reverse DNS</span>
                      <span className="font-mono text-xs text-[#dfe7e3] truncate max-w-[200px]">{result.network.reverseDns}</span>
                    </div>
                  )}
                  {result.network.hostname && (
                    <div className="flex justify-between">
                      <span className="font-mono text-xs text-[#9ba8a1]">Hostname</span>
                      <span className="font-mono text-xs text-[#dfe7e3] truncate max-w-[200px]">{result.network.hostname}</span>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/[0.05]">
                    {result.network.isHosting === true && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ff7b72]/10 border border-[#ff7b72]/20 text-[#ff7b72]">Hosting</span>
                    )}
                    {result.network.isAnonymous === true && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ffca8a]/10 border border-[#ffca8a]/20 text-[#ffca8a]">Anonymous</span>
                    )}
                    {result.network.isAnycast === true && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#58d7f7]/10 border border-[#58d7f7]/20 text-[#58d7f7]">Anycast</span>
                    )}
                    {result.network.isMobile === true && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#00ff91]/10 border border-[#00ff91]/20 text-[#00ff91]">Mobile</span>
                    )}
                    {result.network.isSatellite === true && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#bb86fc]/10 border border-[#bb86fc]/20 text-[#bb86fc]">Satellite</span>
                    )}
                    {!result.network.isHosting && !result.network.isAnonymous && !result.network.isAnycast && !result.network.isMobile && !result.network.isSatellite && (
                      <span className="px-2 py-0.5 rounded text-[8px] font-mono text-[#77847e]">Standard</span>
                    )}
                  </div>
                  {!result.network.asn && !result.network.isp && (
                    <p className="font-mono text-xs text-[#77847e] text-center py-4">No network data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Source Details */}
            <div className="mb-10">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-mono text-xs uppercase tracking-[.18em] text-[#77847e]">
                    Source Intelligence
                  </p>
                  <h2 className="mt-2 text-2xl font-semibold">
                    Provider Analysis
                  </h2>
                </div>
              </div>
              <div className="space-y-4">
                {Object.entries(result.sources).map(([sourceKey, sourceData]) => {
                  const source = sourceKey as IPReputationSource;
                  const isExpanded = expandedSources[sourceKey] ?? false;
                  const sourceColors: Record<IPReputationSource, string> = {
                    abuseipdb: "#ff7b72",
                    virustotal: "#58d7f7",
                    greynoise: "#00ff91",
                    ipinfo: "#ffca8a",
                    otx: "#bb86fc",
                  };
                  const sourceColor = sourceColors[source];

                  if (!sourceData) {
                    return (
                      <div
                        key={sourceKey}
                        className="glass-panel rounded-xl border border-white/[0.06] p-5"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span
                              className="size-10 flex items-center justify-center rounded-md border"
                              style={{ borderColor: `${sourceColor}40`, backgroundColor: `${sourceColor}10`, color: sourceColor }}
                            >
                              {source.charAt(0).toUpperCase()}
                            </span>
                            <div>
                              <p className="font-mono text-sm font-semibold text-[#dfe7e3]">
                                {getSourceLabel(source)}
                              </p>
                              <p className="font-mono text-[9px] text-[#77847e]">
                                Data unavailable — source not configured or rate limited
                              </p>
                            </div>
                          </div>
                          <span className="font-mono text-[8px] text-[#ff7b72]">Unavailable</span>
                        </div>
                      </div>
                    );
                  }

                  if (source === "abuseipdb") {
                    const d = sourceData as AbuseIPDBData;
                    return (
                      <div key={sourceKey} className="glass-panel rounded-xl border border-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedSources(prev => ({ ...prev, [sourceKey]: !isExpanded }))}
                          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-10 flex items-center justify-center rounded-md border"
                              style={{ borderColor: `${sourceColor}40`, backgroundColor: `${sourceColor}10`, color: sourceColor }}
                            >
                              A
                            </span>
                            <div>
                              <p className="font-mono text-sm font-semibold text-[#dfe7e3]">
                                {getSourceLabel(source)}
                              </p>
                              <p className="font-mono text-[9px] text-[#77847e]">
                                IP Reputation & Abuse Reports
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded text-[8px] font-mono ${getRiskColor(
                                d.abuseConfidenceScore >= 75 ? "critical" : 
                                d.abuseConfidenceScore >= 50 ? "high" : 
                                d.abuseConfidenceScore >= 25 ? "medium" : 
                                d.abuseConfidenceScore >= 10 ? "low" : "clean"
                              )}`}
                            >
                              {getRiskLabel(
                                d.abuseConfidenceScore >= 75 ? "critical" : 
                                d.abuseConfidenceScore >= 50 ? "high" : 
                                d.abuseConfidenceScore >= 25 ? "medium" : 
                                d.abuseConfidenceScore >= 10 ? "low" : "clean"
                              )}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-[#77847e]" /> : <ChevronDown size={14} className="text-[#77847e]" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/[0.05] p-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Abuse Confidence</p>
                                <p className="font-mono text-2xl font-semibold" style={{ color: sourceColor }}>{d.abuseConfidenceScore}%</p>
                              </div>
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Total Reports</p>
                                <p className="font-mono text-2xl font-semibold text-[#dfe7e3]">{formatNumber(d.totalReports)}</p>
                              </div>
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Whitelisted</p>
                                <p className="font-mono text-2xl font-semibold text-[#dfe7e3]">{d.isWhitelisted ? "Yes" : "No"}</p>
                              </div>
                            </div>
                            {d.lastReportedAt && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Last Reported</p>
                                <p className="font-mono text-sm text-[#dfe7e3]">{formatDate(d.lastReportedAt)}</p>
                              </div>
                            )}
                            {d.countryName && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Country</p>
                                <p className="font-mono text-sm text-[#dfe7e3]">{d.countryName} {d.countryCode ? `(${d.countryCode})` : ""}</p>
                              </div>
                            )}
                            {d.isp && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">ISP</p>
                                <p className="font-mono text-sm text-[#dfe7e3] truncate">{d.isp}</p>
                              </div>
                            )}
                            {d.domain && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Domain</p>
                                <p className="font-mono text-sm text-[#58d7f7]">{d.domain}</p>
                              </div>
                            )}
                            {d.isTor && (
                              <div className="p-3 rounded bg-[#ff7b72]/10 border border-[#ff7b72]/20">
                                <p className="font-mono text-sm text-[#ff7b72] flex items-center gap-2">
                                  <AlertTriangle size={12} /> Tor exit node detected
                                </p>
                              </div>
                            )}
                            {d.reports.length > 0 && (
                              <div className="space-y-2">
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e]">Recent Reports</p>
                                <div className="max-h-60 overflow-y-auto space-y-2">
                                  {d.reports.slice(0, 10).map((report: AbuseIPDBData["reports"][0], i: number) => (
                                    <div key={i} className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                      <div className="flex justify-between mb-1">
                                        <span className="font-mono text-xs text-[#9ba8a1]">{formatDate(report.reportedAt)}</span>
                                        <span className="font-mono text-[8px] text-[#77847e]">{report.reporterCountry ?? "Unknown"}</span>
                                      </div>
                                      {report.comment && (
                                        <p className="font-mono text-[9px] text-[#bdc8c2] line-clamp-2">{report.comment}</p>
                                      )}
                                      {report.categories.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {report.categories.map((cat: number) => (
                                            <span key={cat} className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-white/[0.05] border border-white/[0.05] text-[#9ba8a1]">Cat {cat}</span>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (source === "virustotal") {
                    const d = sourceData as VirusTotalData;
                    const total = d.lastAnalysisStats.malicious + d.lastAnalysisStats.suspicious + d.lastAnalysisStats.undetected + d.lastAnalysisStats.harmless;
                    const maliciousPct = total > 0 ? Math.round((d.lastAnalysisStats.malicious / total) * 100) : 0;
                    return (
                      <div key={sourceKey} className="glass-panel rounded-xl border border-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedSources(prev => ({ ...prev, [sourceKey]: !isExpanded }))}
                          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-10 flex items-center justify-center rounded-md border"
                              style={{ borderColor: `${sourceColor}40`, backgroundColor: `${sourceColor}10`, color: sourceColor }}
                            >
                              VT
                            </span>
                            <div>
                              <p className="font-mono text-sm font-semibold text-[#dfe7e3]">
                                {getSourceLabel(source)}
                              </p>
                              <p className="font-mono text-[9px] text-[#77847e]">
                                IP Reputation & Malware Analysis
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded text-[8px] font-mono ${getRiskColor(
                                maliciousPct >= 50 ? "critical" : 
                                maliciousPct >= 20 ? "high" : 
                                maliciousPct >= 5 ? "medium" : 
                                maliciousPct > 0 ? "low" : "clean"
                              )}`}
                            >
                              {maliciousPct}% malicious
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-[#77847e]" /> : <ChevronDown size={14} className="text-[#77847e]" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/[0.05] p-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-4">
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Malicious</p>
                                <p className="font-mono text-2xl font-semibold text-[#ff7b72]">{d.lastAnalysisStats.malicious}</p>
                              </div>
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Suspicious</p>
                                <p className="font-mono text-2xl font-semibold text-[#ffca8a]">{d.lastAnalysisStats.suspicious}</p>
                              </div>
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Undetected</p>
                                <p className="font-mono text-2xl font-semibold text-[#00ff91]">{d.lastAnalysisStats.undetected}</p>
                              </div>
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Harmless</p>
                                <p className="font-mono text-2xl font-semibold text-[#58d7f7]">{d.lastAnalysisStats.harmless}</p>
                              </div>
                            </div>
                            {d.reputation !== 0 && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Reputation Score</p>
                                <p className="font-mono text-2xl font-semibold text-[#dfe7e3]">{d.reputation}</p>
                              </div>
                            )}
                            {d.asn && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">ASN</p>
                                <p className="font-mono text-sm text-[#dfe7e3]">{d.asn} {d.asnName ? `— ${d.asnName}` : ""}</p>
                              </div>
                            )}
                            {d.network && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Network</p>
                                <p className="font-mono text-sm text-[#dfe7e3] truncate">{d.network}</p>
                              </div>
                            )}
                            {d.country && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Country</p>
                                <p className="font-mono text-sm text-[#dfe7e3]">{d.country}</p>
                              </div>
                            )}
                            {d.tags.length > 0 && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.tags.slice(0, 15).map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-mono bg-white/[0.05] border border-white/[0.05] text-[#9ba8a1]">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (source === "greynoise") {
                    const d = sourceData as GreyNoiseData;
                    return (
                      <div key={sourceKey} className="glass-panel rounded-xl border border-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedSources(prev => ({ ...prev, [sourceKey]: !isExpanded }))}
                          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-10 flex items-center justify-center rounded-md border"
                              style={{ borderColor: `${sourceColor}40`, backgroundColor: `${sourceColor}10`, color: sourceColor }}
                            >
                              GN
                            </span>
                            <div>
                              <p className="font-mono text-sm font-semibold text-[#dfe7e3]">
                                {getSourceLabel(source)}
                              </p>
                              <p className="font-mono text-[9px] text-[#77847e]">
                                Internet Scanner & Benign Service Classification
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span
                              className={`px-2.5 py-1 rounded text-[8px] font-mono ${d.noise ? (d.classification === "malicious" ? "bg-[#ff7b72]/20 text-[#ff7b72]" : "bg-[#ffca8a]/20 text-[#ffca8a]") : (d.riot ? "bg-[#00ff91]/20 text-[#00ff91]" : "bg-[#77847e]/20 text-[#77847e]")}`}
                            >
                              {d.noise ? `Noise (${d.classification})` : d.riot ? "RIOT (Benign)" : "Unknown"}
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-[#77847e]" /> : <ChevronDown size={14} className="text-[#77847e]" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/[0.05] p-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              {d.name && (
                                <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Organization</p>
                                  <p className="font-mono text-sm text-[#dfe7e3]">{d.name}</p>
                                </div>
                              )}
                              {d.lastSeen && (
                                <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Last Seen</p>
                                  <p className="font-mono text-sm text-[#dfe7e3]">{formatDate(d.lastSeen)}</p>
                                </div>
                              )}
                              {d.link && (
                                <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Reference</p>
                                  <a href={d.link} target="_blank" rel="noopener noreferrer" className="font-mono text-xs text-[#58d7f7] hover:text-[#00ff91] inline-flex items-center gap-1">
                                    View on GreyNoise <ExternalLink size={10} />
                                  </a>
                                </div>
                              )}
                            </div>
                            {d.metadata?.tags.length && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.metadata.tags.map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-mono bg-white/[0.05] border border-white/[0.05] text-[#9ba8a1]">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (source === "ipinfo") {
                    const d = sourceData as IPinfoData;
                    return (
                      <div key={sourceKey} className="glass-panel rounded-xl border border-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedSources(prev => ({ ...prev, [sourceKey]: !isExpanded }))}
                          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-10 flex items-center justify-center rounded-md border"
                              style={{ borderColor: `${sourceColor}40`, backgroundColor: `${sourceColor}10`, color: sourceColor }}
                            >
                              II
                            </span>
                            <div>
                              <p className="font-mono text-sm font-semibold text-[#dfe7e3]">
                                {getSourceLabel(source)}
                              </p>
                              <p className="font-mono text-[9px] text-[#77847e]">
                                IP Geolocation, ASN & Network Intelligence
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            {isExpanded ? <ChevronUp size={14} className="text-[#77847e]" /> : <ChevronDown size={14} className="text-[#77847e]" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/[0.05] p-5 space-y-4">
                            <div className="grid gap-4 md:grid-cols-3">
                              {d.asn && (
                                <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">ASN</p>
                                  <p className="font-mono text-sm text-[#dfe7e3]">{d.asn} {d.asnName ? `— ${d.asnName}` : ""}</p>
                                </div>
                              )}
                              {d.country && (
                                <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Country</p>
                                  <p className="font-mono text-sm text-[#dfe7e3]">{d.country} {d.countryCode ? `(${d.countryCode})` : ""}</p>
                                </div>
                              )}
                              {d.continent && (
                                <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Continent</p>
                                  <p className="font-mono text-sm text-[#dfe7e3]">{d.continent} {d.continentCode ? `(${d.continentCode})` : ""}</p>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {d.isHosting === true && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ff7b72]/10 border border-[#ff7b72]/20 text-[#ff7b72]">Hosting</span>
                              )}
                              {d.isAnonymous === true && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ffca8a]/10 border border-[#ffca8a]/20 text-[#ffca8a]">Anonymous</span>
                              )}
                              {d.isAnycast === true && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#58d7f7]/10 border border-[#58d7f7]/20 text-[#58d7f7]">Anycast</span>
                              )}
                              {d.isMobile === true && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#00ff91]/10 border border-[#00ff91]/20 text-[#00ff91]">Mobile</span>
                              )}
                              {d.isSatellite === true && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#bb86fc]/10 border border-[#bb86fc]/20 text-[#bb86fc]">Satellite</span>
                              )}
                              {!d.isHosting && !d.isAnonymous && !d.isAnycast && !d.isMobile && !d.isSatellite && (
                                <span className="px-2 py-0.5 rounded text-[8px] font-mono text-[#77847e]">Standard</span>
                              )}
                            </div>
                            {d.privacy && (
                              <div className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Privacy Detection</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.privacy.vpn && <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ff7b72]/10 border border-[#ff7b72]/20 text-[#ff7b72]">VPN</span>}
                                  {d.privacy.proxy && <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ffca8a]/10 border border-[#ffca8a]/20 text-[#ffca8a]">Proxy</span>}
                                  {d.privacy.tor && <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ff7b72]/10 border border-[#ff7b72]/20 text-[#ff7b72]">Tor</span>}
                                  {d.privacy.relay && <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ffca8a]/10 border border-[#ffca8a]/20 text-[#ffca8a]">Relay</span>}
                                  {d.privacy.hosting && <span className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#58d7f7]/10 border border-[#58d7f7]/20 text-[#58d7f7]">Hosting</span>}
                                  {!d.privacy.vpn && !d.privacy.proxy && !d.privacy.tor && !d.privacy.relay && !d.privacy.hosting && (
                                    <span className="px-2 py-0.5 rounded text-[8px] font-mono text-[#00ff91]">Clean</span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (source === "otx") {
                    const d = sourceData as OTXData;
                    return (
                      <div key={sourceKey} className="glass-panel rounded-xl border border-white/[0.06] overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setExpandedSources(prev => ({ ...prev, [sourceKey]: !isExpanded }))}
                          className="w-full flex items-center justify-between p-5 hover:bg-white/[0.02] transition-colors"
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className="size-10 flex items-center justify-center rounded-md border"
                              style={{ borderColor: `${sourceColor}40`, backgroundColor: `${sourceColor}10`, color: sourceColor }}
                            >
                              OTX
                            </span>
                            <div>
                              <p className="font-mono text-sm font-semibold text-[#dfe7e3]">
                                {getSourceLabel(source)}
                              </p>
                              <p className="font-mono text-[9px] text-[#77847e]">
                                Threat Intelligence & Pulse Data
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-1 rounded text-[8px] font-mono text-[#dfe7e3] bg-white/[0.05] border border-white/[0.05]">
                              {d.pulseCount} pulses
                            </span>
                            {isExpanded ? <ChevronUp size={14} className="text-[#77847e]" /> : <ChevronDown size={14} className="text-[#77847e]" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-white/[0.05] p-5 space-y-4">
                            {d.malwareFamilies.length > 0 && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Malware Families</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.malwareFamilies.slice(0, 15).map((family: string) => (
                                    <span key={family} className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#ff7b72]/10 border border-[#ff7b72]/20 text-[#ff7b72]">{family}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {d.industries.length > 0 && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Target Industries</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.industries.map((ind: string) => (
                                    <span key={ind} className="px-2 py-0.5 rounded text-[8px] font-mono bg-[#58d7f7]/10 border border-[#58d7f7]/20 text-[#58d7f7]">{ind}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {d.tags.length > 0 && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Tags</p>
                                <div className="flex flex-wrap gap-1.5">
                                  {d.tags.slice(0, 20).map((tag: string) => (
                                    <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-mono bg-white/[0.05] border border-white/[0.05] text-[#9ba8a1]">{tag}</span>
                                  ))}
                                </div>
                              </div>
                            )}
                            {d.relatedPulses.length > 0 && (
                              <div>
                                <p className="font-mono text-xs uppercase tracking-[.15em] text-[#77847e] mb-2">Related Pulses</p>
                                <div className="space-y-2">
                                  {d.relatedPulses.slice(0, 5).map((pulse: OTXData["relatedPulses"][0]) => (
                                    <div key={pulse.id} className="p-3 rounded bg-black/20 border border-white/[0.05]">
                                      <p className="font-mono text-xs font-semibold text-[#dfe7e3] mb-1">{pulse.name}</p>
                                      <p className="font-mono text-[8px] text-[#9ba8a1] line-clamp-2">{pulse.description}</p>
                                      <div className="flex flex-wrap gap-1 mt-1">
                                        {pulse.tags.slice(0, 5).map((tag) => (
                                          <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-white/[0.05] border border-white/[0.05] text-[#9ba8a1]">{tag}</span>
                                        ))}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  }

                  return null;
                })}
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="mb-10 glass-panel rounded-xl border border-[#ffca8a]/20 bg-[#ffca8a]/[0.03] p-5">
              <div className="flex items-start gap-3">
                <AlertTriangle className="text-[#ffca8a] mt-0.5" size={16} />
                <div className="text-sm text-[#dfe7e3]">
                  <p className="font-mono text-xs uppercase tracking-[.15em] text-[#ffca8a] mb-1">Privacy Notice</p>
                  <p>
                    This tool queries public threat intelligence APIs with the IP address you provide.
                    Your lookup may be logged by third-party providers (AbuseIPDB, VirusTotal, GreyNoise, IPinfo, OTX).
                    Do not investigate sensitive internal infrastructure IPs. For private network analysis, use
                    local tools or authorized internal threat intelligence platforms.
                  </p>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Empty State */}
        {!loading && !result && !error && !initialIP && (
          <div className="glass-panel rounded-xl p-12 text-center">
            <Search className="mx-auto mb-4 text-[#77847e]" size={48} />
            <h2 className="mb-2 text-xl font-semibold text-[#dfe7e3]">
              Start an Investigation
            </h2>
            <p className="mb-6 max-w-md mx-auto text-sm leading-7 text-[#9ba8a1]">
              Enter an IPv4 or IPv6 address above to begin. The investigation will
              query multiple threat intelligence sources and present a unified analysis.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3 font-mono text-[9px] uppercase text-[#77847e]">
              <span>Examples:</span>
              <code className="px-2 py-1 rounded bg-black/20 border border-white/[0.05] text-[#58d7f7]">8.8.8.8</code>
              <code className="px-2 py-1 rounded bg-black/20 border border-white/[0.05] text-[#58d7f7]">1.1.1.1</code>
              <code className="px-2 py-1 rounded bg-black/20 border border-white/[0.05] text-[#58d7f7]">2001:4860:4860::8888</code>
              <code className="px-2 py-1 rounded bg-black/20 border border-white/[0.05] text-[#58d7f7]">185.220.101.1</code>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

function IPReputationPageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#58d7f7]" /></div>}>
      <IPReputationPage />
    </Suspense>
  );
}

export default IPReputationPageWrapper;