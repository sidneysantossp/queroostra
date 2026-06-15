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

  const products: ProductRecord[] = (data ?? []).map((row) => ({
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
    image: row.product_images?.find(
      (image: { is_primary: boolean }) => image.is_primary,
    )?.storage_path,
    includedItems: row.included_items ?? [],
    preparationHours: row.preparation_hours,
    approximateVolume: row.approximate_volume ?? undefined,
    displayOrder: row.display_order,
  }));
  return NextResponse.json(
    { products },
    { headers: { "Cache-Control": "no-store, max-age=0" } },
  );
}
