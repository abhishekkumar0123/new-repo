import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

async function proxyThreatfox(body: unknown): Promise<Response> {
  if (!ABUSECH_AUTH_KEY) {
    return new Response(
      JSON.stringify({ error: "ABUSECH_AUTH_KEY not configured on server" }),
      { status: 500, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const response = await fetch("https://threatfox-api.abuse.ch/api/v1/", {
    method: "POST",
    headers: {
      "Auth-Key": ABUSECH_AUTH_KEY,
      "Content-Type": "application/json",
      Accept: "application/json",
      "User-Agent": "abhishek-cybersecurity-portfolio/1.0",
    },
    body: JSON.stringify(body),
  });

  const responseBody = await response.text();
  return new Response(responseBody, {
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

  let payload: { source?: string; path?: string; query?: Record<string, string>; body?: unknown };
  try {
    payload = await req.json();
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const { source, path, query, body } = payload;

  if (source === "urlhaus") {
    const queryParams = new URLSearchParams(query ?? {});
    return proxyUrlhaus(path ?? "urls/recent/", queryParams);
  }

  if (source === "threatfox") {
    return proxyThreatfox(body ?? {});
  }

  return new Response(
    JSON.stringify({ error: "Unknown or missing source" }),
    { status: 400, headers: { ...CORS_HEADERS, "Content-Type": "application/json" } },
  );
});
