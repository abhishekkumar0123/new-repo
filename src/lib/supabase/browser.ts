import { createBrowserClient } from "@supabase/ssr";

export function getSupabaseConfigError() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is missing.";
  if (!key) return "NEXT_PUBLIC_SUPABASE_ANON_KEY is missing.";

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
      return "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.";
    }
  } catch {
    return "NEXT_PUBLIC_SUPABASE_URL must be a valid HTTP(S) URL.";
  }

  if (/^(your-|replace-|placeholder)/i.test(key)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is still a placeholder.";
  }

  return null;
}

export function createSupabaseBrowser() {
  if (getSupabaseConfigError()) return null;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim();
  return createBrowserClient(url, key);
}
