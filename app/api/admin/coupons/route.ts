import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";
import { mapCoupon, normalizeCouponCode } from "@/lib/coupons";

const couponSchema = z.object({
  id: z.uuid().optional(),
  code: z.string().min(2).max(40),
  discountType: z.enum(["fixed", "percentage"]),
  discountValue: z.number().positive(),
  minimumOrder: z.number().min(0),
  usageLimit: z.number().int().positive().nullable().optional(),
  startsAt: z.string().nullable().optional(),
  endsAt: z.string().nullable().optional(),
  active: z.boolean(),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ coupons: [], demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { data, error } = await context.supabase
    .from("coupons")
    .select(
      "id, code, discount_type, discount_value, minimum_order, usage_limit, used_count, starts_at, ends_at, active",
    )
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Falha ao carregar cupons." }, { status: 500 });

  return NextResponse.json({ coupons: (data ?? []).map((coupon) => mapCoupon(coupon)) });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const parsed = couponSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Revise os dados do cupom." }, { status: 400 });
  const coupon = parsed.data;
  if (coupon.discountType === "percentage" && coupon.discountValue > 100) {
    return NextResponse.json({ error: "O desconto percentual não pode ultrapassar 100%." }, { status: 400 });
  }

  const row = {
    code: normalizeCouponCode(coupon.code),
    discount_type: coupon.discountType,
    discount_value: coupon.discountValue,
    minimum_order: coupon.minimumOrder,
    usage_limit: coupon.usageLimit ?? null,
    starts_at: coupon.startsAt || null,
    ends_at: coupon.endsAt || null,
    active: coupon.active,
  };
  const query = coupon.id
    ? context.supabase.from("coupons").update(row).eq("id", coupon.id)
    : context.supabase.from("coupons").insert(row);
  const { error } = await query;
  if (error) {
    return NextResponse.json(
      { error: error.code === "23505" ? "Já existe um cupom com esse código." : "Falha ao salvar cupom." },
      { status: 500 },
    );
  }
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ deleted: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const id = new URL(request.url).searchParams.get("id");
  if (!id || !z.uuid().safeParse(id).success) {
    return NextResponse.json({ error: "Cupom inválido." }, { status: 400 });
  }
  const { error } = await context.supabase.from("coupons").delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao excluir cupom." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
