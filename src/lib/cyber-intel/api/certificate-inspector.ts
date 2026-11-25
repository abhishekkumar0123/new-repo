import {
  CertificateInfo,
  CertificateInspectorParams,
  CertificateInspectorHistoryEntry,
  CertificateSource,
  CertificateStatus,
  IOCInvestigatorSourceStatus,
  IOCInvestigatorStatus,
} from "../types/ioc-investigator";
import { fetchCtCertificates, fetchCtCertificatesByFingerprint, checkCtAvailability, processCertificatesForIntel, extractSanDomains, clearCtCache, getCachedCtCertificates } from "./certificate-transparency";
import { calculateCertificateStatus, getCertificateStatusColor, getCertificateStatusLabel } from "../types/ioc-investigator";

const CERT_INSPECTOR_PROXY_URL = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_CERT_INSPECTOR_PROXY_URL as string | undefined)
  : undefined;

const CERT_CACHE_TTL_MS = 60 * 60 * 1000;
let certCache: Map<string, { data: CertificateInfo[]; fetchedAt: number }> = new Map();
let lastRequestTime = 0;
const REQUEST_DELAY_MS = 1000;

function getProxyUrl(): string | undefined {
  return CERT_INSPECTOR_PROXY_URL;
}

async function throttleRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, REQUEST_DELAY_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

