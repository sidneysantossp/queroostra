import { createClient } from "@/lib/supabase/server";

export async function getAdminContext() {
  const supabase = await createClient();
  if (!supabase) return { configured: false as const, supabase: null, user: null };

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return { configured: true as const, supabase, user: null };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", authData.user.id)
    .single();
  if (profile?.role !== "admin") {
    return { configured: true as const, supabase, user: null };
  }

  return { configured: true as const, supabase, user: authData.user };
}
