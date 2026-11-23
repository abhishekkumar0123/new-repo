import {
  UrlThreatResult,
  UrlVerdict,
  UrlThreatCategory,
  UrlSource,
  UrlAnalyzerSourceStatus,
} from "../types/url-analyzer";

const PROXY_URL = typeof process !== "undefined" && process.env
  ? (process.env.NEXT_PUBLIC_URL_ANALYZER_PROXY_URL as string | undefined)
  : undefined;

function getProxyUrl(): string | undefined {
  return PROXY_URL;
}

async function proxyRequest(source: string, endpoint: string, payload: unknown): Promise<Response> {
  const proxyUrl = getProxyUrl();
  if (!proxyUrl) {
    throw new Error("URL Analyzer proxy URL not configured");
  }

  const response = await fetch(`${proxyUrl}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ source, endpoint, payload }),
  });

  return response;
}

async function checkSourceAvailability(source: string): Promise<UrlAnalyzerSourceStatus> {
  try {
    const proxyUrl = getProxyUrl();
    if (!proxyUrl) {
      return {
        source: source as UrlSource,
        name: getSourceName(source as UrlSource),
        type: "api",
        available: false,
        lastChecked: new Date().toISOString(),
        error: "Proxy URL not configured",
        rateLimited: false,
        requiresConfiguration: true,
        configNote: "Set NEXT_PUBLIC_URL_ANALYZER_PROXY_URL environment variable",
      };
    }

    const response = await fetch(`${proxyUrl}/health?source=${source}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        source: source as UrlSource,
        name: getSourceName(source as UrlSource),
        type: "api",
        available: data.available ?? true,
        lastChecked: new Date().toISOString(),
        error: data.error ?? null,
        rateLimited: data.rateLimited ?? false,
        requiresConfiguration: data.requiresConfiguration ?? false,
        configNote: data.configNote ?? null,
      };
    }

    return {
      source: source as UrlSource,
      name: getSourceName(source as UrlSource),
      type: "api",
      available: false,
      lastChecked: new Date().toISOString(),
      error: `Health check failed: ${response.status}`,
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  } catch (error) {
    return {
      source: source as UrlSource,
      name: getSourceName(source as UrlSource),
      type: "api",
      available: false,
      lastChecked: new Date().toISOString(),
      error: error instanceof Error ? error.message : "Unknown error",
      rateLimited: false,
      requiresConfiguration: false,
      configNote: null,
    };
  }
}

function getSourceName(source: UrlSource): string {
  const names: Record<UrlSource, string> = {
    urlhaus: "URLhaus",
    virustotal: "VirusTotal",
    phishtank: "PhishTank",
    openphish: "OpenPhish",
    otx: "AlienVault OTX",
    heuristic: "Local Heuristics",
  };
  return names[source];
}

function mapVerdict(verdict: string): UrlVerdict {
  const v = verdict.toLowerCase();
  if (v === "malicious" || v === "malware") return "malicious";
  if (v === "phishing") return "phishing";
  if (v === "suspicious") return "suspicious";
  if (v === "safe" || v === "clean" || v === "harmless" || v === "undetected") return "safe";
  return "unknown";
}

function mapCategory(category: string): UrlThreatCategory {
  const c = category.toLowerCase();
  if (c.includes("phish")) return "phishing";
  if (c.includes("malware")) return "malware_distribution";
  if (c.includes("botnet") || c.includes("c2") || c.includes("c&c")) return "botnet_cc";
  if (c.includes("trojan")) return "trojan";
  if (c.includes("ransom")) return "ransomware";
  if (c.includes("spy")) return "spyware";
  if (c.includes("spam")) return "spam";
  if (c.includes("scam") || c.includes("fraud")) return "scam";
  if (c.includes("suspicious")) return "suspicious";
  return "unknown";
}

