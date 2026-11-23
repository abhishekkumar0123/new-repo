export type DomainRecordType = "A" | "AAAA" | "CNAME" | "MX" | "NS" | "TXT" | "SOA" | "PTR" | "CAA";

export type DnsRecord = {
  type: DomainRecordType;
  value: string;
  ttl?: number;
  priority?: number;
  name?: string;
};

export type DnsResponse = {
  status: number;
  tc: boolean;
  rd: boolean;
  ra: boolean;
  ad: boolean;
  cd: boolean;
  question: Array<{ name: string; type: number }>;
  answer?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  authority?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
  additional?: Array<{
    name: string;
    type: number;
    TTL: number;
    data: string;
  }>;
};

export type RdapEntity = {
  objectClassName: "entity";
  handle: string;
  vcardArray?: Array<unknown>;
  roles?: string[];
  publicIds?: Array<{ type: string; identifier: string }>;
  entities?: RdapEntity[];
  remarks?: Array<{ description: string[] }>;
  links?: Array<{ value: string; rel: string; href: string; type: string }>;
  events?: Array<{ eventAction: string; eventDate: string }>;
  status?: string[];
  port43?: string;
};

export type RdapNameserver = {
  objectClassName: "nameserver";
  ldhName: string;
  unicodeName?: string;
  ipAddresses?: { v4?: string[]; v6?: string[] };
  handle?: string;
  status?: string[];
  remarks?: Array<{ description: string[] }>;
  links?: Array<{ value: string; rel: string; href: string; type: string }>;
  events?: Array<{ eventAction: string; eventDate: string }>;
};

export type RdapDomain = {
  objectClassName: "domain";
  ldhName: string;
  unicodeName?: string;
  handle?: string;
  status?: string[];
  publicIds?: Array<{ type: string; identifier: string }>;
  entities?: RdapEntity[];
  nameservers?: RdapNameserver[];
  secureDNS?: {
    zoneSigned: boolean;
    delegationSigned: boolean;
    maxSigLife?: number;
    dsData?: Array<{
      keyTag: number;
      algorithm: number;
      digestType: number;
      digest: string;
    }>;
  };
  remarks?: Array<{ description: string[] }>;
  links?: Array<{ value: string; rel: string; href: string; type: string }>;
  events?: Array<{ eventAction: string; eventDate: string }>;
  port43?: string;
  network?: {
    objectClassName: "ip network";
    handle: string;
    startAddress: string;
    endAddress: string;
    ipVersion: "v4" | "v6";
    name?: string;
    type?: string;
    country?: string;
    status?: string[];
    events?: Array<{ eventAction: string; eventDate: string }>;
  };
};

export type CtCertificate = {
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
};

export type DomainIntelSource = 
  | "dns-doh"
  | "rdap"
  | "certificate-transparency"
  | "virustotal"
  | "urlhaus"
  | "otx"
  | "threatfox"
  | "ipinfo"
  | "greynoise"
  | "abuseipdb";

export type DomainReputationStatus = "malicious" | "suspicious" | "clean" | "unknown" | "no-detections";

export type DomainReputationData = {
  source: DomainIntelSource;
  status: DomainReputationStatus;
  score?: number;
  categories?: string[];
  detections?: number;
  totalVendors?: number;
  lastAnalysisDate?: string;
  details?: Record<string, unknown>;
  referenceUrl?: string;
};

export type DomainIntelligenceResult = {
  domain: string;
  rootDomain: string;
  subdomain: string | null;
  tld: string;
  isIpAddress: boolean;
  resolvedIps: {
    ipv4: string[];
    ipv6: string[];
  };
  dnsRecords: Record<DomainRecordType, DnsRecord[]>;
  rdap: RdapDomain | null;
  certificates: CtCertificate[];
  reputation: DomainReputationData[];
  hosting: {
    provider: string | null;
    asn: string | null;
    asnName: string | null;
    country: string | null;
    region: string | null;
    city: string | null;
    isHosting: boolean | null;
    isCdn: boolean | null;
    cdnProvider: string | null;
    cloudProvider: string | null;
    reverseDns: string | null;
    technologies: string[];
  };
  security: {
    dnssec: boolean | null;
    https: boolean;
    hsts: boolean | null;
    csp: boolean | null;
    securityHeaders: Record<string, string | null>;
  };
  timestamps: {
    registrationDate: string | null;
    updatedDate: string | null;
    expirationDate: string | null;
    domainAge: string | null;
    firstSeen: string | null;
    lastSeen: string | null;
  };
  registrar: {
    name: string | null;
    ianaId: string | null;
    url: string | null;
    abuseEmail: string | null;
    abusePhone: string | null;
  };
  registrant: {
    name: string | null;
    organization: string | null;
    email: string | null;
    country: string | null;
    state: string | null;
    city: string | null;
    isPrivate: boolean;
  };
  nameservers: Array<{
    name: string;
    ips: { v4?: string[]; v6?: string[] };
  }>;
  fetchedAt: string;
};

