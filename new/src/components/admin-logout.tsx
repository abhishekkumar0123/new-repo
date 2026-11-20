"use client";

import { createSupabaseBrowser } from "@/lib/supabase/browser";
import { LogOut } from "lucide-react";

export function AdminLogout() {
  async function logout() {
    const supabase = createSupabaseBrowser();
    if (supabase) await supabase.auth.signOut();
    window.location.href = "/admin/login";
  }
  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-2 font-mono text-[10px] text-[#77847e] hover:text-[#ff7b72]"
    >
      <LogOut size={14} />
      Logout
    </button>
  );
}