export async function fetchUrlhausUrl(url: string): Promise<UrlThreatResult> {
  const proxyUrl = getProxyUrl();
  const startTime = Date.now();

  try {
    let response: Response;
    if (proxyUrl) {
      response = await proxyRequest("urlhaus", "url", { url });
    } else {
      const urlhausUrl = new URL("https://urlhaus-api.abuse.ch/v1/url/");
      urlhausUrl.searchParams.set("url", url);
      response = await fetch(urlhausUrl.toString(), {
        headers: { Accept: "application/json" },
      });
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (data.query_status === "ok" && data.url_status !== "offline") {
      const threats: UrlThreatCategory[] = [];
      if (data.threat) {
        const mapped = mapCategory(data.threat);
        if (mapped !== "unknown") threats.push(mapped);
      }
      if (data.tags) {
        for (const tag of data.tags) {
          const mapped = mapCategory(tag);
          if (mapped !== "unknown" && !threats.includes(mapped)) threats.push(mapped);
        }
      }
      if (threats.length === 0) threats.push("malware_distribution");

      return {
        source: "urlhaus",
        name: "URLhaus",
        verdict: mapVerdict(data.url_status),
        confidence: data.url_status === "online" ? 90 : 70,
        categories: threats,
        detectionCount: 1,
        totalVendors: 1,
        lastAnalysisDate: data.date_added ?? new Date().toISOString(),
        referenceUrl: `https://urlhaus.abuse.ch/url/${data.urlhaus_id}/`,
        rawData: data,
        isCached: false,
        error: null,
      };
    }

    return {
      source: "urlhaus",
      name: "URLhaus",
      verdict: "safe",
      confidence: 80,
      categories: [],
      detectionCount: 0,
      totalVendors: 1,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: data,
      isCached: false,
      error: null,
    };
  } catch (error) {
    return {
      source: "urlhaus",
      name: "URLhaus",
      verdict: "unavailable",
      confidence: null,
      categories: [],
      detectionCount: null,
      totalVendors: 1,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: null,
      isCached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchVirusTotalUrl(url: string): Promise<UrlThreatResult> {
  const proxyUrl = getProxyUrl();
  const startTime = Date.now();

  try {
    let response: Response;
    if (proxyUrl) {
      response = await proxyRequest("virustotal", "url", { url });
    } else {
      return {
        source: "virustotal",
        name: "VirusTotal",
        verdict: "unavailable",
        confidence: null,
        categories: [],
        detectionCount: null,
        totalVendors: null,
        lastAnalysisDate: new Date().toISOString(),
        referenceUrl: null,
        rawData: null,
        isCached: false,
        error: "VirusTotal requires API key via proxy",
      };
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (data.data?.attributes?.last_analysis_stats) {
      const stats = data.data.attributes.last_analysis_stats;
      const malicious = stats.malicious || 0;
      const suspicious = stats.suspicious || 0;
      const undetected = stats.undetected || 0;
      const harmless = stats.harmless || 0;
      const total = malicious + suspicious + undetected + harmless + (stats.timeout || 0);

      let verdict: UrlVerdict = "safe";
      if (malicious > 0) verdict = "malicious";
      else if (suspicious > 0) verdict = "suspicious";

      const categories: UrlThreatCategory[] = [];
      if (data.data.attributes.categories) {
        for (const cat of Object.values(data.data.attributes.categories)) {
          const mapped = mapCategory(String(cat));
          if (mapped !== "unknown" && !categories.includes(mapped)) categories.push(mapped);
        }
      }
      if (categories.length === 0 && malicious > 0) categories.push("malware_distribution");

      return {
        source: "virustotal",
        name: "VirusTotal",
        verdict,
        confidence: total > 0 ? Math.round((malicious / total) * 100) : 50,
        categories,
        detectionCount: malicious + suspicious,
        totalVendors: total,
        lastAnalysisDate: data.data.attributes.last_analysis_date 
          ? new Date(data.data.attributes.last_analysis_date * 1000).toISOString()
          : new Date().toISOString(),
        referenceUrl: `https://www.virustotal.com/gui/url/${data.data.id}`,
        rawData: data,
        isCached: false,
        error: null,
      };
    }

    return {
      source: "virustotal",
      name: "VirusTotal",
      verdict: "unavailable",
      confidence: null,
      categories: [],
      detectionCount: null,
      totalVendors: null,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: data,
      isCached: false,
      error: "Unexpected response format",
    };
  } catch (error) {
    return {
      source: "virustotal",
      name: "VirusTotal",
      verdict: "unavailable",
      confidence: null,
      categories: [],
      detectionCount: null,
      totalVendors: null,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: null,
      isCached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchPhishTankUrl(url: string): Promise<UrlThreatResult> {
  const proxyUrl = getProxyUrl();
  const startTime = Date.now();

  try {
    let response: Response;
    if (proxyUrl) {
      response = await proxyRequest("phishtank", "check", { url });
    } else {
      return {
        source: "phishtank",
        name: "PhishTank",
        verdict: "unavailable",
        confidence: null,
        categories: [],
        detectionCount: null,
        totalVendors: 1,
        lastAnalysisDate: new Date().toISOString(),
        referenceUrl: null,
        rawData: null,
        isCached: false,
        error: "PhishTank requires API key via proxy",
      };
    }

    const data = await response.json();
    const duration = Date.now() - startTime;

    if (data.results) {
      const inDatabase = data.results.in_database === true;
      const verified = data.results.verified === true;
      const valid = data.results.valid === true;

      if (inDatabase && verified && valid) {
        return {
          source: "phishtank",
          name: "PhishTank",
          verdict: "phishing",
          confidence: 95,
          categories: ["phishing"],
          detectionCount: 1,
          totalVendors: 1,
          lastAnalysisDate: data.results.verified_at ?? new Date().toISOString(),
          referenceUrl: `https://phishtank.org/phish_detail.php?phish_id=${data.results.phish_id}`,
          rawData: data,
          isCached: false,
          error: null,
        };
      }

      if (inDatabase && !verified) {
        return {
          source: "phishtank",
          name: "PhishTank",
          verdict: "suspicious",
          confidence: 60,
          categories: ["phishing"],
          detectionCount: 1,
          totalVendors: 1,
          lastAnalysisDate: data.results.verified_at ?? new Date().toISOString(),
          referenceUrl: `https://phishtank.org/phish_detail.php?phish_id=${data.results.phish_id}`,
          rawData: data,
          isCached: false,
          error: null,
        };
      }
    }

    return {
      source: "phishtank",
      name: "PhishTank",
      verdict: "safe",
      confidence: 85,
      categories: [],
      detectionCount: 0,
      totalVendors: 1,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: data,
      isCached: false,
      error: null,
    };
  } catch (error) {
    return {
      source: "phishtank",
      name: "PhishTank",
      verdict: "unavailable",
      confidence: null,
      categories: [],
      detectionCount: null,
      totalVendors: 1,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: null,
      isCached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchOpenPhishUrl(url: string): Promise<UrlThreatResult> {
  const proxyUrl = getProxyUrl();
  const startTime = Date.now();

  try {
    let response: Response;
    if (proxyUrl) {
      response = await proxyRequest("openphish", "check", { url });
    } else {
      const response = await fetch("https://openphish.com/feed.txt", {
        headers: { Accept: "text/plain" },
      });
      const text = await response.text();
      const urls = text.split("\n").map(u => u.trim()).filter(Boolean);
      const found = urls.includes(url);

      return {
        source: "openphish",
        name: "OpenPhish",
        verdict: found ? "phishing" : "safe",
        confidence: found ? 90 : 85,
        categories: found ? ["phishing"] : [],
        detectionCount: found ? 1 : 0,
        totalVendors: 1,
        lastAnalysisDate: new Date().toISOString(),
        referenceUrl: "https://openphish.com/",
        rawData: { checked: urls.length, found },
        isCached: false,
        error: null,
      };
    }

    const data = await response.json();

    if (data.found) {
      return {
        source: "openphish",
        name: "OpenPhish",
        verdict: "phishing",
        confidence: 90,
        categories: ["phishing"],
        detectionCount: 1,
        totalVendors: 1,
        lastAnalysisDate: new Date().toISOString(),
        referenceUrl: "https://openphish.com/",
        rawData: data,
        isCached: false,
        error: null,
      };
    }

    return {
      source: "openphish",
      name: "OpenPhish",
      verdict: "safe",
      confidence: 85,
      categories: [],
      detectionCount: 0,
      totalVendors: 1,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: "https://openphish.com/",
      rawData: data,
      isCached: false,
      error: null,
    };
  } catch (error) {
    return {
      source: "openphish",
      name: "OpenPhish",
      verdict: "unavailable",
      confidence: null,
      categories: [],
      detectionCount: null,
      totalVendors: 1,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: "https://openphish.com/",
      rawData: null,
      isCached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function fetchOtxUrl(url: string): Promise<UrlThreatResult> {
  const proxyUrl = getProxyUrl();
  const startTime = Date.now();

  try {
    let response: Response;
    if (proxyUrl) {
      response = await proxyRequest("otx", "url", { url });
    } else {
      return {
        source: "otx",
        name: "AlienVault OTX",
        verdict: "unavailable",
        confidence: null,
        categories: [],
        detectionCount: null,
        totalVendors: null,
        lastAnalysisDate: new Date().toISOString(),
        referenceUrl: null,
        rawData: null,
        isCached: false,
        error: "OTX requires API key via proxy",
      };
    }

    const data = await response.json();

    if (data.pulse_info?.count > 0) {
      const pulses = data.pulse_info.pulses || [];
      const categories: UrlThreatCategory[] = [];
      
      for (const pulse of pulses) {
        if (pulse.tags) {
          for (const tag of pulse.tags) {
            const mapped = mapCategory(tag);
            if (mapped !== "unknown" && !categories.includes(mapped)) categories.push(mapped);
          }
        }
      }

      return {
        source: "otx",
        name: "AlienVault OTX",
        verdict: "malicious",
        confidence: Math.min(95, 50 + pulses.length * 10),
        categories: categories.length > 0 ? categories : ["malware_distribution"],
        detectionCount: pulses.length,
        totalVendors: pulses.length,
        lastAnalysisDate: pulses[0]?.created ?? new Date().toISOString(),
        referenceUrl: `https://otx.alienvault.com/indicator/url/${encodeURIComponent(url)}`,
        rawData: data,
        isCached: false,
        error: null,
      };
    }

    return {
      source: "otx",
      name: "AlienVault OTX",
      verdict: "safe",
      confidence: 80,
      categories: [],
      detectionCount: 0,
      totalVendors: 0,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: `https://otx.alienvault.com/indicator/url/${encodeURIComponent(url)}`,
      rawData: data,
      isCached: false,
      error: null,
    };
  } catch (error) {
    return {
      source: "otx",
      name: "AlienVault OTX",
      verdict: "unavailable",
      confidence: null,
      categories: [],
      detectionCount: null,
      totalVendors: null,
      lastAnalysisDate: new Date().toISOString(),
      referenceUrl: null,
      rawData: null,
      isCached: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

export async function checkUrlhausAvailability(): Promise<UrlAnalyzerSourceStatus> {
  return checkSourceAvailability("urlhaus");
}

export async function checkVirusTotalAvailability(): Promise<UrlAnalyzerSourceStatus> {
  return checkSourceAvailability("virustotal");
}

export async function checkPhishTankAvailability(): Promise<UrlAnalyzerSourceStatus> {
  return checkSourceAvailability("phishtank");
}

export async function checkOpenPhishAvailability(): Promise<UrlAnalyzerSourceStatus> {
  return checkSourceAvailability("openphish");
}

export async function checkOtxAvailability(): Promise<UrlAnalyzerSourceStatus> {
  return checkSourceAvailability("otx");
}

export async function fetchAllUrlReputation(url: string): Promise<UrlThreatResult[]> {
  const results = await Promise.allSettled([
    fetchUrlhausUrl(url),
    fetchVirusTotalUrl(url),
    fetchPhishTankUrl(url),
    fetchOpenPhishUrl(url),
    fetchOtxUrl(url),
  ]);

  return results
    .filter((r): r is PromiseFulfilledResult<UrlThreatResult> => r.status === "fulfilled")
    .map(r => r.value);
}

export async function checkUrlAnalyzerStatus(): Promise<{
  sources: UrlAnalyzerSourceStatus[];
  lastRefresh: string | null;
  overallAvailable: boolean;
}> {
  const sources = await Promise.all([
    checkUrlhausAvailability(),
    checkVirusTotalAvailability(),
    checkPhishTankAvailability(),
    checkOpenPhishAvailability(),
    checkOtxAvailability(),
  ]);

  return {
    sources,
    lastRefresh: new Date().toISOString(),
    overallAvailable: sources.some(s => s.available),
  };
}

export { getProxyUrl };