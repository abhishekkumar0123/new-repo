import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const VIRUSTOTAL_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const ABUSECH_AUTH_KEY = Deno.env.get("ABUSECH_AUTH_KEY");
const OTX_API_KEY = Deno.env.get("OTX_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function proxyVirusTotalDomain(domain: string): Promise<Response> {
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://www.virustotal.com/api/v3/domains/${domain}`, {
    headers: {
      "x-apikey": VIRUSTOTAL_API_KEY,
      "Accept": "application/json",
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

async function proxyUrlhausHost(domain: string): Promise<Response> {
  if (!ABUSECH_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSECH_AUTH_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://urlhaus-api.abuse.ch/v1/host/`, {
    method: "POST",
    headers: {
      "Auth-Key": ABUSECH_AUTH_KEY,
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
    body: `host=${encodeURIComponent(domain)}`,
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

async function proxyOTXDomain(domain: string): Promise<Response> {
  if (!OTX_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OTX_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${domain}/general`, {
    headers: {
      "X-OTX-API-KEY": OTX_API_KEY,
      "Accept": "application/json",
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  let payload: { source?: string; domain?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { source, domain } = payload;

  if (!domain) {
    return new Response(
      JSON.stringify({ error: "Domain is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  switch (source) {
    case "virustotal":
      return proxyVirusTotalDomain(domain);
    case "urlhaus":
      return proxyUrlhausHost(domain);
    case "otx":
      return proxyOTXDomain(domain);
    default:
      return new Response(
        JSON.stringify({ error: "Unknown or missing source" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
  }
});