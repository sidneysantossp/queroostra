import { NextResponse } from "next/server";
import { products as fallbackProducts } from "@/lib/catalog";
import type { ProductRecord } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ products: fallbackProducts, demo: true });
  const { data, error } = await admin
    .from("products")
    .select("*, product_images(storage_path, is_primary)")
    .eq("active", true)
    .order("display_order");
  if (error) return NextResponse.json({ products: fallbackProducts, fallback: true });

  const products: ProductRecord[] = (data ?? []).map((row) => {
    const sortedMedia = [...(row.product_images ?? [])].sort(
      (a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order,
    );
    const primaryImage = sortedMedia.find(
      (image: { is_primary: boolean }) => image.is_primary,
    );
    let imageUrl: string | undefined;
    if (primaryImage?.storage_path) {
      if (primaryImage.storage_path.startsWith("http")) {
        imageUrl = primaryImage.storage_path;
      } else {
        const { data } = admin.storage.from("products").getPublicUrl(primaryImage.storage_path);
        imageUrl = data.publicUrl;
      }
    }
    return {
      id: row.external_key ?? row.id,
      externalKey: row.external_key ?? undefined,
      slug: row.slug,
      name: row.title,
      shortDescription: row.short_description ?? "",
      fullDescription: row.full_description ?? "",
      type: row.product_type,
      category: row.category_id ?? "",
      price: Number(row.price),
      promotionalPrice:
        row.promotional_price === null ? undefined : Number(row.promotional_price),
      stock: row.stock,
      active: row.active,
      featured: row.featured,
      image: imageUrl,
      media: sortedMedia
        .filter((media: { is_primary: boolean }) => !media.is_primary)
        .map((media: { id: string; storage_path: string; media_type?: "image" | "video"; mime_type?: string; poster_path?: string; alt_text?: string; display_order: number }) => {
          const publicUrl = media.storage_path.startsWith("http")
            ? media.storage_path
            : admin.storage.from("products").getPublicUrl(media.storage_path).data.publicUrl;
          return {
            id: media.id,
            url: publicUrl,
            type: media.media_type ?? "image",
            mimeType: media.mime_type ?? undefined,
            posterUrl: media.poster_path ?? undefined,
            alt: media.alt_text ?? undefined,
            displayOrder: media.display_order,
          };
        }),
      includedItems: row.included_items ?? [],
      preparationHours: row.preparation_hours,
      approximateVolume: row.approximate_volume ?? undefined,
      displayOrder: row.display_order,
      seoTitle: row.seo_title ?? undefined,
      seoDescription: row.seo_description ?? undefined,
    };
  });
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
