import { createSupabaseServer } from "@/lib/supabase/server";

export async function getAuthenticatedAdmin() {
  const supabase = await createSupabaseServer();
  if (!supabase) return { supabase: null, user: null, administrator: null };

  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { supabase, user: null, administrator: null };

  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || data.user.email?.toLowerCase() !== adminEmail) {
    return { supabase, user: data.user, administrator: null };
  }

  return {
    supabase,
    user: data.user,
    administrator: {
      user_id: data.user.id,
      email: adminEmail,
      role: "admin",
    },
  };
}
