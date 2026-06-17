import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

const schema = z.object({
  whatsappSupport: z.string().min(10, "Informe um WhatsApp válido"),
  instagramUrl: z.string().optional(),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) {
    return NextResponse.json({ whatsappSupport: "", instagramUrl: "", demo: true });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  const { data } = await context.supabase
    .from("site_content")
    .select("content_value")
    .eq("content_key", "general_settings")
    .maybeSingle();
  const settings = (data?.content_value ?? {}) as Record<string, string>;
  return NextResponse.json({
    whatsappSupport: settings.whatsappSupport ?? "",
    instagramUrl: settings.instagramUrl ?? "",
  });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) {
    return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
  }
  const { error } = await context.supabase.from("site_content").upsert(
    {
      content_key: "general_settings",
      content_value: parsed.data,
      published: true,
      updated_by: context.user.id,
    },
    { onConflict: "content_key" },
  );
  if (error) {
    return NextResponse.json({ error: "Falha ao salvar configurações." }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
