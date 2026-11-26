import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const BROWSER_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36";

const FETCH_TIMEOUT_MS = 12000;

interface SourceConfig {
  id: string;
  name: string;
  url: string;
}

const SOURCES: Record<string, SourceConfig> = {
  thehackernews: { id: "thehackernews", name: "The Hacker News", url: "https://feeds.feedburner.com/TheHackersNews" },
  bleepingcomputer: { id: "bleepingcomputer", name: "BleepingComputer", url: "https://www.bleepingcomputer.com/feed/" },
  securityweek: { id: "securityweek", name: "SecurityWeek", url: "https://www.securityweek.com/feed/" },
  darkreading: { id: "darkreading", name: "Dark Reading", url: "https://www.darkreading.com/rss.xml" },
  krebs: { id: "krebs", name: "Krebs on Security", url: "https://krebsonsecurity.com/feed/" },
  "sans-isc": { id: "sans-isc", name: "SANS Internet Storm Center", url: "https://isc.sans.edu/rssfeed_full.xml" },
  "the-record": { id: "the-record", name: "The Record", url: "https://therecord.media/feed" },
  malwarebytes: { id: "malwarebytes", name: "Malwarebytes Labs", url: "https://www.malwarebytes.com/blog/feed/index.xml" },
  "google-security": { id: "google-security", name: "Google Security Blog", url: "https://security.googleblog.com/feeds/posts/default" },
  "microsoft-security": { id: "microsoft-security", name: "Microsoft Security Blog", url: "https://www.microsoft.com/en-us/security/blog/feed/" },
  "cisco-talos": { id: "cisco-talos", name: "Cisco Talos Intelligence", url: "https://blog.talosintelligence.com/rss/" },
  unit42: { id: "unit42", name: "Unit 42 (Palo Alto Networks)", url: "https://unit42.paloaltonetworks.com/feed/" },
  crowdstrike: { id: "crowdstrike", name: "CrowdStrike Blog", url: "https://www.crowdstrike.com/blog/feed/" },
  trendmicro: { id: "trendmicro", name: "Trend Micro Research", url: "https://blog.trendmicro.com/feed/" },
  rapid7: { id: "rapid7", name: "Rapid7 Blog", url: "https://blog.rapid7.com/rss/" },
  tenable: { id: "tenable", name: "Tenable Blog", url: "https://www.tenable.com/blog/feed" },
};

const MAX_XML_BYTES = 4 * 1024 * 1024;

async function fetchFeed(source: SourceConfig): Promise<{
  ok: boolean;
  xml?: string;
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
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,application/rss+xml;q=0.8,*/*;q=0.7",
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
    if (contentLength > MAX_XML_BYTES) {
      return {
        ok: false,
        status: response.status,
        error: "Feed exceeds size limit",
        fetchedAt,
      };
    }

    const text = await response.text();
    if (!text || text.length < 20) {
      return { ok: false, status: response.status, error: "Empty feed body", fetchedAt };
    }
    if (text.length > MAX_XML_BYTES) {
      return { ok: false, status: response.status, error: "Feed exceeds size limit", fetchedAt };
    }

    return { ok: true, xml: text, status: response.status, fetchedAt };
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
      sources: Object.values(SOURCES).map((s) => ({ id: s.id, name: s.name })),
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

  const sourceId = payload.source;
  if (!sourceId) {
    return json({ error: "Missing source parameter" }, 400);
  }

  const source = SOURCES[sourceId];
  if (!source) {
    return json({ error: "Unknown source", source: sourceId }, 400);
  }

  const result = await fetchFeed(source);
  return json({ source: source.id, ...result });
});