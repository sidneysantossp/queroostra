import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

const schema = z.object({
  title: z.string().min(1),
  subtitle: z.string().min(1),
  institutional: z.string(),
  seoTitle: z.string(),
  seoDescription: z.string(),
  heroImage: z.string().optional(),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ content: null, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const { data } = await context.supabase
    .from("site_content")
    .select("content_value, published")
    .eq("content_key", "home")
    .maybeSingle();
  return NextResponse.json({ content: data?.content_value ?? null, published: data?.published ?? false });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Conteúdo inválido." }, { status: 400 });
  const { error } = await context.supabase.from("site_content").upsert(
    {
      content_key: "home",
      content_value: parsed.data,
      published: true,
      updated_by: context.user.id,
    },
    { onConflict: "content_key" },
  );
  if (error) return NextResponse.json({ error: "Falha ao publicar conteúdo." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
