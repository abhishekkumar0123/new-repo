"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { withBasePath } from "@/lib/base-path";

export default function AuthCallbackPage() {
  const [error, setError] = useState("");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      setError("Supabase is not configured.");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const next = params.get("next") || "/admin";

    void (async () => {
      if (code) {
        const { error: exchangeError } =
          await supabase.auth.exchangeCodeForSession(code);
        if (!exchangeError) {
          window.location.replace(
            withBasePath(
              next.startsWith("/") && !next.startsWith("//") ? next : "/admin",
            ),
          );
          return;
        }
      }

      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        if (!sessionError) {
          window.location.replace(
            withBasePath(
              next.startsWith("/") && !next.startsWith("//") ? next : "/admin",
            ),
          );
          return;
        }
      }

      window.location.replace(
        withBasePath("/admin/login?error=invalid_recovery_link"),
      );
    })();
  }, []);

  return (
    <main className="grid min-h-screen place-items-center font-mono text-xs text-[#77847e]">
      Completing secure authentication...
    </main>
  );
}
