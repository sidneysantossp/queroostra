import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File) || !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Envie uma imagem válida." }, { status: 400 });
  }
  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "A imagem deve ter até 5 MB." }, { status: 413 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Storage indisponível." }, { status: 503 });
  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const path = `content/${crypto.randomUUID()}.${extension}`;
  const { error } = await admin.storage
    .from("site-assets")
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (error) return NextResponse.json({ error: "Falha ao enviar imagem." }, { status: 500 });
  const { data } = admin.storage.from("site-assets").getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path });
}
