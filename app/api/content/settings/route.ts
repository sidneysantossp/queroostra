import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({
      whatsappSupport: "",
      instagramUrl: "",
    });
  }
  const { data } = await admin
    .from("site_content")
    .select("content_value")
    .eq("content_key", "general_settings")
    .eq("published", true)
    .maybeSingle();
  const settings = (data?.content_value ?? {}) as Record<string, string>;
  return NextResponse.json(
    {
      whatsappSupport: settings.whatsappSupport ?? "",
      instagramUrl: settings.instagramUrl ?? "",
    },
    {
      headers: {
        "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
      },
    },
  );
}
