import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const ABUSEIPDB_API_KEY = Deno.env.get("ABUSEIPDB_API_KEY");
const VIRUSTOTAL_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const GREYNOISE_API_KEY = Deno.env.get("GREYNOISE_API_KEY");
const IPINFO_API_KEY = Deno.env.get("IPINFO_API_KEY");
const OTX_API_KEY = Deno.env.get("OTX_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function proxyAbuseIPDB(ip: string, maxAgeInDays = 30, verbose = false): Promise<Response> {
  if (!ABUSEIPDB_API_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSEIPDB_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const url = new URL("https://api.abuseipdb.com/api/v2/check");
  url.searchParams.set("ipAddress", ip);
  url.searchParams.set("maxAgeInDays", String(maxAgeInDays));
  url.searchParams.set("verbose", String(verbose));

  const response = await fetch(url.toString(), {
    headers: {
      "Key": ABUSEIPDB_API_KEY,
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

async function proxyVirusTotal(ip: string): Promise<Response> {
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://www.virustotal.com/api/v3/ip_addresses/${ip}`, {
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

async function proxyGreyNoise(ip: string): Promise<Response> {
  if (!GREYNOISE_API_KEY) {
    return new Response(
      JSON.stringify({ error: "GREYNOISE_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://api.greynoise.io/v3/community/${ip}`, {
    headers: {
      "key": GREYNOISE_API_KEY,
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

async function proxyIPinfo(ip: string): Promise<Response> {
  if (!IPINFO_API_KEY) {
    return new Response(
      JSON.stringify({ error: "IPINFO_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://api.ipinfo.io/lite/${ip}`, {
    headers: {
      "Authorization": `Bearer ${IPINFO_API_KEY}`,
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

async function proxyOTX(ip: string): Promise<Response> {
  if (!OTX_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OTX_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/IPv4/${ip}/general`, {
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

  let payload: { source?: string; ip?: string; params?: Record<string, unknown> };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { source, ip, params } = payload;

  if (!ip) {
    return new Response(
      JSON.stringify({ error: "IP address is required" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  switch (source) {
    case "abuseipdb":
      return proxyAbuseIPDB(
        ip,
        (params?.maxAgeInDays as number) ?? 30,
        (params?.verbose as boolean) ?? false,
      );
    case "virustotal":
      return proxyVirusTotal(ip);
    case "greynoise":
      return proxyGreyNoise(ip);
    case "ipinfo":
      return proxyIPinfo(ip);
    case "otx":
      return proxyOTX(ip);
    default:
      return new Response(
        JSON.stringify({ error: "Unknown or missing source" }),
        { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
      );
  }
});