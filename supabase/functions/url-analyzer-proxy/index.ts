import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const VIRUSTOTAL_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const OTX_API_KEY = Deno.env.get("OTX_API_KEY");
const ABUSECH_AUTH_KEY = Deno.env.get("ABUSECH_AUTH_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function proxyUrlhaus(path: string, query: URLSearchParams): Promise<Response> {
  if (!ABUSECH_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSECH_AUTH_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(`https://urlhaus-api.abuse.ch/v1/${path}`);
  query.forEach((value, key) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      "Auth-Key": ABUSECH_AUTH_KEY,
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

async function proxyVirusTotal(endpoint: string, params: Record<string, string>): Promise<Response> {
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(`https://www.virustotal.com/api/v3/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      "x-apikey": VIRUSTOTAL_API_KEY,
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

async function proxyOtx(endpoint: string, params: Record<string, string>): Promise<Response> {
  if (!OTX_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OTX_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const url = new URL(`https://otx.alienvault.com/api/v1/${endpoint}`);
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));

  const response = await fetch(url.toString(), {
    headers: {
      "X-OTX-API-KEY": OTX_API_KEY,
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

async function proxyPhishTank(url: string): Promise<Response> {
  const formData = new URLSearchParams();
  formData.set("url", url);
  formData.set("format", "json");

  const response = await fetch("https://checkurl.phishtank.com/checkurl/", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
    body: formData.toString(),
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": response.headers.get("content-type") ?? "application/json",
    },
  });
}

async function proxyOpenPhish(): Promise<Response> {
  const response = await fetch("https://openphish.com/feed.txt", {
    headers: {
      Accept: "text/plain",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
  });

  const body = await response.text();
  return new Response(body, {
    status: response.status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "text/plain",
    },
  });
}

async function handleHealthCheck(source: string): Promise<Response> {
  const checks: Record<string, { available: boolean; error?: string; requiresConfiguration: boolean; configNote?: string }> = {
    urlhaus: { available: !!ABUSECH_AUTH_KEY, requiresConfiguration: !ABUSECH_AUTH_KEY, configNote: ABUSECH_AUTH_KEY ? undefined : "ABUSECH_AUTH_KEY secret required" },
    virustotal: { available: !!VIRUSTOTAL_API_KEY, requiresConfiguration: !VIRUSTOTAL_API_KEY, configNote: VIRUSTOTAL_API_KEY ? undefined : "VIRUSTOTAL_API_KEY secret required" },
    phishtank: { available: true, requiresConfiguration: false },
    openphish: { available: true, requiresConfiguration: false },
    otx: { available: !!OTX_API_KEY, requiresConfiguration: !OTX_API_KEY, configNote: OTX_API_KEY ? undefined : "OTX_API_KEY secret required" },
  };

  const check = checks[source];
  if (!check) {
    return new Response(
      JSON.stringify({ error: "Unknown source" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  return new Response(
    JSON.stringify(check),
    { headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  
  if (req.method === "GET" && url.pathname.endsWith("/health")) {
    const source = url.searchParams.get("source");
    if (!source) {
      return new Response(
        JSON.stringify({ error: "Missing source parameter" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
    }
    return handleHealthCheck(source);
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let payload: { source?: string; endpoint?: string; payload?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { source, endpoint, payload: body } = payload;

  if (!source || !endpoint) {
    return new Response(
      JSON.stringify({ error: "Missing source or endpoint" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  try {
    if (source === "urlhaus") {
      const queryParams = new URLSearchParams(body as Record<string, string>);
      return proxyUrlhaus(endpoint, queryParams);
    }

    if (source === "virustotal") {
      return proxyVirusTotal(endpoint, body as Record<string, string>);
    }

    if (source === "otx") {
      return proxyOtx(endpoint, body as Record<string, string>);
    }

    if (source === "phishtank") {
      const urlToCheck = (body as { url?: string }).url;
      if (!urlToCheck) {
        return new Response(
          JSON.stringify({ error: "Missing url in payload" }),
          { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
        );
      }
      return proxyPhishTank(urlToCheck);
    }

    if (source === "openphish") {
      return proxyOpenPhish();
    }

    return new Response(
      JSON.stringify({ error: "Unknown or missing source" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
});