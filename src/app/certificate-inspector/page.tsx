"use client";

import { useState, useCallback, useEffect, useRef, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  inspectCertificate,
  checkCertificateInspectorStatus,
  getProxyUrl,
  type CertificateInfo,
  type CertificateStatus,
  type CertificateInspectorHistoryEntry,
} from "@/lib/cyber-intel/api/certificate-inspector";
import { getCertificateStatusColor, getCertificateStatusLabel } from "@/lib/cyber-intel/types/ioc-investigator";

const STATUS_ICONS: Record<CertificateStatus, string> = {
  valid: "🟢",
  expired: "🔴",
  "expiring-soon": "🟠",
  revoked: "🔴",
  unknown: "⚪",
};

function CertInputSection({
  hostname,
  fingerprint,
  setHostname,
  setFingerprint,
  onAnalyze,
  isAnalyzing,
  history,
  onHistorySelect,
}: {
  hostname: string;
  fingerprint: string;
  setHostname: (h: string) => void;
  setFingerprint: (f: string) => void;
  onAnalyze: () => void;
  isAnalyzing: boolean;
  history: Array<{ hostname: string; timestamp: string; status: CertificateStatus }>;
  onHistorySelect: (hostname: string) => void;
}) {
  const [activeTab, setActiveTab] = useState<"hostname" | "fingerprint">("hostname");

  return (
    <section className="bg-card border border-border rounded-xl p-6 mb-6">
      <div className="flex gap-2 mb-4 border-b border-border">
        <button
          onClick={() => setActiveTab("hostname")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "hostname"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          Hostname / Domain
        </button>
        <button
          onClick={() => setActiveTab("fingerprint")}
          className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
            activeTab === "fingerprint"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          SHA-256 Fingerprint
        </button>
      </div>

      {activeTab === "hostname" && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <label htmlFor="hostname-input" className="sr-only">
              Hostname or domain to inspect
            </label>
            <input
              id="hostname-input"
              type="text"
              value={hostname}
              onChange={(e) => setHostname(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
              placeholder="Enter hostname or domain (e.g., example.com or https://example.com)"
              className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing || !hostname.trim()}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isAnalyzing ? "Inspecting..." : "Inspect Certificate"}
            </button>
          </div>
        </div>
      )}

      {activeTab === "fingerprint" && (
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-2">
            <label htmlFor="fingerprint-input" className="sr-only">
              Certificate SHA-256 fingerprint
            </label>
            <input
              id="fingerprint-input"
              type="text"
              value={fingerprint}
              onChange={(e) => setFingerprint(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onAnalyze()}
              placeholder="Enter SHA-256 fingerprint (64 hex characters)"
              className="flex-1 px-4 py-3 bg-input border border-border rounded-lg text-foreground placeholder:text-muted-foreground font-mono text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isAnalyzing}
              autoComplete="off"
              spellCheck={false}
            />
            <button
              onClick={onAnalyze}
              disabled={isAnalyzing || !fingerprint.trim() || fingerprint.trim().length !== 64}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {isAnalyzing ? "Inspecting..." : "Inspect Certificate"}
            </button>
          </div>
        </div>
      )}

      {(activeTab === "hostname" && hostname) && (
        <div className="mt-3 text-sm text-muted-foreground">
          {hostname.includes("://") && (
            <span className="px-2 py-1 bg-yellow-500/10 text-yellow-400 rounded text-xs">
              URL detected — extracting hostname: {new URL(hostname).hostname}
            </span>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div className="mt-4 pt-4 border-t border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">Recent Inspections</span>
            <button
              onClick={() => localStorage.removeItem("cert-inspector-history")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Clear
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {history.slice(0, 8).map((item, i) => (
              <button
                key={i}
                onClick={() => onHistorySelect(item.hostname)}
                className="px-3 py-1 bg-muted text-xs rounded-md hover:bg-muted/80 transition-colors truncate max-w-[200px] text-left flex items-center gap-1"
                title={item.hostname}
              >
                {item.hostname.length > 40 ? item.hostname.substring(0, 37) + "..." : item.hostname}
                <span className={`px-1.5 py-0.5 text-[10px] rounded ${
                  item.status === "valid" ? "bg-green-500/20 text-green-400" :
                  item.status === "expired" ? "bg-red-500/20 text-red-400" :
                  item.status === "expiring-soon" ? "bg-yellow-500/20 text-yellow-400" :
                  "bg-gray-500/20 text-gray-400"
                }`}>
                  {STATUS_ICONS[item.status]}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function CertificateCard({ cert, index }: { cert: CertificateInfo; index: number }) {
  const statusColor = getCertificateStatusColor(cert.status);
  const statusLabel = getCertificateStatusLabel(cert.status);
  const statusIcon = STATUS_ICONS[cert.status];
  const isExpired = cert.status === "expired";
  const isExpiringSoon = cert.status === "expiring-soon";

  return (
    <div className="bg-card border border-border rounded-xl p-6 mb-6" style={{ borderLeftColor: statusColor }}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <span className="text-3xl">{statusIcon}</span>
          <div>
            <h3 className="text-xl font-semibold">Certificate #{index + 1}</h3>
            <div className="flex items-center gap-2 mt-1">
              <span
                className="px-3 py-1 text-sm rounded-full font-medium"
                style={{ backgroundColor: `${statusColor}20`, color: statusColor }}
              >
                {statusLabel}
              </span>
              {isExpired && (
                <span className="px-2 py-1 text-xs rounded bg-red-500/10 text-red-400 border border-red-500/20">
                  Expired
                </span>
              )}
              {isExpiringSoon && (
                <span className="px-2 py-1 text-xs rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                  Expiring Soon ({cert.daysUntilExpiry} days)
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigator.clipboard.writeText(cert.sha256Fingerprint)}
            className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors"
          >
            📋 Copy SHA-256
          </button>
          {cert.referenceUrl && (
            <a
              href={cert.referenceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1 text-sm border border-border rounded hover:bg-muted transition-colors"
            >
              🔗 View on crt.sh
            </a>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Subject & Issuer</h4>
          <div className="space-y-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Common Name</div>
              <div className="font-mono text-sm break-all">{cert.commonName || "—"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Subject</div>
              <div className="font-mono text-sm break-all">{cert.subject}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Issuer</div>
              <div className="font-mono text-sm break-all">{cert.issuer}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Serial Number</div>
              <div className="font-mono text-sm break-all">{cert.serialNumber}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Validity</h4>
          <div className="space-y-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Valid From</div>
              <div className="font-mono text-sm">{cert.validFrom ? new Date(cert.validFrom).toLocaleString() : "—"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Valid Until</div>
              <div className="font-mono text-sm">{cert.validUntil ? new Date(cert.validUntil).toLocaleString() : "—"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Days Remaining</div>
              <div className="font-mono text-sm">{cert.daysUntilExpiry !== null ? cert.daysUntilExpiry : "—"}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Fingerprints</h4>
          <div className="space-y-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">SHA-256</div>
              <div className="font-mono text-xs break-all">{cert.sha256Fingerprint || "—"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">SHA-1</div>
              <div className="font-mono text-xs break-all">{cert.sha1Fingerprint || "—"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">MD5</div>
              <div className="font-mono text-xs break-all">{cert.md5Fingerprint || "—"}</div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">Technical Details</h4>
          <div className="space-y-2">
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Key Algorithm</div>
              <div className="font-mono text-sm">{cert.keyAlgorithm || "Not available from CT logs"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Key Size</div>
              <div className="font-mono text-sm">{cert.keySize ? `${cert.keySize} bits` : "Not available from CT logs"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Signature Algorithm</div>
              <div className="font-mono text-sm">{cert.signatureAlgorithm || "Not available from CT logs"}</div>
            </div>
            <div className="p-3 bg-muted/30 rounded-lg">
              <div className="text-xs text-muted-foreground">Version</div>
              <div className="font-mono text-sm">{cert.version ? `v${cert.version}` : "Not available from CT logs"}</div>
            </div>
          </div>
        </div>
      </div>

      {cert.subjectAlternativeNames.length > 0 && (
        <details className="mb-6 group">
          <summary className="cursor-pointer font-medium text-foreground flex items-center gap-2">
            <span>📋</span>
            Subject Alternative Names ({cert.subjectAlternativeNames.length})
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {cert.subjectAlternativeNames.map((san: string, i: number) => (
              <span key={i} className="px-3 py-1 text-sm rounded bg-muted/50 border border-border font-mono">
                {san}
              </span>
            ))}
          </div>
        </details>
      )}

      {cert.ctEntries.length > 0 && (
        <details className="mb-6 group">
          <summary className="cursor-pointer font-medium text-foreground flex items-center gap-2">
            <span>📜</span>
            Certificate Transparency Entries ({cert.ctEntries.length})
          </summary>
          <div className="mt-4 space-y-2">
            {cert.ctEntries.map((entry: { logId: string; logName: string; timestamp: string; entryUrl: string | null }, i: number) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 text-xs rounded bg-primary/10 text-primary font-mono">
                      CT Log {entry.logId}
                    </span>
                    <div>
                      <div className="font-mono text-sm">{entry.logName}</div>
                      <div className="text-xs text-muted-foreground">{new Date(entry.timestamp).toLocaleString()}</div>
                    </div>
                  </div>
                  {entry.entryUrl && (
                    <a href={entry.entryUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-sm hover:underline">
                      View Entry →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {cert.chain.length > 0 && (
        <details className="mb-6 group">
          <summary className="cursor-pointer font-medium text-foreground flex items-center gap-2">
            <span>🔗</span>
            Certificate Chain ({cert.chain.length})
          </summary>
          <div className="mt-4 space-y-2">
            {cert.chain.map((chainCert: { subject: string; issuer: string; serialNumber: string; sha256Fingerprint: string; validFrom: string; validUntil: string }, i: number) => (
              <div key={i} className="p-3 bg-muted/30 rounded-lg border-l-4 border-primary/30">
                <div className="font-mono text-sm mb-1">{chainCert.subject}</div>
                <div className="text-xs text-muted-foreground mb-1">Issuer: {chainCert.issuer}</div>
                <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
                  <span>Serial: <span className="font-mono">{chainCert.serialNumber}</span></span>
                  <span>SHA-256: <span className="font-mono">{chainCert.sha256Fingerprint.substring(0, 32)}...</span></span>
                  <span>Valid: {new Date(chainCert.validFrom).toLocaleDateString()} → {new Date(chainCert.validUntil).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}

      {cert.relatedDomains.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer font-medium text-foreground flex items-center gap-2">
            <span>🌐</span>
            Related Domains ({cert.relatedDomains.length})
          </summary>
          <div className="mt-4 flex flex-wrap gap-2">
            {cert.relatedDomains.slice(0, 50).map((domain: string, i: number) => (
              <Link
                key={i}
                href={`/domain-intelligence?domain=${encodeURIComponent(domain)}`}
                className="px-3 py-1 text-sm rounded bg-muted/50 border border-border hover:bg-muted/80 transition-colors font-mono"
              >
                {domain}
              </Link>
            ))}
            {cert.relatedDomains.length > 50 && (
              <span className="px-3 py-1 text-sm text-muted-foreground">
                +{cert.relatedDomains.length - 50} more
              </span>
            )}
          </div>
        </details>
      )}

      <details className="mt-6">
        <summary className="cursor-pointer text-sm text-muted-foreground">Show raw certificate data</summary>
        <pre className="mt-2 p-3 bg-muted/50 rounded text-xs overflow-x-auto font-mono text-muted-foreground">
          {JSON.stringify(cert.rawData, null, 2)}
        </pre>
      </details>
    </div>
  );
}

function CertificateInspectorContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [hostname, setHostname] = useState("");
  const [fingerprint, setFingerprint] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [certificates, setCertificates] = useState<CertificateInfo[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<{ sources: any[]; overallAvailable: boolean } | null>(null);
  const [history, setHistory] = useState<Array<{ hostname: string; timestamp: string; status: CertificateStatus }>>([]);

  const handleAnalyze = useCallback(async () => {
    const input = hostname || fingerprint;
    if (!input.trim()) {
      setError("Please enter a hostname or certificate fingerprint");
      return;
    }

    if (fingerprint && fingerprint.length !== 64) {
      setError("SHA-256 fingerprint must be 64 hex characters");
      return;
    }

    setError(null);
    setIsAnalyzing(true);
    setCertificates(null);

    try {
      const results = await inspectCertificate({
        hostname: hostname || undefined,
        fingerprint: fingerprint || undefined,
      });

      if (!results || results.length === 0) {
        throw new Error("No certificates found for the given input");
      }

      setCertificates(results);

      const overallStatus = results.reduce((worst, cert) => {
        const order: CertificateStatus[] = ["revoked", "expired", "expiring-soon", "valid", "unknown"];
        return order.indexOf(cert.status) < order.indexOf(worst) ? cert.status : worst;
      }, "valid" as CertificateStatus);

      const newHistoryEntry = {
        hostname: hostname || fingerprint,
        timestamp: new Date().toISOString(),
        status: overallStatus,
      };
      const newHistory = [newHistoryEntry, ...history.filter(h => h.hostname !== (hostname || fingerprint))].slice(0, 20);
      setHistory(newHistory);
      localStorage.setItem("cert-inspector-history", JSON.stringify(newHistory));

      const queryParam = hostname ? `hostname=${encodeURIComponent(hostname)}` : `fingerprint=${encodeURIComponent(fingerprint)}`;
      router.push(`/certificate-inspector?${queryParam}`, { scroll: false });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Certificate inspection failed");
    } finally {
      setIsAnalyzing(false);
    }
  }, [hostname, fingerprint, history, router]);

  useEffect(() => {
    const saved = localStorage.getItem("cert-inspector-history");
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {}
    }
  }, []);

  useEffect(() => {
    const paramHostname = searchParams.get("hostname");
    const paramFingerprint = searchParams.get("fingerprint");
    if (paramHostname) {
      setHostname(paramHostname);
      setFingerprint("");
      handleAnalyze();
    } else if (paramFingerprint) {
      setFingerprint(paramFingerprint);
      setHostname("");
      handleAnalyze();
    }
  }, [searchParams, handleAnalyze]);

  const checkStatus = useCallback(async () => {
    try {
      const statusData = await checkCertificateInspectorStatus();
      setStatus(statusData);
    } catch (err) {
      console.error("Failed to check status:", err);
    }
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  const handleHistorySelect = (selectedHostname: string) => {
    setHostname(selectedHostname);
    setFingerprint("");
    handleAnalyze();
  };

  const isProxyConfigured = !!getProxyUrl();

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold">Certificate Inspector & Certificate Intelligence</h1>
          <p className="text-muted-foreground mt-1">
            TLS certificate investigation via Certificate Transparency logs, with validity, chain, SAN, and history analysis
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

      <CertInputSection
        hostname={hostname}
        fingerprint={fingerprint}
        setHostname={setHostname}
        setFingerprint={setFingerprint}
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

      {certificates && certificates.length > 0 && (
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Investigation Summary</h2>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Certificates Found</div>
                <div className="text-3xl font-bold">{certificates.length}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Valid</div>
                <div className="text-3xl font-bold text-green-400">{certificates.filter(c => c.status === "valid").length}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Expired</div>
                <div className="text-3xl font-bold text-red-400">{certificates.filter(c => c.status === "expired").length}</div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <div className="text-xs text-muted-foreground">Expiring Soon</div>
                <div className="text-3xl font-bold text-yellow-400">{certificates.filter(c => c.status === "expiring-soon").length}</div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {certificates.map((cert, index) => (
              <CertificateCard key={index} cert={cert} index={index} />
            ))}
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
      )}
    </div>
  );
}

export default function CertificateInspectorPage() {
  return (
    <Suspense fallback={<div className="max-w-6xl mx-auto px-4 py-8">Loading...</div>}>
      <CertificateInspectorContent />
    </Suspense>
  );
}