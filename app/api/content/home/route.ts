import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 60;

export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ content: null, demo: true });
  const { data } = await admin
    .from("site_content")
    .select("content_value")
    .eq("content_key", "home")
    .eq("published", true)
    .maybeSingle();
  return NextResponse.json({ content: data?.content_value ?? null });
}
