import type { SupabaseClient } from "@supabase/supabase-js";

export type CouponRecord = {
  id: string;
  code: string;
  discountType: "fixed" | "percentage";
  discountValue: number;
  minimumOrder: number;
  usageLimit?: number;
  usedCount: number;
  startsAt?: string;
  endsAt?: string;
  active: boolean;
};

type CouponRow = {
  id: string;
  code: string;
  discount_type: "fixed" | "percentage";
  discount_value: number | string;
  minimum_order: number | string;
  usage_limit: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
};

export function mapCoupon(row: CouponRow): CouponRecord {
  return {
    id: row.id,
    code: row.code,
    discountType: row.discount_type,
    discountValue: Number(row.discount_value),
    minimumOrder: Number(row.minimum_order),
    usageLimit: row.usage_limit ?? undefined,
    usedCount: row.used_count,
    startsAt: row.starts_at ?? undefined,
    endsAt: row.ends_at ?? undefined,
    active: row.active,
  };
}

export function normalizeCouponCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, "");
}

export function calculateCouponDiscount(coupon: CouponRecord, itemsSubtotal: number) {
  const rawDiscount =
    coupon.discountType === "percentage"
      ? itemsSubtotal * (coupon.discountValue / 100)
      : coupon.discountValue;
  return Math.round(Math.min(itemsSubtotal, Math.max(0, rawDiscount)) * 100) / 100;
}

export async function validateCoupon(
  supabase: SupabaseClient,
  code: string,
  itemsSubtotal: number,
): Promise<
  | { valid: true; coupon: CouponRecord; discount: number }
  | { valid: false; error: string }
> {
  const normalizedCode = normalizeCouponCode(code);
  if (!normalizedCode) return { valid: false, error: "Informe um cupom." };

  const { data, error } = await supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, minimum_order, usage_limit, used_count, starts_at, ends_at, active",
    )
    .eq("code", normalizedCode)
    .maybeSingle();

  if (error || !data) return { valid: false, error: "Cupom não encontrado." };

  const coupon = mapCoupon(data as CouponRow);
  const now = Date.now();
  if (!coupon.active) return { valid: false, error: "Este cupom está inativo." };
  if (coupon.startsAt && new Date(coupon.startsAt).getTime() > now) {
    return { valid: false, error: "Este cupom ainda não está disponível." };
  }
  if (coupon.endsAt && new Date(coupon.endsAt).getTime() < now) {
    return { valid: false, error: "Este cupom expirou." };
  }
  if (coupon.usageLimit !== undefined && coupon.usedCount >= coupon.usageLimit) {
    return { valid: false, error: "Este cupom atingiu o limite de utilizações." };
  }
  if (itemsSubtotal < coupon.minimumOrder) {
    return {
      valid: false,
      error: `Este cupom exige pedido mínimo de R$ ${coupon.minimumOrder.toFixed(2).replace(".", ",")}.`,
    };
  }

  return {
    valid: true,
    coupon,
    discount: calculateCouponDiscount(coupon, itemsSubtotal),
  };
}