export type DomainIntelSourceStatus = {
  source: DomainIntelSource;
  name: string;
  type: string;
  available: boolean;
  lastChecked: string | null;
  error: string | null;
  rateLimited: boolean;
  requiresConfiguration: boolean;
  configNote: string | null;
};

export type DomainIntelStatus = {
  sources: DomainIntelSourceStatus[];
  lastRefresh: string | null;
  overallAvailable: boolean;
};

export type DomainSearchParams = {
  domain: string;
  includeSubdomains?: boolean;
  recordTypes?: DomainRecordType[];
};

export type DomainLookupHistoryEntry = {
  domain: string;
  timestamp: string;
  sourcesQueried: DomainIntelSource[];
  riskLevel: "clean" | "low" | "medium" | "high" | "critical" | "unknown";
};

export function extractDomain(input: string): { domain: string | null; error: string | null } {
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

export function getRootDomain(domain: string): string {
  const parts = domain.split(".");
  if (parts.length <= 2) return domain;
  
  const knownTlds = ["com", "net", "org", "edu", "gov", "mil", "int", "co", "io", "ai", "app", "dev", "tech", "xyz", "online", "site", "store", "blog", "me", "tv", "cc", "ws", "info", "biz", "name", "pro", "mobi", "tel", "asia", "cat", "jobs", "travel", "post", "xxx", "aero", "coop", "museum"];
  
  const lastPart = parts[parts.length - 1];
  const secondLast = parts[parts.length - 2];
  
  if (knownTlds.includes(lastPart) && !knownTlds.includes(secondLast)) {
    return parts.slice(-2).join(".");
  }
  
  if (parts.length >= 3) {
    const thirdLast = parts[parts.length - 3];
    if (knownTlds.includes(secondLast) && knownTlds.includes(lastPart)) {
      return parts.slice(-3).join(".");
    }
  }
  
  return parts.slice(-2).join(".");
}

export function getSubdomain(domain: string, rootDomain: string): string | null {
  if (domain === rootDomain) return null;
  const prefix = domain.replace(`.${rootDomain}`, "");
  return prefix || null;
}

export function getTld(domain: string): string {
  return domain.split(".").pop()?.toLowerCase() ?? "";
}

export function formatDomainAge(registrationDate: string | null): string | null {
  if (!registrationDate) return null;
  try {
    const regDate = new Date(registrationDate);
    const now = new Date();
    const diffMs = now.getTime() - regDate.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const years = Math.floor(diffDays / 365);
    const months = Math.floor((diffDays % 365) / 30);
    const days = diffDays % 30;
    
    const parts = [];
    if (years > 0) parts.push(`${years}y`);
    if (months > 0) parts.push(`${months}m`);
    if (days > 0 || parts.length === 0) parts.push(`${days}d`);
    return parts.join(" ");
  } catch {
    return null;
  }
}

export function getReputationColor(status: DomainReputationStatus): string {
  const colors: Record<DomainReputationStatus, string> = {
    malicious: "#ff4444",
    suspicious: "#ffaa00",
    clean: "#00cc66",
    unknown: "#77847e",
    "no-detections": "#00cc66",
  };
  return colors[status];
}

export function getReputationLabel(status: DomainReputationStatus): string {
  const labels: Record<DomainReputationStatus, string> = {
    malicious: "Malicious",
    suspicious: "Suspicious",
    clean: "Clean",
    unknown: "Unknown",
    "no-detections": "No Detections",
  };
  return labels[status];
}