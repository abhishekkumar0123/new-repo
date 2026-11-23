"use client";

import * as React from "react";
import { Suspense } from "react";
import { Search, X, RefreshCw, Copy, ChevronDown, ChevronUp, ExternalLink, Download, History, ShieldAlert, Globe, Network, AlertTriangle, CheckCircle2, Loader2, Terminal, FileText, Key, Lock, Unlock, Server, Database, Shield, Wifi, Link as LinkIcon, Eye, EyeOff, ChevronLeft } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  fetchDomainIntelligence,
  checkDomainIntelStatus,
  addToDomainHistory,
  getDomainHistory,
  clearDomainHistory,
  exportDomainInvestigation,
  getSourceLabel,
  getSourceColor,
  extractDomain,
  getReputationColor,
  getReputationLabel,
  type DomainIntelligenceResult,
  type DomainIntelStatus,
  type DomainLookupHistoryEntry,
  type DomainRecordType,
  type DnsRecord,
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

function formatDateShort(dateString: string | null): string {
  if (!dateString) return "Not available";
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "Invalid date";
  }
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

function getRecordTypeColor(type: DomainRecordType): string {
  const colors: Record<DomainRecordType, string> = {
    A: "#58d7f7",
    AAAA: "#00ff91",
    CNAME: "#ffca8a",
    MX: "#bb86fc",
    NS: "#ff9a92",
    TXT: "#77847e",
    SOA: "#58d7f7",
    PTR: "#00ff91",
    CAA: "#ffca8a",
  };
  return colors[type];
}

function getRecordTypeLabel(type: DomainRecordType): string {
  return type;
}

