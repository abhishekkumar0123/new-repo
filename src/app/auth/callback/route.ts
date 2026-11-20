import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const next = requestUrl.searchParams.get("next") || "/admin";

  if (code) {
    const supabase = await createSupabaseServer();
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/admin";
        return NextResponse.redirect(new URL(safeNext, requestUrl.origin));
      }
    }
  }

  const loginUrl = new URL("/admin/login", requestUrl.origin);
  loginUrl.searchParams.set("error", "invalid_recovery_link");
  return NextResponse.redirect(loginUrl);
}
