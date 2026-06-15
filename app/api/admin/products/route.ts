import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";
import type { ProductRecord } from "@/lib/domain";

const productSchema = z.object({
  id: z.uuid(),
  externalKey: z.string().optional(),
  slug: z.string().min(1),
  name: z.string().min(1),
  shortDescription: z.string(),
  fullDescription: z.string(),
  type: z.enum(["fresh", "gratinated", "beverage"]),
  category: z.string(),
  price: z.number().min(0),
  promotionalPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0),
  active: z.boolean(),
  featured: z.boolean(),
  image: z.string().optional(),
  includedItems: z.array(z.string()),
  preparationHours: z.number().int().min(0),
  approximateVolume: z.string().optional(),
  displayOrder: z.number().int(),
});

const listSchema = z.object({ products: z.array(productSchema) });

function mapProduct(row: Record<string, unknown>): ProductRecord {
  const images = Array.isArray(row.product_images)
    ? (row.product_images as { storage_path: string; is_primary: boolean }[])
    : [];
  const category = row.product_categories as
    | { name?: string }
    | { name?: string }[]
    | null
    | undefined;
  const categoryName = Array.isArray(category)
    ? category[0]?.name
    : category?.name;
  return {
    id: String(row.id),
    externalKey: row.external_key ? String(row.external_key) : undefined,
    slug: String(row.slug),
    name: String(row.title),
    shortDescription: String(row.short_description ?? ""),
    fullDescription: String(row.full_description ?? ""),
    type: row.product_type as ProductRecord["type"],
    category: String(row.category_id ?? ""),
    categoryName: categoryName ? String(categoryName) : undefined,
    price: Number(row.price),
    promotionalPrice:
      row.promotional_price === null || row.promotional_price === undefined
        ? undefined
        : Number(row.promotional_price),
    stock: Number(row.stock),
    active: Boolean(row.active),
    featured: Boolean(row.featured),
    image: images.find((image) => image.is_primary)?.storage_path,
    includedItems: Array.isArray(row.included_items)
      ? (row.included_items as string[])
      : [],
    preparationHours: Number(row.preparation_hours),
    approximateVolume: row.approximate_volume
      ? String(row.approximate_volume)
      : undefined,
    displayOrder: Number(row.display_order),
  };
}

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ products: [], demo: true });
  if (!context.user) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from("products")
    .select("*, product_images(storage_path, is_primary), product_categories(name)")
    .order("display_order");
  if (error) {
    return NextResponse.json({ error: "Não foi possível carregar os produtos." }, { status: 500 });
  }
  return NextResponse.json({ products: (data ?? []).map((row) => mapProduct(row)) });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const parsed = listSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Catálogo inválido." }, { status: 400 });
  }

  const rows = parsed.data.products.map((product) => ({
    id: product.id,
    external_key: product.externalKey ?? product.slug,
    title: product.name,
    slug: product.slug,
    short_description: product.shortDescription,
    full_description: product.fullDescription,
    product_type: product.type,
    included_items: product.includedItems,
    price: product.price,
    promotional_price: product.promotionalPrice ?? null,
    stock: product.stock,
    active: product.active,
    featured: product.featured,
    preparation_hours: product.preparationHours,
    approximate_volume: product.approximateVolume ?? null,
    display_order: product.displayOrder,
  }));
  const { error } = await context.supabase
    .from("products")
    .upsert(rows, { onConflict: "id" });
  if (error) {
    return NextResponse.json({ error: "Não foi possível salvar o catálogo." }, { status: 500 });
  }

  for (const product of parsed.data.products) {
    if (!product.image) continue;
    await context.supabase
      .from("product_images")
      .delete()
      .eq("product_id", product.id)
      .eq("is_primary", true);
    await context.supabase.from("product_images").insert({
      product_id: product.id,
      storage_path: product.image,
      alt_text: product.name,
      is_primary: true,
      display_order: 0,
    });
  }

  const incomingIds = rows.map((row) => row.id);
  if (incomingIds.length > 0) {
    await context.supabase.from("products").delete().not("id", "in", `(${incomingIds.join(",")})`);
  }
  await context.supabase.from("audit_logs").insert({
    actor_id: context.user.id,
    action: "products.catalog.saved",
    entity_type: "product",
    new_data: { count: rows.length },
  });

  return NextResponse.json({ saved: true });
}
