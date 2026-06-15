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

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ orders: [], demo: true });

  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) {
    return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("orders")
    .select(orderSelect)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Não foi possível carregar os pedidos." }, { status: 500 });
  }

  return NextResponse.json({ orders: (data ?? []).map((row) => mapStoredOrder(row)) });
}
