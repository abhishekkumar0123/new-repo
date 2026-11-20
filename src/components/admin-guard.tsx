"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { withBasePath } from "@/lib/base-path";

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    if (!supabase) {
      window.location.replace(withBasePath("/admin/login"));
      return;
    }

    void supabase.auth.getUser().then(async ({ data, error }) => {
      if (error || !data.user) {
        window.location.replace(withBasePath("/admin/login"));
        return;
      }
      const administratorEmail = "abhishekkumar.ak0123@gmail.com";
      const signedInEmail = data.user.email?.trim().toLowerCase() ?? "";

      if (signedInEmail === administratorEmail) {
        setAllowed(true);
        return;
      }

      const { data: authorized, error: rpcError } =
        await supabase.rpc("is_admin");
      if (!rpcError && authorized === true) {
        setAllowed(true);
        return;
      }

      const { data: administrator, error: adminError } = await supabase
        .from("admin_users")
        .select("role")
        .eq("user_id", data.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (adminError || !administrator) {
        window.location.replace(withBasePath("/admin/login?unauthorized=1"));
        return;
      }

      setAllowed(true);
    });
  }, []);

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center font-mono text-xs text-[#77847e]">
        Checking administrator access...
      </div>
    );
  }
  return children;
}
