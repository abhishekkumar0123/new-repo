/**
 * Optional Supabase Edge Function proxy for public feeds that do not send
 * Access-Control-Allow-Origin (CISA KEV, CISA advisories RSS, Exploit-DB RSS).
 * The proxy only accepts allowlisted source identifiers; the browser never
 * supplies an arbitrary URL and no private credential is embedded in this code.
 */
export type ZeroDayProxySource = "cisa-kev" | "cisa-advisories" | "exploit-db";

const ALLOWED_SOURCES: ReadonlySet<string> = new Set([
  "cisa-kev",
  "cisa-advisories",
  "exploit-db",
]);

const MAX_RESPONSE_BYTES = 8 * 1024 * 1024;
const PROXY_TIMEOUT_MS = 25000;

const PROXY_URL =
  typeof process !== "undefined" && process.env
    ? (process.env.NEXT_PUBLIC_ZERO_DAY_PROXY_URL as string | undefined)
    : undefined;

export function getZeroDayProxyUrl(): string | undefined {
  if (!PROXY_URL) return undefined;
  try {
    const parsed = new URL(PROXY_URL);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return undefined;
    return parsed.toString();
  } catch {
    return undefined;
  }
}

export function isZeroDayProxyConfigured(): boolean {
  return Boolean(getZeroDayProxyUrl());
}

export async function fetchZeroDayProxyResource(
  source: ZeroDayProxySource,
  signal?: AbortSignal,
): Promise<{ text: string; fetchedAt: string }> {
  if (!ALLOWED_SOURCES.has(source)) {
    throw new Error(`Unsupported proxy source: ${source}`);
  }

  const proxyUrl = getZeroDayProxyUrl();
  if (!proxyUrl) {
    throw new Error(
      "Zero-day feed proxy is not configured (NEXT_PUBLIC_ZERO_DAY_PROXY_URL)",
    );
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PROXY_TIMEOUT_MS);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  try {
    const response = await fetch(proxyUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ source }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Proxy returned HTTP ${response.status}`);
    }

    const payload = (await response.json()) as {
      ok?: boolean;
      text?: string;
      data?: unknown;
      source?: string;
      error?: string;
      fetchedAt?: string;
    };

    if (payload.source && payload.source !== source) {
      throw new Error("Proxy returned unexpected source");
    }
    if (!payload.ok) {
      throw new Error(payload.error ?? "Proxy did not return feed content");
    }

    const text =
      typeof payload.text === "string"
        ? payload.text
        : payload.data !== undefined
          ? JSON.stringify(payload.data)
          : null;
    if (!text || text.length > MAX_RESPONSE_BYTES) {
      throw new Error("Proxy returned empty or oversized content");
    }

    return {
      text,
      fetchedAt: payload.fetchedAt ?? new Date().toISOString(),
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Feed request timed out");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }
}
