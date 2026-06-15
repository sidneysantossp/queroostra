import { NextResponse } from "next/server";
import { getAdminContext } from "@/lib/admin-auth";
import { mapStoredOrder } from "@/lib/order-mapper";

const orderSelect = `
  id, order_number, created_at, status, payment_status, payment_method,
  payment_id, customer_snapshot, address_snapshot, items_subtotal,
  delivery_fee, discount, total, delivery_window, notes,
  order_items(product_id, product_name, quantity, unit_price, addons, subtotal),
  order_dates(delivery_date),
  payments(provider_payment_id, invoice_url, pix_copy_paste)
`;

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ orders: [], demo: true });
  if (!context.user) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const { data, error } = await context.supabase
    .from("orders")
    .select(orderSelect)
    .order("created_at", { ascending: false });
  if (error) {
    return NextResponse.json({ error: "Não foi possível carregar os pedidos." }, { status: 500 });
  }
  return NextResponse.json({ orders: (data ?? []).map((row) => mapStoredOrder(row)) });
}
