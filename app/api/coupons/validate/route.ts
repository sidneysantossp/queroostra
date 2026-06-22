import { NextResponse } from "next/server";
import { z } from "zod";
import { validateCoupon } from "@/lib/coupons";
import { priceCartFromDatabase } from "@/lib/pricing";
import { createAdminClient } from "@/lib/supabase/admin";

const schema = z.object({
  code: z.string().min(1),
  cart: z.array(
    z.object({
      id: z.string().min(1),
      quantity: z.number().int().min(1).max(50),
      addonIds: z.array(z.string()).optional(),
    }),
  ).min(1),
  dateCount: z.number().int().min(1).max(12),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados do cupom inválidos." }, { status: 400 });
  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "Cupons temporariamente indisponíveis." }, { status: 503 });

  try {
    const priced = await priceCartFromDatabase(admin, parsed.data.cart, parsed.data.dateCount, 0);
    const result = await validateCoupon(admin, parsed.data.code, priced.totals.itemsSubtotal);
    if (!result.valid) return NextResponse.json({ error: result.error }, { status: 422 });
    return NextResponse.json({
      coupon: {
        code: result.coupon.code,
        discountType: result.coupon.discountType,
        discountValue: result.coupon.discountValue,
      },
      discount: result.discount,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Não foi possível validar o cupom." },
      { status: 409 },
    );
  }
}
