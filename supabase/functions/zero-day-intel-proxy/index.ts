import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 15000;
const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;

interface SourceConfig {
  id: string;
  name: string;
  url: string;
  accept: string;
}

/**
 * Strict allowlist. The browser never supplies a URL, so this function cannot
 * be used as an open proxy or to reach internal/private endpoints.
 */
const SOURCES: Record<string, SourceConfig> = {
  "cisa-kev": {
    id: "cisa-kev",
    name: "CISA Known Exploited Vulnerabilities Catalog",
    url: "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json",
    accept: "application/json",
  },
  "cisa-advisories": {
    id: "cisa-advisories",
    name: "CISA Cybersecurity Advisories RSS",
    url: "https://www.cisa.gov/cybersecurity-advisories/all.xml",
    accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.7",
  },
  "exploit-db": {
    id: "exploit-db",
    name: "Exploit-DB Recent Exploits RSS",
    url: "https://www.exploit-db.com/rss.xml",
    accept: "application/rss+xml, application/xml, text/xml;q=0.9, */*;q=0.7",
  },
};

async function fetchSource(source: SourceConfig): Promise<{
  ok: boolean;
  text?: string;
  status?: number;
  error?: string;
  fetchedAt: string;
}> {
  const fetchedAt = new Date().toISOString();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(source.url, {
      headers: {
        "User-Agent": BROWSER_UA,
        Accept: source.accept,
        "Accept-Language": "en-US,en;q=0.9",
      },
      redirect: "follow",
      signal: controller.signal,
    });

    if (!response.ok) {
      return {
        ok: false,
        status: response.status,
        error: `Upstream feed returned HTTP ${response.status}`,
        fetchedAt,
      };
    }

    const contentLength = Number(response.headers.get("content-length") ?? "0");
    if (contentLength > MAX_RESPONSE_BYTES) {
      return { ok: false, status: response.status, error: "Feed exceeds size limit", fetchedAt };
    }

    const text = await response.text();
    if (!text || text.length < 20) {
      return { ok: false, status: response.status, error: "Empty feed body", fetchedAt };
    }
    if (text.length > MAX_RESPONSE_BYTES) {
      return { ok: false, status: response.status, error: "Feed exceeds size limit", fetchedAt };
    }

    return { ok: true, text, status: response.status, fetchedAt };
  } catch (error) {
    const message =
      error instanceof Error && error.name === "AbortError"
        ? "Upstream feed request timed out"
        : error instanceof Error
          ? error.message
          : "Unknown error fetching feed";
    return { ok: false, error: message, fetchedAt };
  } finally {
    clearTimeout(timeout);
  }
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);

  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    const requested = url.searchParams.get("source");
    if (requested) {
      const source = SOURCES[requested];
      if (!source) {
        return json({ error: "Unknown source", source: requested }, 400);
      }
      return json({
        source: source.id,
        name: source.name,
        configured: true,
        url: source.url,
      });
    }
    return json({
      configured: true,
      count: Object.keys(SOURCES).length,
      sources: Object.values(SOURCES).map((source) => ({ id: source.id, name: source.name })),
    });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  let payload: { source?: string };
  try {
    payload = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const source = payload.source ? SOURCES[payload.source] : undefined;
  if (!source) {
    return json({ error: "Unknown or missing source", source: payload.source ?? null }, 400);
  }

  const result = await fetchSource(source);
  return json({ source: source.id, ...result });
});
