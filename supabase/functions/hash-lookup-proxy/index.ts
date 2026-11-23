import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const VIRUSTOTAL_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const OTX_API_KEY = Deno.env.get("OTX_API_KEY");
const ABUSECH_AUTH_KEY = Deno.env.get("ABUSECH_AUTH_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function proxyMalwareBazaar(hash: string): Promise<Response> {
  if (!ABUSECH_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSECH_AUTH_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const formData = new URLSearchParams();
  formData.set("query", "get_info");
  formData.set("hash", hash);

  const response = await fetch("https://mb-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: {
      "Auth-Key": ABUSECH_AUTH_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
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

async function proxyVirusTotal(hash: string): Promise<Response> {
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://www.virustotal.com/api/v3/files/${hash}`, {
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

async function proxyOTX(hash: string): Promise<Response> {
  if (!OTX_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OTX_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/file/${hash}/general`, {
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

async function proxyThreatFox(hash: string): Promise<Response> {
  if (!ABUSECH_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSECH_AUTH_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const formData = new URLSearchParams();
  formData.set("query", "search_ioc");
  formData.set("search_term", hash);

  const response = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: {
      "Auth-Key": ABUSECH_AUTH_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
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

async function proxyURLhaus(hash: string): Promise<Response> {
  if (!ABUSECH_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSECH_AUTH_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const formData = new URLSearchParams();
  formData.set("query", "get_file_info");
  formData.set("sha256_hash", hash);

  const response = await fetch("https://urlhaus-api.abuse.ch/v1/", {
    method: "POST",
    headers: {
      "Auth-Key": ABUSECH_AUTH_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
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

async function handleHealthCheck(source: string): Promise<Response> {
  const checks: Record<string, { available: boolean; error?: string; requiresConfiguration: boolean; configNote?: string }> = {
    malwarebazaar: { available: !!ABUSECH_AUTH_KEY, requiresConfiguration: !ABUSECH_AUTH_KEY, configNote: ABUSECH_AUTH_KEY ? undefined : "ABUSECH_AUTH_KEY secret required" },
    virustotal: { available: !!VIRUSTOTAL_API_KEY, requiresConfiguration: !VIRUSTOTAL_API_KEY, configNote: VIRUSTOTAL_API_KEY ? undefined : "VIRUSTOTAL_API_KEY secret required" },
    otx: { available: !!OTX_API_KEY, requiresConfiguration: !OTX_API_KEY, configNote: OTX_API_KEY ? undefined : "OTX_API_KEY secret required" },
    threatfox: { available: !!ABUSECH_AUTH_KEY, requiresConfiguration: !ABUSECH_AUTH_KEY, configNote: ABUSECH_AUTH_KEY ? undefined : "ABUSECH_AUTH_KEY secret required" },
    urlhaus: { available: !!ABUSECH_AUTH_KEY, requiresConfiguration: !ABUSECH_AUTH_KEY, configNote: ABUSECH_AUTH_KEY ? undefined : "ABUSECH_AUTH_KEY secret required" },
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

  let payload: { source?: string; hash?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { source, hash } = payload;

  if (!source || !hash) {
    return new Response(
      JSON.stringify({ error: "Missing source or hash" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  try {
    if (source === "malwarebazaar") {
      return proxyMalwareBazaar(hash);
    }

    if (source === "virustotal") {
      return proxyVirusTotal(hash);
    }

    if (source === "otx") {
      return proxyOTX(hash);
    }

    if (source === "threatfox") {
      return proxyThreatFox(hash);
    }

    if (source === "urlhaus") {
      return proxyURLhaus(hash);
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