import { NextResponse } from "next/server";
import { mapStoredOrder } from "@/lib/order-mapper";
import { createClient } from "@/lib/supabase/server";

const orderSelect = `
  id, order_number, created_at, status, payment_status, payment_method,
  payment_id, customer_snapshot, address_snapshot, items_subtotal,
  delivery_fee, discount, total, delivery_window, notes,
  order_items(product_id, product_name, quantity, unit_price, addons, subtotal),
  order_dates(delivery_date),
  payments(provider_payment_id, invoice_url, pix_copy_paste)
`;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase não configurado." }, { status: 503 });
  }

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .eq("id", id)
    .single();
  if (error || !data) {
    return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  }

  return NextResponse.json({ order: mapStoredOrder(data) });
}
