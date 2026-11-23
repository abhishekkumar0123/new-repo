import { CtCertificate, DomainIntelSourceStatus } from "../types/domain-intelligence";

const CT_API_URL = "https://crt.sh/";
const CT_CACHE_TTL_MS = 60 * 60 * 1000;
const CT_REQUEST_DELAY_MS = 1000;

let ctCache: Map<string, { data: CtCertificate[]; fetchedAt: number }> = new Map();
let lastCtRequestTime = 0;

async function throttleCtRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastCtRequestTime;
  if (elapsed < CT_REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, CT_REQUEST_DELAY_MS - elapsed));
  }
  lastCtRequestTime = Date.now();
}

function parseCtResponse(text: string): CtCertificate[] {
  const lines = text.trim().split("\n");
  const certificates: CtCertificate[] = [];
  
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const cert = JSON.parse(line);
      certificates.push({
        issuerCaId: cert.issuer_ca_id,
        issuerName: cert.issuer_name,
        commonName: cert.common_name,
        nameValue: cert.name_value,
        id: cert.id,
        entryTimestamp: cert.entry_timestamp,
        notBefore: cert.not_before,
        notAfter: cert.not_after,
        serialNumber: cert.serial_number,
        sha256: cert.sha256,
        sha1: cert.sha1,
      });
    } catch {
      continue;
    }
  }
  
  return certificates;
}

export async function fetchCtCertificates(domain: string, includeSubdomains = true): Promise<CtCertificate[]> {
  const cacheKey = `ct-${domain}-${includeSubdomains}`;
  const now = Date.now();
  
  const cached = ctCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < CT_CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    await throttleCtRequest();
    
    const query = includeSubdomains ? `%.${domain}` : domain;
    const url = new URL(CT_API_URL);
    url.searchParams.set("q", query);
    url.searchParams.set("output", "json");
    
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
    });
    
    if (!response.ok) {
      if (response.status === 404 || response.status === 500) return [];
      throw new Error(`CT query failed: ${response.status}`);
    }
    
    const text = await response.text();
    const certificates = parseCtResponse(text);
    
    ctCache.set(cacheKey, { data: certificates, fetchedAt: now });
    return certificates;
  } catch {
    return [];
  }
}

export async function fetchCtCertificatesByFingerprint(fingerprint: string): Promise<CtCertificate[]> {
  const cacheKey = `ct-fp-${fingerprint}`;
  const now = Date.now();
  
  const cached = ctCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < CT_CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    await throttleCtRequest();
    
    const url = new URL(CT_API_URL);
    url.searchParams.set("q", fingerprint);
    url.searchParams.set("output", "json");
    
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
    });
    
    if (!response.ok) return [];
    
    const text = await response.text();
    const certificates = parseCtResponse(text);
    
    ctCache.set(cacheKey, { data: certificates, fetchedAt: now });
    return certificates;
  } catch {
    return [];
  }
}

function extractSanDomains(certificates: CtCertificate[]): string[] {
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

function getCertificateStatus(notAfter: string): "valid" | "expired" | "expiring-soon" {
  try {
    const expiry = new Date(notAfter);
    const now = new Date();
    const diffDays = Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "expiring-soon";
    return "valid";
  } catch {
    return "valid";
  }
}

export async function checkCtAvailability(): Promise<DomainIntelSourceStatus> {
  const now = Date.now();
  try {
    await throttleCtRequest();
    const url = new URL(CT_API_URL);
    url.searchParams.set("q", "example.com");
    url.searchParams.set("output", "json");
    
    const response = await fetch(url.toString(), {
      headers: { "User-Agent": "abhishek-cybersecurity-portfolio/1.0" },
    });
    
    return {
      source: "certificate-transparency",
      name: "Certificate Transparency (crt.sh)",
      type: "TLS Certificate History",
      available: response.ok,
      lastChecked: new Date(now).toISOString(),
      error: response.ok ? null : `HTTP ${response.status}`,
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  } catch (error) {
    return {
      source: "certificate-transparency",
      name: "Certificate Transparency (crt.sh)",
      type: "TLS Certificate History",
      available: false,
      lastChecked: new Date(now).toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  }
}

export function clearCtCache(): void {
  ctCache.clear();
}

export function getCachedCtCertificates(domain: string, includeSubdomains: boolean): CtCertificate[] | null {
  const cacheKey = `ct-${domain}-${includeSubdomains}`;
  const cached = ctCache.get(cacheKey);
  return cached?.data ?? null;
}

export function processCertificatesForIntel(certificates: CtCertificate[]): {
  totalCertificates: number;
  validCertificates: number;
  expiredCertificates: number;
  expiringSoonCertificates: number;
  uniqueIssuers: string[];
  sanDomains: string[];
  earliestNotBefore: string | null;
  latestNotAfter: string | null;
  certificatesByIssuer: Record<string, number>;
} {
  let valid = 0;
  let expired = 0;
  let expiringSoon = 0;
  const issuers = new Set<string>();
  const certsByIssuer: Record<string, number> = {};
  let earliest: Date | null = null;
  let latest: Date | null = null;
  
  for (const cert of certificates) {
    const status = getCertificateStatus(cert.notAfter);
    if (status === "valid") valid++;
    else if (status === "expired") expired++;
    else expiringSoon++;
    
    issuers.add(cert.issuerName);
    certsByIssuer[cert.issuerName] = (certsByIssuer[cert.issuerName] || 0) + 1;
    
    try {
      const notBefore = new Date(cert.notBefore);
      const notAfter = new Date(cert.notAfter);
      if (!earliest || notBefore < earliest) earliest = notBefore;
      if (!latest || notAfter > latest) latest = notAfter;
    } catch {
      // Ignore date parse errors
    }
  }
  
  return {
    totalCertificates: certificates.length,
    validCertificates: valid,
    expiredCertificates: expired,
    expiringSoonCertificates: expiringSoon,
    uniqueIssuers: Array.from(issuers).sort(),
    sanDomains: extractSanDomains(certificates),
    earliestNotBefore: earliest?.toISOString() ?? null,
    latestNotAfter: latest?.toISOString() ?? null,
    certificatesByIssuer: certsByIssuer,
  };
}