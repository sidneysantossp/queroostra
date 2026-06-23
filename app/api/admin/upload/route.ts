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
  const scope = form.get("scope") === "product" ? "product" : "content";
  const isImage = file instanceof File && file.type.startsWith("image/");
  const isVideo = file instanceof File && file.type.startsWith("video/");
  if (!(file instanceof File) || (!isImage && !isVideo)) {
    return NextResponse.json({ error: "Envie uma imagem ou vídeo válido." }, { status: 400 });
  }
  const maximumSize = isVideo ? 80 * 1024 * 1024 : 8 * 1024 * 1024;
  if (file.size > maximumSize) {
    return NextResponse.json({ error: isVideo ? "O vídeo deve ter até 80 MB." : "A imagem deve ter até 8 MB." }, { status: 413 });
  }

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Storage indisponível." }, { status: 503 });
  const extension = file.name.split(".").pop()?.toLowerCase() || "webp";
  const bucket = scope === "product" ? "products" : "site-assets";
  const path = `${scope === "product" ? "gallery" : "content"}/${crypto.randomUUID()}.${extension}`;
  const { error } = await admin.storage
    .from(bucket)
    .upload(path, await file.arrayBuffer(), {
      contentType: file.type,
      upsert: false,
    });
  if (error) return NextResponse.json({ error: "Falha ao enviar imagem." }, { status: 500 });
  const { data } = admin.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, path, type: isVideo ? "video" : "image", mimeType: file.type });
}
