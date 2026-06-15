import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadAsaasSettings } from "@/lib/secure-settings";

const webhookSchema = z.object({
  id: z.string().min(1),
  event: z.string().min(1),
  dateCreated: z.string().optional(),
  payment: z.object({
    id: z.string().min(1),
    status: z.string().optional(),
    externalReference: z.string().optional().nullable(),
    paymentDate: z.string().optional().nullable(),
  }),
});

const statusMap: Record<
  string,
  { payment: string; order?: string }
> = {
  PAYMENT_CONFIRMED: {
    payment: "confirmed",
    order: "pagamento_confirmado",
  },
  PAYMENT_RECEIVED: {
    payment: "confirmed",
    order: "reserva_confirmada",
  },
  PAYMENT_OVERDUE: { payment: "overdue" },
  PAYMENT_REFUNDED: { payment: "refunded", order: "cancelado" },
  PAYMENT_DELETED: { payment: "cancelled", order: "cancelado" },
  PAYMENT_REPROVED_BY_RISK_ANALYSIS: {
    payment: "failed",
    order: "cancelado",
  },
  PAYMENT_CREDIT_CARD_CAPTURE_REFUSED: {
    payment: "failed",
    order: "cancelado",
  },
  PAYMENT_CHARGEBACK_REQUESTED: {
    payment: "failed",
    order: "cancelado",
  },
  PAYMENT_CHARGEBACK_DISPUTE: {
    payment: "failed",
    order: "cancelado",
  },
};

export async function POST(request: Request) {
  const configuredToken = (await loadAsaasSettings()).webhookSecret;
  const receivedToken = request.headers.get("asaas-access-token");
  if (!configuredToken || receivedToken !== configuredToken) {
    return NextResponse.json({ error: "Webhook não autorizado." }, { status: 401 });
  }

  const parsed = webhookSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Evento inválido." }, { status: 400 });
  }

  const event = parsed.data;
  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json({ received: true, persisted: false });
  }

  const { data: existing } = await admin
    .from("payment_webhook_logs")
    .select("id")
    .eq("event_id", event.id)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ received: true, duplicated: true });
  }

  await admin.from("payment_webhook_logs").insert({
    event_id: event.id,
    event_type: event.event,
    provider_payment_id: event.payment.id,
    payload: event,
    processed: false,
  });

  const mapped = statusMap[event.event];
  if (mapped) {
    const { data: payment } = await admin
      .from("payments")
      .select("id, order_id")
      .eq("provider_payment_id", event.payment.id)
      .maybeSingle();

    if (payment) {
      await admin
        .from("payments")
        .update({
          status: mapped.payment,
          paid_at: event.payment.paymentDate ?? null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", payment.id);

      if (mapped.order) {
        await Promise.all([
          admin
            .from("orders")
            .update({
              status: mapped.order,
              payment_status: mapped.payment,
              paid_at: event.payment.paymentDate ?? null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", payment.order_id),
          admin.from("order_status_history").insert({
            order_id: payment.order_id,
            status: mapped.order,
            note: `Atualização automática pelo evento ${event.event}.`,
          }),
        ]);
      }
    }
  }

  await admin
    .from("payment_webhook_logs")
    .update({ processed: true, processed_at: new Date().toISOString() })
    .eq("event_id", event.id);

  return NextResponse.json({ received: true });
}
