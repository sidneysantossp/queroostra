import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  items: z.array(
    z.object({
      id: z.string().min(1),
      quantity: z.number().int().min(1).max(50),
    }),
  ),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Carrinho inválido." }, { status: 400 });
  }

  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ synced: false, demo: true });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  }

  let { data: cart } = await supabase
    .from("carts")
    .select("id")
    .eq("user_id", authData.user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!cart) {
    const created = await supabase
      .from("carts")
      .insert({ user_id: authData.user.id, status: "active" })
      .select("id")
      .single();
    if (created.error) {
      return NextResponse.json({ error: "Não foi possível sincronizar o carrinho." }, { status: 500 });
    }
    cart = created.data;
  }

  const keys = parsed.data.items.map((item) => item.id);
  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id, external_key")
    .in("external_key", keys)
    .eq("active", true);
  if (productError) {
    return NextResponse.json({ error: "Não foi possível localizar os produtos." }, { status: 500 });
  }

  const productMap = new Map(
    (productRows ?? []).map((product) => [product.external_key, product.id]),
  );
  await supabase.from("cart_items").delete().eq("cart_id", cart.id);
  const rows = parsed.data.items
    .filter((item) => productMap.has(item.id))
    .map((item) => ({
      cart_id: cart.id,
      product_id: productMap.get(item.id),
      quantity: item.quantity,
    }));

  if (rows.length > 0) {
    const { error } = await supabase.from("cart_items").insert(rows);
    if (error) {
      return NextResponse.json({ error: "Não foi possível salvar os itens." }, { status: 500 });
    }
  }

  return NextResponse.json({ synced: true, count: rows.length });
}
