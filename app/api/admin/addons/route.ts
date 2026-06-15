import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

const addonSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  description: z.string(),
  price: z.number().min(0),
  stock: z.number().int().min(0),
  active: z.boolean(),
  productIds: z.array(z.string()),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ addons: [], demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const [{ data, error }, { data: links }] = await Promise.all([
    context.supabase
      .from("product_addons")
      .select("id, external_key, name, description, price, stock, active, global")
      .order("name"),
    context.supabase
      .from("product_addon_links")
      .select("addon_id, products(external_key)"),
  ]);
  if (error) return NextResponse.json({ error: "Falha ao carregar adicionais." }, { status: 500 });

  return NextResponse.json({
    addons: (data ?? []).map((item) => ({
      id: item.external_key ?? item.id,
      name: item.name,
      description: item.description ?? "",
      price: Number(item.price),
      stock: item.stock,
      active: item.active,
      productIds: (links ?? [])
        .filter((link) => link.addon_id === item.id)
        .map((link) => {
          const product = Array.isArray(link.products)
            ? link.products[0]
            : link.products;
          return product?.external_key;
        })
        .filter(Boolean),
    })),
  });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const parsed = z.object({ addons: z.array(addonSchema) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });

  const rows = parsed.data.addons.map((item) => ({
    id: z.string().uuid().safeParse(item.id).success ? item.id : crypto.randomUUID(),
    external_key: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    stock: item.stock,
    active: item.active,
    global: item.productIds.length === 0,
  }));
  const { error } = await context.supabase
    .from("product_addons")
    .upsert(rows, { onConflict: "external_key" });
  if (error) return NextResponse.json({ error: "Falha ao salvar adicionais." }, { status: 500 });

  const { data: savedAddons } = await context.supabase
    .from("product_addons")
    .select("id, external_key")
    .in("external_key", parsed.data.addons.map((item) => item.id));
  const productKeys = [...new Set(parsed.data.addons.flatMap((item) => item.productIds))];
  const { data: savedProducts } = productKeys.length
    ? await context.supabase
        .from("products")
        .select("id, external_key")
        .in("external_key", productKeys)
    : { data: [] };
  const addonIdMap = new Map((savedAddons ?? []).map((item) => [item.external_key, item.id]));
  const productIdMap = new Map((savedProducts ?? []).map((item) => [item.external_key, item.id]));
  const addonDatabaseIds = [...addonIdMap.values()];
  if (addonDatabaseIds.length > 0) {
    await context.supabase
      .from("product_addon_links")
      .delete()
      .in("addon_id", addonDatabaseIds);
    const linkRows = parsed.data.addons.flatMap((item) =>
      item.productIds
        .filter((productId) => addonIdMap.has(item.id) && productIdMap.has(productId))
        .map((productId) => ({
          addon_id: addonIdMap.get(item.id),
          product_id: productIdMap.get(productId),
        })),
    );
    if (linkRows.length > 0) {
      await context.supabase.from("product_addon_links").insert(linkRows);
    }
  }

  await context.supabase.from("audit_logs").insert({
    actor_id: context.user.id,
    action: "addons.catalog.saved",
    entity_type: "product_addon",
    new_data: { count: rows.length },
  });
  return NextResponse.json({ saved: true });
}
