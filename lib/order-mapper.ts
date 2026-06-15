import { products } from "@/lib/catalog";
import type { CreatedOrder, PaymentMethod, PaymentStatus, OrderStatus } from "@/lib/domain";

type StoredOrder = {
  id: string;
  order_number: string;
  created_at: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  payment_method: PaymentMethod;
  payment_id?: string | null;
  customer_snapshot: CreatedOrder["customer"];
  address_snapshot: CreatedOrder["address"];
  items_subtotal: number | string;
  delivery_fee: number | string;
  discount: number | string;
  total: number | string;
  delivery_window: string;
  notes?: string | null;
  order_items?: {
    product_id?: string | null;
    product_name: string;
    quantity: number;
    unit_price: number | string;
    addons: CreatedOrder["items"][number]["addons"];
    subtotal: number | string;
  }[];
  order_dates?: { delivery_date: string }[];
  payments?: {
    provider_payment_id?: string | null;
    invoice_url?: string | null;
    pix_copy_paste?: string | null;
  }[];
};

export function mapStoredOrder(row: StoredOrder): CreatedOrder {
  const payment = row.payments?.[0];
  return {
    id: row.id,
    number: row.order_number,
    createdAt: row.created_at,
    status: row.status,
    paymentStatus: row.payment_status,
    paymentMethod: row.payment_method,
    paymentId: payment?.provider_payment_id ?? row.payment_id ?? undefined,
    invoiceUrl: payment?.invoice_url ?? undefined,
    pixCopyPaste: payment?.pix_copy_paste ?? undefined,
    items: (row.order_items ?? []).map((item) => {
      const product = products.find(
        (candidate) =>
          candidate.id === item.product_id || candidate.name === item.product_name,
      );
      return {
        id: item.product_id ?? item.product_name,
        name: item.product_name,
        description: product?.shortDescription ?? item.product_name,
        image: product?.image,
        quantity: item.quantity,
        unitPrice: Number(item.unit_price),
        addons: item.addons ?? [],
        subtotal: Number(item.subtotal),
      };
    }),
    dates: (row.order_dates ?? [])
      .map((date) => date.delivery_date)
      .sort(),
    deliveryWindow: row.delivery_window,
    customer: row.customer_snapshot,
    address: row.address_snapshot,
    totals: {
      itemsSubtotal: Number(row.items_subtotal),
      deliveryFeePerDate:
        Number(row.delivery_fee) /
        Math.max(1, row.order_dates?.length ?? 1),
      deliveryFees: Number(row.delivery_fee),
      discount: Number(row.discount),
      dateMultiplier: Math.max(1, row.order_dates?.length ?? 1),
      total: Number(row.total),
    },
    notes: row.notes ?? undefined,
  };
}
