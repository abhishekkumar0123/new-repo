export type IPVersion = "ipv4" | "ipv6";
export type IPClassification = "public" | "private" | "reserved" | "loopback" | "multicast" | "link-local";

export type IPReputationSource = 
  | "abuseipdb" 
  | "virustotal" 
  | "greynoise" 
  | "ipinfo" 
  | "otx";

export type RiskLevel = "clean" | "low" | "medium" | "high" | "critical" | "unknown";

export interface IPGeolocation {
  country: string | null;
  countryCode: string | null;
  continent: string | null;
  continentCode: string | null;
  region: string | null;
  regionCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  postalCode: string | null;
  isEU: boolean | null;
}

export interface IPNetworkInfo {
  asn: string | null;
  asnName: string | null;
  asnDomain: string | null;
  asnType: string | null;
  isp: string | null;
  org: string | null;
  networkRange: string | null;
  isHosting: boolean | null;
  isAnycast: boolean | null;
  isMobile: boolean | null;
  isSatellite: boolean | null;
  isAnonymous: boolean | null;
  connectionType: string | null;
  reverseDns: string | null;
  hostname: string | null;
}

export interface AbuseIPDBData {
  abuseConfidenceScore: number;
  totalReports: number;
  isWhitelisted: boolean;
  lastReportedAt: string | null;
  reports: Array<{
    reportedAt: string;
    comment: string | null;
    categories: number[];
    reporterId: number | null;
    reporterCountry: string | null;
  }>;
  countryCode: string | null;
  countryName: string | null;
  usageType: string | null;
  isp: string | null;
  domain: string | null;
  hostnames: string[];
  isTor: boolean;
}

export interface VirusTotalData {
  lastAnalysisStats: {
    malicious: number;
    suspicious: number;
    undetected: number;
    harmless: number;
    timeout: number;
  };
  lastAnalysisResults: Record<string, {
    category: string;
    result: string | null;
    method: string;
    engineName: string;
  }>;
  reputation: number;
  country: string | null;
  asn: string | null;
  asnName: string | null;
  network: string | null;
  tags: string[];
  whois: string | null;
  lastModificationDate: number | null;
}

export interface GreyNoiseData {
  noise: boolean;
  riot: boolean;
  classification: "malicious" | "benign" | "unknown" | "suspicious";
  name: string | null;
  link: string | null;
  lastSeen: string | null;
  message: string;
  metadata: {
    asn: string | null;
    asnName: string | null;
    country: string | null;
    city: string | null;
    region: string | null;
    organization: string | null;
    rdns: string | null;
    tor: boolean;
    vpn: boolean;
    proxy: boolean;
    tags: string[];
  };
}

export interface IPinfoData {
  ip: string;
  asn: string | null;
  asnName: string | null;
  asnDomain: string | null;
  countryCode: string | null;
  country: string | null;
  continentCode: string | null;
  continent: string | null;
  region: string | null;
  regionCode: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  timezone: string | null;
  postalCode: string | null;
  isHosting: boolean | null;
  isAnycast: boolean | null;
  isMobile: boolean | null;
  isSatellite: boolean | null;
  isAnonymous: boolean | null;
  carrier: string | null;
  privacy: {
    vpn: boolean;
    proxy: boolean;
    tor: boolean;
    relay: boolean;
    hosting: boolean;
  };
}

export interface OTXData {
  pulseCount: number;
  relatedPulses: Array<{
    id: string;
    name: string;
    description: string;
    tags: string[];
    created: string;
    modified: string;
    indicators: Array<{
      type: string;
      value: string;
    }>;
  }>;
  passiveDns: Array<{
    hostname: string;
    address: string;
    type: string;
    firstSeen: string;
    lastSeen: string;
  }>;
  malwareFamilies: string[];
  industries: string[];
  tags: string[];
  geo: {
    country: string | null;
    city: string | null;
    region: string | null;
  };
}

export interface IPReputationResult {
  ip: string;
  version: IPVersion;
  classification: IPClassification;
  geolocation: IPGeolocation;
  network: IPNetworkInfo;
  sources: {
    abuseipdb: AbuseIPDBData | null;
    virustotal: VirusTotalData | null;
    greynoise: GreyNoiseData | null;
    ipinfo: IPinfoData | null;
    otx: OTXData | null;
  };
  overallRisk: RiskLevel;
  riskScore: number;
  lastUpdated: string;
}

export interface IPReputationSourceStatus {
  source: IPReputationSource;
  name: string;
  type: string;
  available: boolean;
  lastChecked: string | null;
  error: string | null;
  rateLimited: boolean;
  requiresConfiguration: boolean;
  configNote: string | null;
}

export interface IPReputationStatus {
  sources: IPReputationSourceStatus[];
  lastRefresh: string | null;
  overallAvailable: boolean;
}

export interface IPLookupParams {
  ip: string;
  maxAgeInDays?: number;
  verbose?: boolean;
}

export interface IPLookupHistoryEntry {
  ip: string;
  timestamp: string;
  riskLevel: RiskLevel;
  sourcesQueried: IPReputationSource[];
}