export function DomainIntelligencePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDomain = searchParams.get("domain") ?? "";

  const [domainInput, setDomainInput] = React.useState(initialDomain);
  const [result, setResult] = React.useState<DomainIntelligenceResult | null>(null);
  const [status, setStatus] = React.useState<DomainIntelStatus | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [refreshing, setRefreshing] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [statusLoading, setStatusLoading] = React.useState(true);
  const [expandedSources, setExpandedSources] = React.useState<Record<string, boolean>>({});
  const [expandedRecords, setExpandedRecords] = React.useState<Record<string, boolean>>({});
  const [copiedLabel, setCopiedLabel] = React.useState<string | null>(null);
  const [showHistory, setShowHistory] = React.useState(false);
  const [history, setHistory] = React.useState<DomainLookupHistoryEntry[]>([]);
  const [inputError, setInputError] = React.useState<string | null>(null);
  const [activeSection, setActiveSection] = React.useState<string>("overview");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const h = getDomainHistory();
    setHistory(h);
  }, []);

  const fetchStatus = React.useCallback(async () => {
    setStatusLoading(true);
    try {
      const s = await checkDomainIntelStatus();
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

  React.useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const handleInvestigate = React.useCallback(async () => {
    const validation = extractDomain(domainInput);
    if (validation.error || !validation.domain) {
      setInputError(validation.error ?? "Invalid domain");
      return;
    }

    setInputError(null);
    const cleanDomain = validation.domain;
    setDomainInput(cleanDomain);

    setLoading(true);
    setError(null);
    try {
      const data = await fetchDomainIntelligence(cleanDomain);
      if (data) {
        setResult(data);
        addToDomainHistory({
          domain: cleanDomain,
          timestamp: new Date().toISOString(),
          sourcesQueried: ["dns-doh", "rdap", "certificate-transparency"],
          riskLevel: "unknown",
        });
        const h = getDomainHistory();
        setHistory(h);
      } else {
        setError("Failed to fetch domain intelligence. The domain may not exist or all sources failed.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load domain intelligence.");
    } finally {
      setLoading(false);
    }
  }, [domainInput]);

  const handleRefresh = React.useCallback(async () => {
    if (!result) return;
    setRefreshing(true);
    try {
      const data = await fetchDomainIntelligence(result.domain);
      if (data) setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refresh failed.");
    } finally {
      setRefreshing(false);
    }
  }, [result]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleInvestigate();
    }
  };

  const pushUrl = (domain: string) => {
    void router.push(`/domain-intelligence?domain=${encodeURIComponent(domain)}`);
  };

  if (error && !result) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <ShieldAlert className="mx-auto mb-3 text-[#ff9a92]" size={24} />
            <h2 className="mb-2 text-lg font-semibold">Investigation Error</h2>
            <p className="mb-4 text-sm text-[#ff9a92]">{error}</p>
            <button
              type="button"
              onClick={handleInvestigate}
              className="border border-[#58d7f7]/30 px-4 py-2 font-mono text-[10px] uppercase text-[#58d7f7] hover:border-[#58d7f7] transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (loading && !result) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="premium-card glass-panel px-6 py-20 text-center">
            <Loader2 className="mx-auto mb-3 animate-spin text-[#58d7f7]" size={24} />
            <h2 className="mb-3 text-lg font-semibold">Investigating {domainInput}</h2>
            <p className="font-mono text-xs text-[#77847e]">
              Querying DNS, RDAP, Certificate Transparency, and threat intelligence sources…
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (!result && !loading && !error) {
    return (
      <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8 flex items-center justify-between gap-4">
            <div>
              <p className="font-mono text-xs uppercase tracking-[.18em] text-[#58d7f7]">
                // 12 — domain intelligence center
              </p>
              <h1 className="mt-3 text-4xl font-semibold">
                Domain Intelligence & DNS Investigation
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-7 text-[#9ba8a1]">
                Investigate domain infrastructure, DNS records, registration data, TLS certificates,
                and threat reputation from multiple real-time sources.
              </p>
            </div>
          </div>

          <div className="premium-card glass-panel p-8 max-w-2xl mx-auto">
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#77847e]"
                  size={16}
                />
                <input
                  ref={inputRef}
                  value={domainInput}
                  onChange={(event) => {
                    setDomainInput(event.target.value);
                    setInputError(null);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter domain (e.g., example.com, sub.example.com)"
                  className="h-12 w-full border border-white/[0.08] bg-[#0d161d]/80 pl-11 pr-11 font-mono text-xs outline-none placeholder:text-[#77847e] focus:border-[#58d7f7]/40"
                  autoFocus
                />
                {domainInput && (
                  <button
                    type="button"
                    onClick={() => setDomainInput("")}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-[#77847e] hover:text-[#58d7f7]"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={handleInvestigate}
                disabled={!domainInput.trim() || loading}
                className="inline-flex items-center justify-center gap-2 border border-white/[0.08] px-4 py-3 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search size={13} />
                Investigate
              </button>
            </div>

            {inputError && (
              <p className="mt-4 font-mono text-[9px] text-[#ff9a92]">{inputError}</p>
            )}

            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">
                Examples
              </p>
              <div className="flex flex-wrap gap-2">
                {["example.com", "github.com", "cloudflare.com", "google.com"].map((ex) => (
                  <button
                    key={ex}
                    type="button"
                    onClick={() => {
                      setDomainInput(ex);
                      handleInvestigate();
                    }}
                    className="px-3 py-1.5 rounded border border-white/[0.05] bg-black/10 font-mono text-[9px] text-[#58d7f7] hover:border-[#58d7f7]/30 hover:bg-[#00ff91]/[0.05] transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">
                Recent Investigations
              </p>
              {history.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {history.slice(0, 5).map((h) => (
                    <button
                      key={h.domain}
                      type="button"
                      onClick={() => {
                        setDomainInput(h.domain);
                        handleInvestigate();
                      }}
                      className="px-3 py-1.5 rounded border border-white/[0.05] bg-black/10 font-mono text-[9px] text-[#9ba8a1] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] transition-colors"
                    >
                      {h.domain}
                    </button>
                  ))}
                </div>
              ) : (
                <p className="font-mono text-[9px] text-[#77847e]/70">No recent investigations</p>
              )}
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (!result) return null;

  const sectionIds = [
    "overview",
    "dns",
    "registration",
    "certificates",
    "reputation",
    "hosting",
    "security",
  ];

  const sectionLabels: Record<string, string> = {
    overview: "Overview",
    dns: "DNS Records",
    registration: "Registration",
    certificates: "Certificates",
    reputation: "Reputation",
    hosting: "Hosting",
    security: "Security",
  };

  const sectionIcons: Record<string, React.ReactNode> = {
    overview: <Globe size={12} />,
    dns: <Network size={12} />,
    registration: <FileText size={12} />,
    certificates: <Lock size={12} />,
    reputation: <ShieldAlert size={12} />,
    hosting: <Server size={12} />,
    security: <Shield size={12} />,
  };

  const resolvedIpCount = result.resolvedIps.ipv4.length + result.resolvedIps.ipv6.length;
  const hasDetections = result.reputation.some((r) => r.status === "malicious" || r.status === "suspicious");

  return (
    <section className="min-h-screen px-5 pb-20 pt-28 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <button
          type="button"
          onClick={() => void router.push("/domain-intelligence")}
          className="inline-flex items-center gap-2 font-mono text-xs text-[#77847e] hover:text-[#58d7f7] mb-6 block"
        >
          <ChevronLeft size={14} /> Back to Search
        </button>

        <div className="lg:grid lg:grid-cols-[280px_1fr] lg:gap-8">
          <nav
            className="hidden lg:block border border-white/[0.06] bg-black/10 rounded-md p-4 shrink-0 sticky top-[100px] max-h-[calc(100vh-120px)] overflow-y-auto"
            aria-label="Domain intelligence sections"
          >
            <div className="flex items-center justify-between mb-4">
              <p className="font-mono text-[9px] uppercase tracking-[.18em] text-[#77847e]">
                Sections
              </p>
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md ${
                  resolvedIpCount > 0
                    ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]"
                    : "border-[#ff9a92]/30 bg-[#ff9a92]/[0.1] text-[#ff9a92]"
                }`}>
                  {resolvedIpCount} IP{resolvedIpCount !== 1 ? "s" : ""}
                </span>
              </div>
            </div>
            <ul className="space-y-1">
              {sectionIds.map((id) => (
                <li key={id}>
                  <button
                    type="button"
                    onClick={() => setActiveSection(id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 font-mono text-xs rounded ${
                      id === activeSection
                        ? "bg-[#00ff91]/[0.1] text-[#00ff91]"
                        : "text-[#77847e] hover:bg-white/[0.05] hover:text-[#58d7f7]"
                    }`}
                  >
                    {sectionIcons[id]}
                    {sectionLabels[id]}
                  </button>
                </li>
              ))}
            </ul>

            <div className="mt-6 pt-6 border-t border-white/[0.06]">
              <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">
                Source Status
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {status?.sources.map((source) => (
                  <div
                    key={source.source}
                    className={`p-2 border rounded ${
                      source.available
                        ? "border-[#00ff91]/25 bg-[#00ff91]/[0.03]"
                        : source.rateLimited
                        ? "border-[#ffca8a]/25 bg-[#ffca8a]/[0.03]"
                        : source.requiresConfiguration
                        ? "border-white/[0.08] bg-black/10"
                        : "border-white/[0.08] bg-black/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[9px] font-semibold text-[#dfe7e3]">
                        {getSourceLabel(source.source)}
                      </span>
                      <span
                        className={`font-mono text-[8px] px-1.5 py-0.5 rounded ${
                          source.available
                            ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]"
                            : source.rateLimited
                            ? "border-[#ffca8a]/30 bg-[#ffca8a]/[0.1] text-[#ffca8a]"
                            : "border-white/[0.10] bg-white/[0.05] text-[#77847e]"
                        }`}
                      >
                        {source.available ? "Online" : source.rateLimited ? "Rate limited" : source.requiresConfiguration ? "Needs config" : "Offline"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-white/[0.06]">
              <button
                type="button"
                onClick={() => {
                  setDomainInput("");
                  setResult(null);
                  setError(null);
                  void router.push("/domain-intelligence");
                }}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-white/[0.08] font-mono text-[10px] uppercase text-[#77847e] hover:border-[#58d7f7]/30 hover:text-[#58d7f7] transition-colors rounded"
              >
                <X size={13} />
                Clear Investigation
              </button>
            </div>
          </nav>

          <div className="lg:col-span-2">
            <div className="flex items-start justify-between gap-6 mb-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91] font-mono text-[9px] font-semibold uppercase">
                    <Globe size={12} /> Domain Intelligence
                  </span>
                  {result.subdomain && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-[#58d7f7]/30 bg-[#58d7f7]/[0.1] text-[#58d7f7] font-mono text-[9px] font-semibold uppercase">
                      Subdomain
                    </span>
                  )}
                  {hasDetections && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md border border-[#ff9a92]/30 bg-[#ff9a92]/[0.1] text-[#ff9a92] font-mono text-[9px] font-semibold uppercase">
                      <ShieldAlert size={12} /> Detections Found
                    </span>
                  )}
                </div>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight break-all">{result.domain}</h1>
                <div className="mt-3 flex flex-wrap items-center gap-3 font-mono text-[10px] text-[#9ba8a1]">
                  <span>Root: <span className="text-[#dfe7e3]">{result.rootDomain}</span></span>
                  <span>TLD: <span className="text-[#dfe7e3]">.{result.tld}</span></span>
                  {result.timestamps.domainAge && (
                    <span>Age: <span className="text-[#dfe7e3]">{result.timestamps.domainAge}</span></span>
                  )}
                  {result.timestamps.registrationDate && (
                    <span>Registered: <span className="text-[#dfe7e3]">{formatDateShort(result.timestamps.registrationDate)}</span></span>
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-3 shrink-0">
                <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md min-w-[200px]">
                  <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                    Resolution Status
                  </p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-md font-mono text-[10px] font-semibold uppercase border ${
                      resolvedIpCount > 0
                        ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]"
                        : "border-[#ff9a92]/30 bg-[#ff9a92]/[0.1] text-[#ff9a92]"
                    }`}
                  >
                    {resolvedIpCount > 0 ? `Resolved (${resolvedIpCount} IPs)` : "No Resolution"}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7] disabled:opacity-50"
                  >
                    <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
                    {refreshing ? "Refreshing…" : "Refresh"}
                  </button>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(result.domain, setCopiedLabel, "Domain")}
                    className="flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
                  >
                    <Copy size={13} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const json = exportDomainInvestigation(result);
                      copyToClipboard(json, setCopiedLabel, "JSON Export");
                    }}
                    className="flex items-center gap-2 border border-white/[0.08] px-3 py-2 font-mono text-[10px] uppercase text-[#77847e] transition hover:border-[#58d7f7]/30 hover:text-[#58d7f7]"
                  >
                    <Download size={13} />
                    Export JSON
                  </button>
                </div>
              </div>
            </div>

            <div className="space-y-8">
              {activeSection === "overview" && (
                <section id="overview" className="space-y-6">
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        IPv4 Addresses
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.resolvedIps.ipv4.length > 0
                          ? result.resolvedIps.ipv4.join(", ")
                          : "None"}
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        IPv6 Addresses
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.resolvedIps.ipv6.length > 0
                          ? result.resolvedIps.ipv6.join(", ")
                          : "None"}
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Nameservers
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.nameservers.length > 0
                          ? result.nameservers.map((ns) => ns.name).join(", ")
                          : "None"}
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        DNSSEC
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.security.dnssec === true ? "Enabled" : result.security.dnssec === false ? "Disabled" : "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Registrar
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.registrar.name ?? "Unknown"}
                      </p>
                      {result.registrar.url && (
                        <a href={result.registrar.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] text-[#58d7f7] hover:text-[#00ff91]">
                          <ExternalLink size={10} /> View registrar
                        </a>
                      )}
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Registration Date
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {formatDateShort(result.timestamps.registrationDate)}
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Expiration Date
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {formatDateShort(result.timestamps.expirationDate)}
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Domain Age
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.timestamps.domainAge ?? "Unknown"}
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Registrant
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.registrant.isPrivate
                          ? "Private / Redacted"
                          : (result.registrant.name ?? result.registrant.organization ?? "Unknown")}
                      </p>
                      {result.registrant.email && !result.registrant.isPrivate && (
                        <p className="mt-1 font-mono text-[9px] text-[#9ba8a1]">{result.registrant.email}</p>
                      )}
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Certificate Count
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.certificates.length} certificate{result.certificates.length !== 1 ? "s" : ""} found
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        Hosting Provider
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.hosting.provider ?? "Unknown"}
                      </p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">
                        ASN / Network
                      </p>
                      <p className="font-mono text-sm text-[#dfe7e3]">
                        {result.hosting.asnName ?? result.hosting.asn ?? "Unknown"}
                      </p>
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "dns" && (
                <section id="dns" className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold">DNS Records Explorer</h2>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-[#77847e]">Record Types:</span>
                      {(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA"] as DomainRecordType[]).map((type) => {
                        const records = result.dnsRecords[type] ?? [];
                        return records.length > 0 ? (
                          <span key={type} className={`px-2 py-0.5 font-mono text-[9px] rounded border ${getRecordTypeColor(type)} border-current/30 bg-current/[0.1]`}>
                            {type} ({records.length})
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {(["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA"] as DomainRecordType[]).map((type) => {
                      const records = result.dnsRecords[type] ?? [];
                      const isExpanded = expandedRecords[type];
                      return (
                        <div key={type} className="border border-white/[0.06] bg-black/10 rounded-md overflow-hidden">
                          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`px-2 py-0.5 font-mono text-[9px] rounded border ${getRecordTypeColor(type)} border-current/30 bg-current/[0.1]`}>
                                {getRecordTypeLabel(type)}
                              </span>
                              <span className="font-mono text-xs text-[#dfe7e3]">{type} Records</span>
                            </div>
                            <span className={`font-mono text-[9px] ${records.length > 0 ? "text-[#00ff91]" : "text-[#77847e]"}`}>
                              {records.length} record{records.length !== 1 ? "s" : ""}
                            </span>
                          </div>
                          <div className={`p-4 ${isExpanded ? "" : "max-h-48 overflow-y-auto"}`}>
                            {records.length === 0 ? (
                              <p className="font-mono text-[9px] text-[#77847e]">No records found</p>
                            ) : (
                              <div className="space-y-2">
                                {records.map((record, idx) => (
                                  <div key={idx} className="p-3 border border-white/[0.05] bg-black/10 rounded-md font-mono text-xs">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-[#9ba8a1]">{record.name ?? result.domain}</span>
                                      {record.ttl && (
                                        <span className="text-[#77847e]">TTL: {record.ttl}s</span>
                                      )}
                                    </div>
                                    <div className="flex items-center justify-between">
                                      <code className="text-[#dfe7e3] truncate flex-1 pr-2">{record.value}</code>
                                      <button
                                        type="button"
                                        onClick={() => copyToClipboard(record.value, setCopiedLabel, type)}
                                        className="text-[#77847e] hover:text-[#58d7f7] p-1"
                                      >
                                        <Copy size={10} />
                                      </button>
                                    </div>
                                    {record.priority && (
                                      <div className="mt-1 font-mono text-[9px] text-[#77847e]">
                                        Priority: {record.priority}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setExpandedRecords((prev) => ({ ...prev, [type]: !isExpanded }))}
                            className="w-full px-4 py-2 border-t border-white/[0.06] font-mono text-[9px] uppercase text-[#77847e] hover:bg-white/[0.02] transition-colors flex items-center justify-center gap-1"
                          >
                            {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                            {isExpanded ? "Collapse" : "Expand"}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {activeSection === "registration" && (
                <section id="registration" className="space-y-6">
                  <h2 className="text-xl font-semibold">Registration Information (RDAP)</h2>
                  
                  {result.rdap ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Registrar</p>
                          <p className="font-mono text-sm text-[#dfe7e3]">{result.registrar.name ?? "Unknown"}</p>
                          {result.registrar.ianaId && <p className="mt-1 font-mono text-[9px] text-[#77847e]">IANA ID: {result.registrar.ianaId}</p>}
                          {result.registrar.url && (
                            <a href={result.registrar.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] text-[#58d7f7] hover:text-[#00ff91]">
                              <ExternalLink size={10} /> {result.registrar.url}
                            </a>
                          )}
                          {result.registrar.abuseEmail && <p className="mt-1 font-mono text-[9px] text-[#ff9a92]">Abuse: {result.registrar.abuseEmail}</p>}
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Registration Date</p>
                          <p className="font-mono text-sm text-[#dfe7e3]">{formatDate(result.timestamps.registrationDate)}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Updated Date</p>
                          <p className="font-mono text-sm text-[#dfe7e3]">{formatDate(result.timestamps.updatedDate)}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Expiration Date</p>
                          <p className="font-mono text-sm text-[#dfe7e3]">{formatDate(result.timestamps.expirationDate)}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Domain Age</p>
                          <p className="font-mono text-sm text-[#dfe7e3]">{result.timestamps.domainAge ?? "Unknown"}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Domain Status</p>
                          <div className="flex flex-wrap gap-1">
                            {result.rdap.status?.map((s) => (
                              <span key={s} className="px-2 py-0.5 font-mono text-[8px] border border-white/[0.10] bg-white/[0.05] rounded text-[#9ba8a1]">{s}</span>
                            )) || <span className="font-mono text-[9px] text-[#77847e]">No status codes</span>}
                          </div>
                        </div>
                      </div>

                      <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                        <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">Registrant Details</p>
                        {result.registrant.isPrivate ? (
                          <p className="font-mono text-sm text-[#ff9a92]">Private / Redacted (WHOIS privacy protection enabled)</p>
                        ) : (
                          <div className="grid gap-2 md:grid-cols-2">
                            {result.registrant.name && <div><span className="font-mono text-[9px] text-[#77847e]">Name:</span> <span className="font-mono text-sm text-[#dfe7e3] ml-2">{result.registrant.name}</span></div>}
                            {result.registrant.organization && <div><span className="font-mono text-[9px] text-[#77847e]">Organization:</span> <span className="font-mono text-sm text-[#dfe7e3] ml-2">{result.registrant.organization}</span></div>}
                            {result.registrant.email && <div><span className="font-mono text-[9px] text-[#77847e]">Email:</span> <span className="font-mono text-sm text-[#dfe7e3] ml-2">{result.registrant.email}</span></div>}
                            {result.registrant.country && <div><span className="font-mono text-[9px] text-[#77847e]">Country:</span> <span className="font-mono text-sm text-[#dfe7e3] ml-2">{result.registrant.country}</span></div>}
                            {result.registrant.state && <div><span className="font-mono text-[9px] text-[#77847e]">State:</span> <span className="font-mono text-sm text-[#dfe7e3] ml-2">{result.registrant.state}</span></div>}
                            {result.registrant.city && <div><span className="font-mono text-[9px] text-[#77847e]">City:</span> <span className="font-mono text-sm text-[#dfe7e3] ml-2">{result.registrant.city}</span></div>}
                          </div>
                        )}
                      </div>

                      <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                        <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">Nameservers</p>
                        <div className="space-y-2">
                          {result.nameservers.length > 0 ? (
                            result.nameservers.map((ns, idx) => (
                              <div key={idx} className="p-3 border border-white/[0.05] bg-black/10 rounded-md font-mono text-xs">
                                <div className="flex items-center justify-between">
                                  <span className="text-[#dfe7e3]">{ns.name}</span>
                                  <button type="button" onClick={() => copyToClipboard(ns.name, setCopiedLabel, "Nameserver")} className="text-[#77847e] hover:text-[#58d7f7] p-1"><Copy size={10} /></button>
                                </div>
                                {(ns.ips.v4?.length || ns.ips.v6?.length) && (
                                  <div className="mt-1 font-mono text-[9px] text-[#9ba8a1]">
                                    IPs: {[
                                      ...(ns.ips.v4 ?? []),
                                      ...(ns.ips.v6 ?? []),
                                    ].join(", ")}
                                  </div>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="font-mono text-[9px] text-[#77847e]">No nameserver data available</p>
                          )}
                        </div>
                      </div>

                      <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                        <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">DNSSEC Status</p>
                        <p className="font-mono text-sm text-[#dfe7e3]">
                          {result.security.dnssec === true ? "Enabled (Delegation Signed)" : result.security.dnssec === false ? "Not Enabled" : "Unknown"}
                        </p>
                      </div>

                      <details className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                        <summary className="font-mono text-xs text-[#58d7f7] cursor-pointer">Raw RDAP Response</summary>
                        <pre className="mt-3 p-3 bg-black/20 border border-white/[0.05] rounded overflow-x-auto font-mono text-[9px] text-[#9ba8a1] max-h-64 overflow-y-auto">
                          {JSON.stringify(result.rdap, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="premium-card glass-panel p-8 text-center">
                      <FileText className="mx-auto mb-3 text-[#77847e]" size={24} />
                      <h3 className="mb-2 text-lg font-semibold">No RDAP Data Available</h3>
                      <p className="text-sm text-[#9ba8a1]">The RDAP lookup did not return registration information for this domain.</p>
                    </div>
                  )}
                </section>
              )}

              {activeSection === "certificates" && (
                <section id="certificates" className="space-y-6">
                  <h2 className="text-xl font-semibold">Certificate Intelligence (Certificate Transparency)</h2>
                  
                  {result.certificates.length > 0 ? (
                    <>
                      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Total Certificates</p>
                          <p className="font-mono text-2xl font-semibold text-[#dfe7e3]">{result.certificates.length}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Unique Issuers</p>
                          <p className="font-mono text-2xl font-semibold text-[#dfe7e3]">{new Set(result.certificates.map((c) => c.issuerName)).size}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">SAN Domains</p>
                          <p className="font-mono text-2xl font-semibold text-[#dfe7e3]">{new Set(result.certificates.flatMap((c) => c.nameValue.split("\n").map((n) => n.trim().replace(/^\*\./, "")))).size}</p>
                        </div>
                        <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Earliest Issue</p>
                          <p className="font-mono text-sm text-[#dfe7e3]">{result.certificates.reduce((a, b) => new Date(a.notBefore) < new Date(b.notBefore) ? a : b).notBefore ? formatDateShort(result.certificates.reduce((a, b) => new Date(a.notBefore) < new Date(b.notBefore) ? a : b).notBefore) : "Unknown"}</p>
                        </div>
                      </div>

                      <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md max-h-96 overflow-y-auto">
                        <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">Certificate Details</p>
                        <div className="space-y-3">
                          {result.certificates.slice(0, 20).map((cert, idx) => (
                            <details key={idx} className="border border-white/[0.05] bg-black/10 rounded-md p-3">
                              <summary className="flex items-center justify-between cursor-pointer font-mono text-xs">
                                <span className="text-[#dfe7e3]">{cert.commonName}</span>
                                <span className="text-[#9ba8a1]">{cert.issuerName}</span>
                              </summary>
                              <div className="mt-3 grid gap-2 md:grid-cols-3 font-mono text-[9px]">
                                <div><span className="text-[#77847e]">Issuer:</span> <span className="text-[#dfe7e3] ml-2">{cert.issuerName}</span></div>
                                <div><span className="text-[#77847e]">Valid From:</span> <span className="text-[#dfe7e3] ml-2">{formatDateShort(cert.notBefore)}</span></div>
                                <div><span className="text-[#77847e]">Valid Until:</span> <span className="text-[#dfe7e3] ml-2">{formatDateShort(cert.notAfter)}</span></div>
                                <div className="md:col-span-3"><span className="text-[#77847e]">SANs:</span> <span className="text-[#dfe7e3] ml-2">{cert.nameValue.split("\n").map((n) => n.trim()).filter(Boolean).join(", ")}</span></div>
                                <div className="md:col-span-3"><span className="text-[#77847e]">Serial:</span> <span className="text-[#dfe7e3] ml-2">{cert.serialNumber}</span></div>
                                {cert.sha256 && <div className="md:col-span-3"><span className="text-[#77847e]">SHA256:</span> <span className="text-[#dfe7e3] ml-2">{cert.sha256}</span></div>}
                              </div>
                            </details>
                          ))}
                          {result.certificates.length > 20 && (
                            <p className="mt-3 font-mono text-[9px] text-[#77847e]">... and {result.certificates.length - 20} more certificates</p>
                          )}
                        </div>
                      </div>

                      <details className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                        <summary className="font-mono text-xs text-[#58d7f7] cursor-pointer">All Certificates (Raw)</summary>
                        <pre className="mt-3 p-3 bg-black/20 border border-white/[0.05] rounded overflow-x-auto font-mono text-[9px] text-[#9ba8a1] max-h-64 overflow-y-auto">
                          {JSON.stringify(result.certificates, null, 2)}
                        </pre>
                      </details>
                    </>
                  ) : (
                    <div className="premium-card glass-panel p-8 text-center">
                      <Lock className="mx-auto mb-3 text-[#77847e]" size={24} />
                      <h3 className="mb-2 text-lg font-semibold">No Certificates Found</h3>
                      <p className="text-sm text-[#9ba8a1]">Certificate Transparency logs did not return certificates for this domain.</p>
                    </div>
                  )}
                </section>
              )}

              {activeSection === "reputation" && (
                <section id="reputation" className="space-y-6">
                  <h2 className="text-xl font-semibold">Domain Reputation & Threat Intelligence</h2>
                  
                  {result.reputation.length > 0 ? (
                    <div className="space-y-4">
                      {result.reputation.map((rep) => (
                        <div key={rep.source} className="border border-white/[0.06] bg-black/10 rounded-md overflow-hidden">
                          <div className="p-4 border-b border-white/[0.06] flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="size-10 flex items-center justify-center rounded-md border" style={{ borderColor: `${getSourceColor(rep.source)}40`, backgroundColor: `${getSourceColor(rep.source)}10`, color: getSourceColor(rep.source) }}>
                                {getSourceLabel(rep.source).charAt(0).toUpperCase()}
                              </span>
                              <div>
                                <p className="font-mono text-sm font-semibold text-[#dfe7e3]">{getSourceLabel(rep.source)}</p>
                                <p className="font-mono text-[9px] text-[#77847e]">{rep.details?.type as string ?? "Threat Intelligence"}</p>
                              </div>
                            </div>
                            <span className={`font-mono text-[9px] px-2 py-0.5 rounded-md ${getReputationColor(rep.status)} border border-current/30 bg-current/[0.1]`}>
                              {getReputationLabel(rep.status)}
                            </span>
                          </div>
                          {rep.categories && rep.categories.length > 0 && (
                            <div className="px-4 py-2 border-b border-white/[0.06]">
                              <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-1">Categories</p>
                              <div className="flex flex-wrap gap-1">
                                {rep.categories.map((cat) => (
                                  <span key={cat} className="px-2 py-0.5 font-mono text-[8px] border border-white/[0.10] bg-white/[0.05] rounded text-[#9ba8a1]">{cat}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {rep.referenceUrl && (
                            <div className="p-4">
                              <a href={rep.referenceUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-mono text-[9px] text-[#58d7f7] hover:text-[#00ff91]">
                                <ExternalLink size={10} /> View full report on {getSourceLabel(rep.source)}
                              </a>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="premium-card glass-panel p-8 text-center">
                      <ShieldAlert className="mx-auto mb-3 text-[#00ff91]" size={24} />
                      <h3 className="mb-2 text-lg font-semibold">No Detections Reported</h3>
                      <p className="text-sm text-[#9ba8a1] mb-4">No malicious or suspicious activity reported by configured threat intelligence sources.</p>
                      <p className="font-mono text-[9px] text-[#77847e]">Note: Absence of detections does not guarantee safety. Always perform additional verification.</p>
                    </div>
                  )}

                  <details className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                    <summary className="font-mono text-xs text-[#58d7f7] cursor-pointer">Configured Sources Status</summary>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {status?.sources.filter((s) => ["virustotal", "urlhaus", "otx"].includes(s.source)).map((source) => (
                        <div key={source.source} className={`p-3 border rounded ${source.available ? "border-[#00ff91]/25 bg-[#00ff91]/[0.03]" : "border-white/[0.08] bg-black/10"}`}>
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-[9px] font-semibold text-[#dfe7e3]">{getSourceLabel(source.source)}</span>
                            <span className={`font-mono text-[8px] ${source.available ? "text-[#00ff91]" : "text-[#77847e]"}`}>
                              {source.available ? "Available" : source.requiresConfiguration ? "Needs API Key" : "Unavailable"}
                            </span>
                          </div>
                          {source.configNote && <p className="mt-1 font-mono text-[8px] text-[#ffca8a]">{source.configNote}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                </section>
              )}

              {activeSection === "hosting" && (
                <section id="hosting" className="space-y-6">
                  <h2 className="text-xl font-semibold">Infrastructure & Hosting Intelligence</h2>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Hosting Provider</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.provider ?? "Unknown"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">ASN</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.asn ?? "Unknown"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">ASN Name</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.asnName ?? "Unknown"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Country</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.country ?? "Unknown"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Region / City</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{[result.hosting.region, result.hosting.city].filter(Boolean).join(", ") || "Unknown"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">CDN Detected</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.cdnProvider ?? "None detected"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Cloud Provider</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.cloudProvider ?? "None detected"}</p>
                    </div>
                    <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">Reverse DNS</p>
                      <p className="font-mono text-sm text-[#dfe7e3]">{result.hosting.reverseDns ?? "Unknown"}</p>
                    </div>
                  </div>

                  <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                    <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">Resolved IP Addresses</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {result.resolvedIps.ipv4.length > 0 && (
                        <div className="p-3 border border-white/[0.05] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#58d7f7] mb-1">IPv4</p>
                          <div className="space-y-1">
                            {result.resolvedIps.ipv4.map((ip) => (
                              <div key={ip} className="flex items-center justify-between font-mono text-xs">
                                <code className="text-[#dfe7e3]">{ip}</code>
                                <div className="flex items-center gap-1">
                                  <button type="button" onClick={() => copyToClipboard(ip, setCopiedLabel, "IP")} className="text-[#77847e] hover:text-[#58d7f7] p-1"><Copy size={10} /></button>
                                  <a href={`/ip-reputation?ip=${ip}`} className="text-[#58d7f7] hover:text-[#00ff91] font-mono text-[9px]"><ExternalLink size={10} /> IP Reputation</a>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {result.resolvedIps.ipv6.length > 0 && (
                        <div className="p-3 border border-white/[0.05] bg-black/10 rounded-md">
                          <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#00ff91] mb-1">IPv6</p>
                          <div className="space-y-1">
                            {result.resolvedIps.ipv6.map((ip) => (
                              <div key={ip} className="flex items-center justify-between font-mono text-xs">
                                <code className="text-[#dfe7e3]">{ip}</code>
                                <button type="button" onClick={() => copyToClipboard(ip, setCopiedLabel, "IP")} className="text-[#77847e] hover:text-[#58d7f7] p-1"><Copy size={10} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {activeSection === "security" && (
                <section id="security" className="space-y-6">
                  <h2 className="text-xl font-semibold">Security Posture</h2>
                  
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <div className={`p-4 border rounded-md ${result.security.dnssec === true ? "border-[#00ff91]/30 bg-[#00ff91]/[0.03]" : "border-white/[0.06] bg-black/10"}`}>
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">DNSSEC</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[9px] font-semibold uppercase border ${result.security.dnssec === true ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]" : result.security.dnssec === false ? "border-[#ff9a92]/30 bg-[#ff9a92]/[0.1] text-[#ff9a92]" : "border-white/[0.10] bg-white/[0.05] text-[#77847e]"}`}>
                        {result.security.dnssec === true ? "Enabled" : result.security.dnssec === false ? "Disabled" : "Unknown"}
                      </span>
                    </div>
                    <div className={`p-4 border rounded-md ${result.security.https ? "border-[#00ff91]/30 bg-[#00ff91]/[0.03]" : "border-white/[0.06] bg-black/10"}`}>
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">HTTPS</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[9px] font-semibold uppercase border ${result.security.https ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]" : "border-[#ff9a92]/30 bg-[#ff9a92]/[0.1] text-[#ff9a92]"}`}>
                        {result.security.https ? "Enabled" : "Not Enabled"}
                      </span>
                    </div>
                    <div className={`p-4 border rounded-md ${result.security.hsts ? "border-[#00ff91]/30 bg-[#00ff91]/[0.03]" : "border-white/[0.06] bg-black/10"}`}>
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">HSTS</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[9px] font-semibold uppercase border ${result.security.hsts ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]" : "border-white/[0.10] bg-white/[0.05] text-[#77847e]"}`}>
                        {result.security.hsts ? "Enabled" : "Unknown"}
                      </span>
                    </div>
                    <div className={`p-4 border rounded-md ${result.security.csp ? "border-[#00ff91]/30 bg-[#00ff91]/[0.03]" : "border-white/[0.06] bg-black/10"}`}>
                      <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-2">CSP</p>
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md font-mono text-[9px] font-semibold uppercase border ${result.security.csp ? "border-[#00ff91]/30 bg-[#00ff91]/[0.1] text-[#00ff91]" : "border-white/[0.10] bg-white/[0.05] text-[#77847e]"}`}>
                        {result.security.csp ? "Enabled" : "Unknown"}
                      </span>
                    </div>
                  </div>

                  <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                    <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#77847e] mb-3">Security Headers</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      {Object.entries(result.security.securityHeaders).map(([header, value]) => (
                        <div key={header} className="p-3 border border-white/[0.05] bg-black/10 rounded-md font-mono text-xs">
                          <code className="text-[#58d7f7]">{header}</code>
                          <span className="text-[#9ba8a1] ml-2">{value ?? "Not set"}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-4 border border-white/[0.06] bg-black/10 rounded-md">
                    <p className="font-mono text-[9px] uppercase tracking-[.15em] text-[#ffca8a] mb-3">Privacy Notice</p>
                    <p className="font-mono text-[9px] text-[#9ba8a1]">
                      This investigation queries public DNS, RDAP, Certificate Transparency, and threat intelligence APIs.
                      Your lookup may be logged by third-party providers. Do not investigate sensitive internal domains.
                      For private network analysis, use local tools or authorized internal threat intelligence platforms.
                    </p>
                  </div>
                </section>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function DomainIntelligencePageWrapper() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#58d7f7]" /></div>}>
      <DomainIntelligencePage />
    </Suspense>
  );
}

export default DomainIntelligencePageWrapper;