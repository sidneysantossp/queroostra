import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

const schema = z.object({
  status: z.enum([
    "aguardando_pagamento",
    "pagamento_confirmado",
    "reserva_confirmada",
    "em_preparacao",
    "saiu_para_entrega",
    "entregue",
    "cancelado",
  ]),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Status inválido." }, { status: 400 });
  }
  const { id } = await params;

  const { error } = await context.supabase
    .from("orders")
    .update({ status: parsed.data.status })
    .eq("id", id);
  if (error) {
    return NextResponse.json({ error: "Não foi possível atualizar o pedido." }, { status: 500 });
  }

  await Promise.all([
    context.supabase.from("order_status_history").insert({
      order_id: id,
      status: parsed.data.status,
      note: "Status alterado pelo painel administrativo.",
      changed_by: context.user.id,
    }),
    context.supabase.from("audit_logs").insert({
      actor_id: context.user.id,
      action: "order.status.updated",
      entity_type: "order",
      entity_id: id,
      new_data: { status: parsed.data.status },
    }),
  ]);

  return NextResponse.json({ saved: true });
}
