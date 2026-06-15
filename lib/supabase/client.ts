"use client";

import { createBrowserClient } from "@supabase/ssr";
import { getSupabasePublicKey, supabaseConfigured } from "@/lib/supabase/config";

export function createClient() {
  if (!supabaseConfigured) return null;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    getSupabasePublicKey(),
  );
}