function parseCertificateFromCT(cert: {
  issuerCaId: number;
  issuerName: string;
  commonName: string;
  nameValue: string;
  id: number;
  entryTimestamp: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  sha256?: string;
  sha1?: string;
}, index: number): CertificateInfo {
  const sanDomains = cert.nameValue
    .split("\n")
    .map(n => n.trim().replace(/^\*\./, ""))
    .filter(n => n && !n.includes(" "));

  const status = calculateCertificateStatus(cert.notAfter);

  return {
    subject: cert.commonName,
    issuer: cert.issuerName,
    serialNumber: cert.serialNumber,
    sha256Fingerprint: cert.sha256 ?? "",
    sha1Fingerprint: cert.sha1 ?? null,
    md5Fingerprint: null,
    validFrom: cert.notBefore,
    validUntil: cert.notAfter,
    status,
    daysUntilExpiry: status === "expired" ? 0 : status === "expiring-soon" 
      ? Math.floor((new Date(cert.notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : Math.floor((new Date(cert.notAfter).getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    subjectAlternativeNames: sanDomains,
    commonName: cert.commonName,
    keyAlgorithm: null,
    keySize: null,
    signatureAlgorithm: null,
    version: null,
    extensions: [],
    ctEntries: [{
      logId: String(cert.issuerCaId),
      logName: `CT Log ${cert.issuerCaId}`,
      timestamp: cert.entryTimestamp,
      entryUrl: `https://crt.sh/?id=${cert.id}`,
    }],
    chain: [],
    relatedDomains: sanDomains,
    source: "crtsh",
    referenceUrl: `https://crt.sh/?id=${cert.id}`,
    rawData: cert as unknown as Record<string, unknown>,
    fetchedAt: new Date().toISOString(),
  };
}

function buildCertificateChain(certificates: Array<{
  issuerCaId: number;
  issuerName: string;
  commonName: string;
  nameValue: string;
  id: number;
  entryTimestamp: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  sha256?: string;
  sha1?: string;
}>): CertificateInfo["chain"] {
  const uniqueIssuers = new Map<string, { subject: string; issuer: string; serialNumber: string; sha256Fingerprint: string; validFrom: string; validUntil: string }>();
  
  for (const cert of certificates) {
    const key = cert.issuerName;
    if (!uniqueIssuers.has(key)) {
      uniqueIssuers.set(key, {
        subject: cert.commonName,
        issuer: cert.issuerName,
        serialNumber: cert.serialNumber,
        sha256Fingerprint: cert.sha256 ?? "",
        validFrom: cert.notBefore,
        validUntil: cert.notAfter,
      });
    }
  }

  return Array.from(uniqueIssuers.values()).slice(0, 5);
}

function getRelatedDomains(certificates: Array<{
  issuerCaId: number;
  issuerName: string;
  commonName: string;
  nameValue: string;
  id: number;
  entryTimestamp: string;
  notBefore: string;
  notAfter: string;
  serialNumber: string;
  sha256?: string;
  sha1?: string;
}>): string[] {
  const domains = new Set<string>();
  
  for (const cert of certificates) {
    const names = cert.nameValue.split("\n");
    for (const name of names) {
      const clean = name.trim().replace(/^\*\./, "");
      if (clean && !clean.includes(" ")) {
        domains.add(clean.toLowerCase());
      }
    }
  }
  
  return Array.from(domains).sort();
}

export async function inspectCertificate(params: CertificateInspectorParams): Promise<CertificateInfo[]> {
  const { hostname, fingerprint, forceRefresh = false } = params;
  const cacheKey = fingerprint ? `cert-fp-${fingerprint}` : `cert-host-${hostname}`;
  const now = Date.now();

  if (!forceRefresh) {
    const cached = certCache.get(cacheKey);
    if (cached && now - cached.fetchedAt < CERT_CACHE_TTL_MS) {
      return cached.data;
    }
  }

  let certificates: Array<{
    issuerCaId: number;
    issuerName: string;
    commonName: string;
    nameValue: string;
    id: number;
    entryTimestamp: string;
    notBefore: string;
    notAfter: string;
    serialNumber: string;
    sha256?: string;
    sha1?: string;
  }> = [];

  if (fingerprint) {
    certificates = await fetchCtCertificatesByFingerprint(fingerprint);
  } else if (hostname) {
    const { domain, error } = extractHostname(hostname);
    if (error || !domain) {
      throw new Error(error || "Invalid hostname");
    }
    certificates = await fetchCtCertificates(domain, true);
  } else {
    throw new Error("Either hostname or fingerprint is required");
  }

  const results = certificates.map((cert, index) => parseCertificateFromCT(cert, index));
  
  const chain = buildCertificateChain(certificates);
  const relatedDomains = getRelatedDomains(certificates);
  
  for (const result of results) {
    result.chain = chain;
    result.relatedDomains = relatedDomains;
  }

  certCache.set(cacheKey, { data: results, fetchedAt: now });
  return results;
}

function extractHostname(input: string): { domain: string | null; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) return { domain: null, error: "Empty input" };

  try {
    let hostname: string;
    if (trimmed.match(/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//)) {
      const url = new URL(trimmed);
      hostname = url.hostname;
    } else if (trimmed.includes("/") || trimmed.includes("?") || trimmed.includes("#")) {
      const url = new URL(`https://${trimmed}`);
      hostname = url.hostname;
    } else {
      hostname = trimmed;
    }

    hostname = hostname.replace(/^www\./, "").toLowerCase();

    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::([0-9a-fA-F]{1,4}:){0,6}[0-9a-fA-F]{1,4}$|^([0-9a-fA-F]{1,4})?::([0-9a-fA-F]{1,4}:){0,5}[0-9a-fA-F]{1,4}$/;
    if (ipRegex.test(hostname)) {
      return { domain: null, error: "IP address detected. Use the IP Reputation Lookup tool for IP investigations." };
    }

    const domainRegex = /^([a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(hostname)) {
      return { domain: null, error: "Invalid domain format" };
    }

    return { domain: hostname, error: null };
  } catch {
    return { domain: null, error: "Failed to parse input" };
  }
}

export async function checkCertificateInspectorStatus(): Promise<IOCInvestigatorStatus> {
  const now = Date.now();
  
  const ctStatus = await checkCtAvailability();

  const sources: IOCInvestigatorSourceStatus[] = [
    {
      source: ctStatus.source,
      name: ctStatus.name,
      type: ctStatus.type,
      available: ctStatus.available,
      lastChecked: ctStatus.lastChecked,
      error: ctStatus.error,
      rateLimited: ctStatus.rateLimited,
      requiresConfiguration: ctStatus.requiresConfiguration,
      configNote: ctStatus.configNote,
    },
  ];

  if (CERT_INSPECTOR_PROXY_URL) {
    try {
      await throttleRequest();
      const response = await fetch(`${CERT_INSPECTOR_PROXY_URL}/health?source=crtsh`, {
        headers: { "User-Agent": "abhishek-cybersecurity-portfolio/1.0" },
      });
      
      if (response.ok) {
        const data = await response.json();
        sources.push({
          source: "crtsh-proxy",
          name: "Certificate Transparency (via Proxy)",
          type: "TLS Certificate History",
          available: data.available ?? true,
          lastChecked: new Date(now).toISOString(),
          error: data.error ?? null,
          rateLimited: data.rateLimited ?? false,
          requiresConfiguration: data.requiresConfiguration ?? false,
          configNote: data.configNote ?? null,
        });
      }
    } catch {
      sources.push({
        source: "crtsh-proxy",
        name: "Certificate Transparency (via Proxy)",
        type: "TLS Certificate History",
        available: false,
        lastChecked: new Date(now).toISOString(),
        error: "Proxy unavailable",
        rateLimited: false,
        requiresConfiguration: true,
        configNote: "Configure CERT_INSPECTOR_PROXY_URL",
      });
    }
  }

  return {
    sources,
    lastRefresh: new Date(now).toISOString(),
    overallAvailable: sources.some(s => s.available),
  };
}

export function clearCertCache(): void {
  certCache.clear();
  clearCtCache();
}

export function getCachedCertificates(hostname: string, includeSubdomains = true): CertificateInfo[] | null {
  const cacheKey = `cert-host-${hostname}-${includeSubdomains}`;
  const cached = certCache.get(cacheKey);
  if (cached) return cached.data;
  
  const ctCached = getCachedCtCertificates(hostname, includeSubdomains);
  if (ctCached) {
    return ctCached.map((cert, index) => parseCertificateFromCT(cert, index));
  }
  return null;
}

export function addToCertHistory(entry: CertificateInspectorHistoryEntry): void {
  if (typeof window === "undefined") return;
  try {
    const history = JSON.parse(localStorage.getItem("cert-inspector-history") ?? "[]") as CertificateInspectorHistoryEntry[];
    const filtered = history.filter(h => h.hostname !== entry.hostname);
    const updated = [entry, ...filtered].slice(0, 20);
    localStorage.setItem("cert-inspector-history", JSON.stringify(updated));
  } catch {
    // Ignore localStorage errors
  }
}

export function getCertHistory(): CertificateInspectorHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem("cert-inspector-history") ?? "[]") as CertificateInspectorHistoryEntry[];
  } catch {
    return [];
  }
}

export function clearCertHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem("cert-inspector-history");
}

export function exportCertInvestigation(certificates: CertificateInfo[]): string {
  return JSON.stringify(certificates, null, 2);
}

export { getProxyUrl };

export type {
  CertificateInfo,
  CertificateStatus,
  CertificateInspectorHistoryEntry,
};