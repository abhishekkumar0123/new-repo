import { UrlRedirectChain, UrlRedirectHop } from "../types/url-analyzer";

const PRIVATE_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fe80::/i,
  /^fc00::/i,
  /^fd00::/i,
];

const MAX_REDIRECTS = 10;
const REQUEST_TIMEOUT = 10000;
const MAX_RESPONSE_SIZE = 1024 * 1024;

function isPrivateIp(ip: string): boolean {
  return PRIVATE_IP_RANGES.some(range => range.test(ip));
}

function isLocalhost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

async function resolveHostname(hostname: string): Promise<string[]> {
  try {
    const response = await fetch(`https://dns.google/resolve?name=${encodeURIComponent(hostname)}&type=A`, {
      headers: { Accept: "application/json" },
    });
    const data = await response.json();
    if (data.Answer) {
      return data.Answer.map((a: any) => a.data).filter((ip: string) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
    }
  } catch {}
  return [];
}

async function fetchWithTimeout(url: string, options: RequestInit, timeout: number): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: "manual",
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

function parseContentType(header: string | null): string | null {
  if (!header) return null;
  return header.split(";")[0].trim().toLowerCase();
}

export async function investigateRedirectChain(
  initialUrl: string,
  options: {
    maxRedirects?: number;
    timeout?: number;
    followRedirects?: boolean;
  } = {}
): Promise<UrlRedirectChain> {
  const maxRedirects = options.maxRedirects ?? MAX_REDIRECTS;
  const timeout = options.timeout ?? REQUEST_TIMEOUT;
  const followRedirects = options.followRedirects !== false;

  const hops: UrlRedirectHop[] = [];
  let currentUrl = initialUrl;
  let finalUrl: string | null = null;
  let hasLoop = false;
  let maxHopsExceeded = false;
  let error: string | null = null;

  const visitedUrls = new Set<string>();
  visitedUrls.add(currentUrl);

  try {
    for (let hop = 0; hop < maxRedirects; hop++) {
      let urlObj: URL;
      try {
        urlObj = new URL(currentUrl);
      } catch {
        error = `Invalid URL at hop ${hop}: ${currentUrl}`;
        break;
      }

      if (isLocalhost(urlObj.hostname)) {
        error = `Blocked redirect to localhost at hop ${hop}`;
        break;
      }

      const resolvedIps = await resolveHostname(urlObj.hostname);
      const privateIp = resolvedIps.some(isPrivateIp);
      if (privateIp) {
        error = `Blocked redirect to private IP (${resolvedIps.join(", ")}) at hop ${hop}`;
        break;
      }

      const startTime = Date.now();
      let response: Response;
      
      try {
        response = await fetchWithTimeout(currentUrl, {
          method: "HEAD",
          headers: {
            "User-Agent": "Mozilla/5.0 (compatible; URLAnalyzer/1.0; +https://abhishekkumar0123.github.io)",
            Accept: "*/*",
          },
        }, timeout);
      } catch (fetchError) {
        if (fetchError instanceof Error && fetchError.name === "AbortError") {
          error = `Request timeout at hop ${hop} (${timeout}ms)`;
        } else {
          error = `Fetch failed at hop ${hop}: ${fetchError instanceof Error ? fetchError.message : "Unknown error"}`;
        }
        break;
      }

      const responseTime = Date.now() - startTime;
      const statusCode = response.status;
      const contentType = parseContentType(response.headers.get("content-type"));
      const location = response.headers.get("location");

      const domainChange = hop > 0 ? new URL(hops[hop - 1].url).hostname !== urlObj.hostname : false;

      const hopData: UrlRedirectHop = {
        url: currentUrl,
        statusCode,
        responseTime,
        contentType,
        location,
        domainChange,
        isPrivateIp: privateIp,
        isLocalhost: isLocalhost(urlObj.hostname),
      };

      hops.push(hopData);

      const isRedirect = [301, 302, 303, 307, 308].includes(statusCode);
      
      if (!isRedirect || !location || !followRedirects) {
        finalUrl = currentUrl;
        break;
      }

      let nextUrl: string;
      try {
        nextUrl = new URL(location, currentUrl).toString();
      } catch {
        error = `Invalid redirect location at hop ${hop}: ${location}`;
        break;
      }

      if (visitedUrls.has(nextUrl)) {
        hasLoop = true;
        error = `Redirect loop detected at hop ${hop}`;
        break;
      }

      visitedUrls.add(nextUrl);
      currentUrl = nextUrl;

      if (hop === maxRedirects - 1) {
        maxHopsExceeded = true;
        error = `Maximum redirects (${maxRedirects}) exceeded`;
      }
    }

    if (!finalUrl && hops.length > 0) {
      finalUrl = hops[hops.length - 1].url;
    }
  } catch (unexpectedError) {
    error = unexpectedError instanceof Error ? unexpectedError.message : "Unknown error during redirect investigation";
  }

  return {
    hops,
    finalUrl,
    totalHops: hops.length,
    hasLoop,
    maxHopsExceeded,
    error,
  };
}

export async function quickHeadCheck(url: string): Promise<{
  statusCode: number | null;
  contentType: string | null;
  contentLength: number | null;
  server: string | null;
  error: string | null;
}> {
  try {
    const response = await fetchWithTimeout(url, {
      method: "HEAD",
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; URLAnalyzer/1.0; +https://abhishekkumar0123.github.io)",
      },
    }, REQUEST_TIMEOUT);

    return {
      statusCode: response.status,
      contentType: parseContentType(response.headers.get("content-type")),
      contentLength: response.headers.get("content-length") 
        ? parseInt(response.headers.get("content-length")!, 10) 
        : null,
      server: response.headers.get("server"),
      error: null,
    };
  } catch (error) {
    return {
      statusCode: null,
      contentType: null,
      contentLength: null,
      server: null,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}