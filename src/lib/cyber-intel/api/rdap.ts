import {
  RdapDomain,
  RdapEntity,
  RdapNameserver,
  DomainIntelSourceStatus,
} from "../types/domain-intelligence";

const RDAP_BOOTSTRAP_URL = "https://data.iana.org/rdap/dns.json";
const RDAP_CACHE_TTL_MS = 60 * 60 * 1000;
const RDAP_REQUEST_DELAY_MS = 1000;

let rdapCache: Map<string, { data: RdapDomain; fetchedAt: number }> = new Map();
let rdapBootstrapCache: { data: Array<{ tld: string; rdapUrl: string }> | null; fetchedAt: number | null } = {
  data: null,
  fetchedAt: null,
};
let lastRdapRequestTime = 0;

async function throttleRdapRequest(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRdapRequestTime;
  if (elapsed < RDAP_REQUEST_DELAY_MS) {
    await new Promise((resolve) => setTimeout(resolve, RDAP_REQUEST_DELAY_MS - elapsed));
  }
  lastRdapRequestTime = Date.now();
}

async function fetchRdapBootstrap(): Promise<Array<{ tld: string; rdapUrl: string }>> {
  const now = Date.now();
  if (rdapBootstrapCache.data && rdapBootstrapCache.fetchedAt && now - rdapBootstrapCache.fetchedAt < 24 * 60 * 60 * 1000) {
    return rdapBootstrapCache.data;
  }
  
  await throttleRdapRequest();
  
  const response = await fetch(RDAP_BOOTSTRAP_URL, {
    headers: {
      Accept: "application/rdap+json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });
  
  if (!response.ok) {
    throw new Error(`RDAP bootstrap failed: ${response.status}`);
  }
  
  const data = await response.json();
  const services = data.services ?? [];
  const tldMap: Array<{ tld: string; rdapUrl: string }> = [];
  
  for (const service of services) {
    const tlds = service[0] ?? [];
    const urls = service[1] ?? [];
    for (const tld of tlds) {
      for (const url of urls) {
        tldMap.push({ tld: tld.replace(/^\./, ""), rdapUrl: url });
      }
    }
  }
  
  rdapBootstrapCache = { data: tldMap, fetchedAt: now };
  return tldMap;
}

function findRdapUrl(domain: string, bootstrap: Array<{ tld: string; rdapUrl: string }>): string | null {
  const parts = domain.split(".");
  for (let i = 1; i <= parts.length; i++) {
    const tld = parts.slice(-i).join(".");
    const match = bootstrap.find((b) => b.tld === tld);
    if (match) return match.rdapUrl;
  }
  return null;
}

function parseRdapEntity(entity: RdapEntity): { name: string | null; organization: string | null; email: string | null; country: string | null; state: string | null; city: string | null } {
  const vcard = entity.vcardArray;
  if (!vcard || !Array.isArray(vcard) || vcard.length < 2) {
    return { name: null, organization: null, email: null, country: null, state: null, city: null };
  }
  
  const fields = vcard[1] as unknown[];
  let name: string | null = null;
  let organization: string | null = null;
  let email: string | null = null;
  let country: string | null = null;
  let state: string | null = null;
  let city: string | null = null;
  
  for (const field of fields) {
    if (!Array.isArray(field) || field.length < 4) continue;
    const [fieldName, , , value] = field;
    
    switch (fieldName.toLowerCase()) {
      case "fn":
        name = String(value);
        break;
      case "org":
        organization = Array.isArray(value) ? value[0] : String(value);
        break;
      case "email":
        email = String(value);
        break;
      case "adr":
        if (Array.isArray(value)) {
          city = value[3] || null;
          state = value[4] || null;
          country = value[6] || null;
        }
        break;
    }
  }
  
  return { name, organization, email, country, state, city };
}

export async function fetchRdapDomain(domain: string): Promise<RdapDomain | null> {
  const cacheKey = `rdap-${domain}`;
  const now = Date.now();
  
  const cached = rdapCache.get(cacheKey);
  if (cached && now - cached.fetchedAt < RDAP_CACHE_TTL_MS) {
    return cached.data;
  }
  
  try {
    await throttleRdapRequest();
    
    const bootstrap = await fetchRdapBootstrap();
    const rdapUrl = findRdapUrl(domain, bootstrap);
    
    if (!rdapUrl) {
      return null;
    }
    
    const url = new URL(`${rdapUrl}domain/${domain}`);
    const response = await fetch(url.toString(), {
      headers: {
        Accept: "application/rdap+json",
        "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
      },
    });
    
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`RDAP query failed: ${response.status}`);
    }
    
    const data = (await response.json()) as RdapDomain;
    rdapCache.set(cacheKey, { data, fetchedAt: now });
    return data;
  } catch {
    return null;
  }
}

function extractRegistrarInfo(entities: RdapEntity[] | undefined): { name: string | null; ianaId: string | null; url: string | null; abuseEmail: string | null; abusePhone: string | null } {
  if (!entities) return { name: null, ianaId: null, url: null, abuseEmail: null, abusePhone: null };
  
  const registrar = entities.find((e) => e.roles?.includes("registrar"));
  if (!registrar) return { name: null, ianaId: null, url: null, abuseEmail: null, abusePhone: null };
  
  const vcard = registrar.vcardArray;
  if (!vcard || !Array.isArray(vcard) || vcard.length < 2) {
    return { name: null, ianaId: registrar.handle ?? null, url: null, abuseEmail: null, abusePhone: null };
  }
  
  const fields = vcard[1] as unknown[];
  let name: string | null = null;
  let url: string | null = null;
  let abuseEmail: string | null = null;
  let abusePhone: string | null = null;
  
  for (const field of fields) {
    if (!Array.isArray(field) || field.length < 4) continue;
    const [fieldName, , , value] = field;
    
    switch (fieldName.toLowerCase()) {
      case "fn":
        name = String(value);
        break;
      case "url":
        url = String(value);
        break;
      case "email":
        if (String(value).includes("abuse")) abuseEmail = String(value);
        break;
      case "tel":
        if (String(value).includes("abuse")) abusePhone = String(value);
        break;
    }
  }
  
  return {
    name,
    ianaId: registrar.handle ?? null,
    url,
    abuseEmail,
    abusePhone,
  };
}

function extractRegistrantInfo(entities: RdapEntity[] | undefined): { name: string | null; organization: string | null; email: string | null; country: string | null; state: string | null; city: string | null; isPrivate: boolean } {
  if (!entities) return { name: null, organization: null, email: null, country: null, state: null, city: null, isPrivate: false };
  
  const registrant = entities.find((e) => e.roles?.includes("registrant"));
  if (!registrant) return { name: null, organization: null, email: null, country: null, state: null, city: null, isPrivate: false };
  
  const parsed = parseRdapEntity(registrant);
  const isPrivate = !parsed.name && !parsed.organization && !parsed.email;
  
  return { ...parsed, isPrivate };
}

function extractTimestamps(events: RdapDomain["events"]): { registrationDate: string | null; updatedDate: string | null; expirationDate: string | null } {
  const result = { registrationDate: null as string | null, updatedDate: null as string | null, expirationDate: null as string | null };
  if (!events) return result;
  
  for (const event of events) {
    switch (event.eventAction) {
      case "registration":
        result.registrationDate = event.eventDate;
        break;
      case "last changed":
      case "last update":
        result.updatedDate = event.eventDate;
        break;
      case "expiration":
        result.expirationDate = event.eventDate;
        break;
    }
  }
  return result;
}

function extractNameservers(nameservers: RdapNameserver[] | undefined): Array<{ name: string; ips: { v4?: string[]; v6?: string[] } }> {
  if (!nameservers) return [];
  return nameservers.map((ns) => ({
    name: ns.ldhName,
    ips: {
      v4: ns.ipAddresses?.v4,
      v6: ns.ipAddresses?.v6,
    },
  }));
}

export async function checkRdapAvailability(): Promise<DomainIntelSourceStatus> {
  const now = Date.now();
  try {
    await throttleRdapRequest();
    const bootstrap = await fetchRdapBootstrap();
    return {
      source: "rdap",
      name: "RDAP (Registration Data Access Protocol)",
      type: "Domain Registration Information",
      available: bootstrap.length > 0,
      lastChecked: new Date(now).toISOString(),
      error: null,
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  } catch (error) {
    return {
      source: "rdap",
      name: "RDAP (Registration Data Access Protocol)",
      type: "Domain Registration Information",
      available: false,
      lastChecked: new Date(now).toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  }
}

export function clearRdapCache(): void {
  rdapCache.clear();
  rdapBootstrapCache = { data: null, fetchedAt: null };
}

export function getCachedRdapDomain(domain: string): RdapDomain | null {
  const cacheKey = `rdap-${domain}`;
  const cached = rdapCache.get(cacheKey);
  return cached?.data ?? null;
}

export function parseRdapForIntel(domain: RdapDomain): {
  registrar: { name: string | null; ianaId: string | null; url: string | null; abuseEmail: string | null; abusePhone: string | null };
  registrant: { name: string | null; organization: string | null; email: string | null; country: string | null; state: string | null; city: string | null; isPrivate: boolean };
  timestamps: { registrationDate: string | null; updatedDate: string | null; expirationDate: string | null };
  nameservers: Array<{ name: string; ips: { v4?: string[]; v6?: string[] } }>;
  status: string[];
  dnssec: boolean | null;
} {
  return {
    registrar: extractRegistrarInfo(domain.entities),
    registrant: extractRegistrantInfo(domain.entities),
    timestamps: extractTimestamps(domain.events),
    nameservers: extractNameservers(domain.nameservers),
    status: domain.status ?? [],
    dnssec: domain.secureDNS?.delegationSigned ?? null,
  };
}