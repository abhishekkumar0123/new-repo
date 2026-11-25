import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

const VIRUSTOTAL_API_KEY = Deno.env.get("VIRUSTOTAL_API_KEY");
const OTX_API_KEY = Deno.env.get("OTX_API_KEY");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

async function proxyCrtSh(hostname: string): Promise<Response> {
  const url = new URL("https://crt.sh/");
  url.searchParams.set("q", `%.${hostname}`);
  url.searchParams.set("output", "json");

  const response = await fetch(url.toString(), {
    headers: {
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

async function proxyCrtShFingerprint(fingerprint: string): Promise<Response> {
  const url = new URL("https://crt.sh/");
  url.searchParams.set("q", fingerprint);
  url.searchParams.set("output", "json");

  const response = await fetch(url.toString(), {
    headers: {
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

async function proxyVirusTotalCert(hostname: string): Promise<Response> {
  if (!VIRUSTOTAL_API_KEY) {
    return new Response(
      JSON.stringify({ error: "VIRUSTOTAL_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://www.virustotal.com/api/v3/domains/${hostname}/ssl_certificates`, {
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

async function proxyOTXCert(hostname: string): Promise<Response> {
  if (!OTX_API_KEY) {
    return new Response(
      JSON.stringify({ error: "OTX_API_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch(`https://otx.alienvault.com/api/v1/indicators/domain/${hostname}/passive_dns`, {
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

async function handleHealthCheck(source: string): Promise<Response> {
  const checks: Record<string, { available: boolean; error?: string; requiresConfiguration: boolean; configNote?: string }> = {
    crtsh: { available: true, requiresConfiguration: false },
    virustotal: { available: !!VIRUSTOTAL_API_KEY, requiresConfiguration: !VIRUSTOTAL_API_KEY, configNote: VIRUSTOTAL_API_KEY ? undefined : "VIRUSTOTAL_API_KEY secret required" },
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

  let payload: { source?: string; hostname?: string; fingerprint?: string };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { source, hostname, fingerprint } = payload;

  if (!source || (!hostname && !fingerprint)) {
    return new Response(
      JSON.stringify({ error: "Missing source or hostname/fingerprint" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  try {
    if (source === "crtsh") {
      if (fingerprint) {
        return proxyCrtShFingerprint(fingerprint);
      }
      return proxyCrtSh(hostname!);
    }

    if (source === "virustotal") {
      return proxyVirusTotalCert(hostname!);
    }

    if (source === "otx") {
      return proxyOTXCert(hostname!);
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