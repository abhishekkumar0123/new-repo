import {
  DnsRecord,
  DnsResponse,
  DomainRecordType,
  DomainIntelSourceStatus,
} from "../types/domain-intelligence";

const DOH_PROVIDERS = [
  { name: "Cloudflare", url: "https://cloudflare-dns.com/dns-query", supportsDoH: true },
  { name: "Google", url: "https://dns.google/resolve", supportsDoH: true },
];

const RECORD_TYPE_MAP: Record<DomainRecordType, number> = {
  A: 1,
  AAAA: 28,
  CNAME: 5,
  MX: 15,
  NS: 2,
  TXT: 16,
  SOA: 6,
  PTR: 12,
  CAA: 257,
};

const RECORD_TYPE_REVERSE: Record<number, DomainRecordType> = {
  1: "A",
  28: "AAAA",
  5: "CNAME",
  15: "MX",
  2: "NS",
  16: "TXT",
  6: "SOA",
  12: "PTR",
  257: "CAA",
};

const DNS_CACHE_TTL_MS = 5 * 60 * 1000;
const DNS_REQUEST_DELAY_MS = 500;

let dnsCache: Map<string, { data: Record<DomainRecordType, DnsRecord[]>; fetchedAt: number }> = new Map();
let lastDnsRequestTime = 0;

async function throttleDnsRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastDnsRequestTime;
  if (elapsed < DNS_REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, DNS_REQUEST_DELAY_MS - elapsed));
  }
  lastDnsRequestTime = Date.now();
}

function parseDnsResponse(response: DnsResponse, requestedType: DomainRecordType): DnsRecord[] {
  const records: DnsRecord[] = [];
  const answers = response.answer ?? [];
  
  for (const answer of answers) {
    const type = RECORD_TYPE_REVERSE[answer.type];
    if (!type || type !== requestedType) continue;
    
    let value = answer.data;
    let priority: number | undefined;
    
    if (type === "MX") {
      const parts = value.split(" ");
      if (parts.length >= 2) {
        priority = parseInt(parts[0], 10);
        value = parts.slice(1).join(" ");
      }
    }
    
    records.push({
      type,
      value,
      ttl: answer.TTL,
      priority,
      name: answer.name,
    });
  }
  
  return records;
}

async function queryDoh(domain: string, type: DomainRecordType, providerUrl: string): Promise<DnsRecord[]> {
  await throttleDnsRequest();
  
  const url = new URL(providerUrl);
  url.searchParams.set("name", domain);
  url.searchParams.set("type", String(RECORD_TYPE_MAP[type]));
  url.searchParams.set("cd", "false");
  url.searchParams.set("do", "true");
  
  const response = await fetch(url.toString(), {
    headers: {
      Accept: "application/dns-json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });
  
  if (!response.ok) {
    throw new Error(`DoH query failed: ${response.status}`);
  }
  
  const data = (await response.json()) as DnsResponse;
  return parseDnsResponse(data, type);
}

export async function fetchDnsRecords(
  domain: string,
  types: DomainRecordType[] = ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA"],
  providerIndex = 0
): Promise<Record<DomainRecordType, DnsRecord[]>> {
  const cacheKey = `dns-${domain}-${types.join(",")}`;
  const now = Date.now();
  
  const cached = dnsCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < DNS_CACHE_TTL_MS) {
    return cached.data;
  }
  
  const provider = DOH_PROVIDERS[providerIndex] || DOH_PROVIDERS[0];
  const result: Record<DomainRecordType, DnsRecord[]> = {
    A: [],
    AAAA: [],
    CNAME: [],
    MX: [],
    NS: [],
    TXT: [],
    SOA: [],
    PTR: [],
    CAA: [],
  };
  
  const promises = types.map(async (type) => {
    try {
      const records = await queryDoh(domain, type, provider.url);
      result[type] = records;
    } catch {
      result[type] = [];
    }
  });
  
  await Promise.all(promises);
  dnsCache.set(cacheKey, { data: result, fetchedAt: now });
  return result;
}

export async function fetchAllDnsRecords(domain: string): Promise<Record<DomainRecordType, DnsRecord[]>> {
  return fetchDnsRecords(domain, ["A", "AAAA", "CNAME", "MX", "NS", "TXT", "SOA", "CAA"]);
}

export async function checkDnsAvailability(): Promise<DomainIntelSourceStatus> {
  const now = Date.now();
  try {
    const result = await queryDoh("example.com", "A", DOH_PROVIDERS[0].url);
    return {
      source: "dns-doh",
      name: "DNS over HTTPS (Cloudflare)",
      type: "DNS Resolution (A, AAAA, CNAME, MX, NS, TXT, SOA, CAA)",
      available: result.length >= 0,
      lastChecked: new Date(now).toISOString(),
      error: null,
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  } catch (error) {
    return {
      source: "dns-doh",
      name: "DNS over HTTPS (Cloudflare)",
      type: "DNS Resolution",
      available: false,
      lastChecked: new Date(now).toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  }
}

export function clearDnsCache(): void {
  dnsCache.clear();
}

export function getCachedDnsRecords(domain: string, types: DomainRecordType[]): Record<DomainRecordType, DnsRecord[]> | null {
  const cacheKey = `dns-${domain}-${types.join(",")}`;
  const cached = dnsCache.get(cacheKey);
  return cached?.data ?? null;
}