import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import {
  createAsaasCustomer,
  createAsaasPayment,
  getPixQrCode,
  isAsaasConfigured,
} from "@/lib/asaas";
import { calculateDeliveryQuote } from "@/lib/delivery";
import type { CreatedOrder, PaymentStatus } from "@/lib/domain";
import { priceCart, priceCartFromDatabase } from "@/lib/pricing";
import { loadAsaasSettings } from "@/lib/secure-settings";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import {
  checkoutSchema,
  isDeliveryDateAllowed,
  isFutureDeliveryDate,
} from "@/lib/validation";

function createOrderNumber() {
  const suffix = Math.floor(1000 + Math.random() * 9000);
  return `QO-${format(new Date(), "yyyyMMdd")}-${suffix}`;
}

export async function POST(request: Request) {
  const parsed = checkoutSchema.safeParse(await request.json());
  if (!parsed.success) {
    const fields = parsed.error.flatten().fieldErrors;
    const details = Object.entries(fields)
      .flatMap(([field, messages]) =>
        (messages ?? []).map((message) => `${field}: ${message}`),
      )
      .join(" ");

    return NextResponse.json(
      {
        error: details ? `Revise os dados do checkout. ${details}` : "Revise os dados do checkout.",
        fields,
      },
      { status: 400 },
    );
  }

  const payload = parsed.data;
  const admin = createAdminClient();
  const paymentSettings = await loadAsaasSettings();
  if (
    (payload.paymentMethod === "PIX" && !paymentSettings.pixEnabled) ||
    (payload.paymentMethod === "CREDIT_CARD" && !paymentSettings.cardEnabled)
  ) {
    return NextResponse.json(
      { error: "A forma de pagamento selecionada está temporariamente indisponível." },
      { status: 409 },
    );
  }
  const datesAreValid = payload.selectedDates.every(
    admin ? isFutureDeliveryDate : isDeliveryDateAllowed,
  );
  if (!datesAreValid) {
    return NextResponse.json(
      { error: "Uma ou mais datas não estão disponíveis para reserva." },
      { status: 409 },
    );
  }

  const delivery = await calculateDeliveryQuote(payload.address.cep);
  if (!delivery.covered) {
    return NextResponse.json({ error: delivery.message }, { status: 422 });
  }

  let priced;
  try {
    priced = admin
      ? await priceCartFromDatabase(
          admin,
          payload.cart,
          payload.selectedDates.length,
          delivery.fee,
        )
      : priceCart(payload.cart, payload.selectedDates.length, delivery.fee);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Carrinho inválido." },
      { status: 409 },
    );
  }

  if (priced.totals.itemsSubtotal < delivery.minimumOrder) {
    return NextResponse.json(
      {
        error: `O pedido mínimo para essa região é de R$ ${delivery.minimumOrder.toFixed(2).replace(".", ",")}.`,
      },
      { status: 422 },
    );
  }

  const authClient = await createClient();
  const { data: authData } = authClient
    ? await authClient.auth.getUser()
    : { data: { user: null } };
  if (admin) {
    const { data: existing } = await admin
      .from("orders")
      .select("id, order_number")
      .eq("idempotency_key", payload.idempotencyKey)
      .maybeSingle();
    if (existing) {
      return NextResponse.json({
        order: { id: existing.id, number: existing.order_number },
        duplicated: true,
      });
    }

    const [calendarResult, reservationsResult, windowResult, rulesResult] = await Promise.all([
      admin
        .from("operational_calendar")
        .select(
          "delivery_date, availability_override, capacity, order_cutoff, reason",
        )
        .in("delivery_date", payload.selectedDates),
      admin
        .from("order_dates")
        .select("delivery_date, delivery_window")
        .in("delivery_date", payload.selectedDates)
        .neq("status", "cancelado"),
      admin
        .from("delivery_windows")
        .select("default_capacity, active")
        .eq("label", payload.deliveryWindow)
        .maybeSingle(),
      admin
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "operational_rules")
        .maybeSingle(),
    ]);

    if (
      calendarResult.error ||
      reservationsResult.error ||
      windowResult.error ||
      !windowResult.data?.active
    ) {
      return NextResponse.json(
        { error: "Não foi possível confirmar a capacidade operacional." },
        { status: 409 },
      );
    }

    const calendarMap = new Map(
      (calendarResult.data ?? []).map((row) => [row.delivery_date, row]),
    );
    const operationalRules = {
      availableWeekdays: [0, 3, 4, 5, 6],
      dailyCapacity: 24,
      minimumPreparationHours: 18,
      cutoffHour: "18:00",
      ...(rulesResult.data?.setting_value as
        | {
            availableWeekdays?: number[];
            dailyCapacity?: number;
            minimumPreparationHours?: number;
            cutoffHour?: string;
          }
        | null
        | undefined),
    };
    for (const dateValue of payload.selectedDates) {
      const date = new Date(`${dateValue}T12:00:00`);
      const override = calendarMap.get(dateValue);
      const defaultAvailable = operationalRules.availableWeekdays.includes(
        date.getDay(),
      );
      const allowed = override?.availability_override ?? defaultAvailable;
      const [cutoffHours, cutoffMinutes] = operationalRules.cutoffHour
        .split(":")
        .map(Number);
      const previousDayCutoff = new Date(date);
      previousDayCutoff.setDate(previousDayCutoff.getDate() - 1);
      previousDayCutoff.setHours(cutoffHours, cutoffMinutes, 0, 0);
      const preparationCutoff = new Date(
        date.getTime() -
          operationalRules.minimumPreparationHours * 60 * 60 * 1000,
      );
      const defaultCutoff =
        previousDayCutoff < preparationCutoff
          ? previousDayCutoff
          : preparationCutoff;
      const effectiveCutoff = override?.order_cutoff
        ? new Date(override.order_cutoff)
        : defaultCutoff;
      const cutoffReached = effectiveCutoff <= new Date();
      const dailyCapacity =
        override?.capacity ?? operationalRules.dailyCapacity;
      const dateReservations = (reservationsResult.data ?? []).filter(
        (row) => row.delivery_date === dateValue,
      );
      const windowReservations = dateReservations.filter(
        (row) => row.delivery_window === payload.deliveryWindow,
      ).length;

      if (
        !allowed ||
        cutoffReached ||
        dateReservations.length >= dailyCapacity ||
        windowReservations >= windowResult.data.default_capacity
      ) {
        return NextResponse.json(
          {
            error:
              override?.reason ??
              `A data ${format(date, "dd/MM/yyyy")} ou a janela escolhida não possui mais capacidade.`,
          },
          { status: 409 },
        );
      }
    }
  }

  const orderId = crypto.randomUUID();
  const orderNumber = createOrderNumber();
  let paymentId: string | undefined;
  let invoiceUrl: string | undefined;
  let pixQrCode: string | undefined;
  let pixCopyPaste: string | undefined;
  let paymentStatus: PaymentStatus = "pending";

  if (await isAsaasConfigured()) {
    try {
      const customer = await createAsaasCustomer({
        name: payload.customer.fullName,
        email: payload.customer.email,
        phone: payload.customer.whatsapp,
        postalCode: payload.address.cep,
        address: payload.address.street,
        addressNumber: payload.address.number,
        complement: payload.address.complement,
        province: payload.address.neighborhood,
        externalReference: orderId,
      });
      const payment = await createAsaasPayment({
        customer: customer.id,
        billingType: payload.paymentMethod,
        value: priced.totals.total,
        dueDate: format(
          addDays(
            new Date(),
            payload.paymentMethod === "PIX"
              ? Math.max(1, Math.ceil(paymentSettings.pixExpirationHours / 24))
              : 3,
          ),
          "yyyy-MM-dd",
        ),
        description: `Reserva ${orderNumber} - Quero Ostra`,
        externalReference: orderId,
      });
      paymentId = payment.id;
      invoiceUrl = payment.invoiceUrl ?? payment.bankSlipUrl;

      if (payload.paymentMethod === "PIX") {
        const pix = await getPixQrCode(payment.id);
        pixQrCode = pix.encodedImage;
        pixCopyPaste = pix.payload;
      }
    } catch (error) {
      return NextResponse.json(
        {
          error:
            error instanceof Error
              ? `Não foi possível iniciar o pagamento: ${error.message}`
              : "Não foi possível iniciar o pagamento.",
        },
        { status: 502 },
      );
    }
  } else {
    paymentId = `pay_demo_${orderId.slice(0, 8)}`;
    invoiceUrl =
      payload.paymentMethod === "CREDIT_CARD"
        ? `/dashboard/pedidos/${orderId}?demo=card`
        : undefined;
    pixCopyPaste =
      payload.paymentMethod === "PIX"
        ? `00020126580014BR.GOV.BCB.PIX0136${orderId.replaceAll("-", "")}520400005303986540${priced.totals.total.toFixed(2)}5802BR5922QUERO OSTRA DEMO6009SAO PAULO62070503***6304DEMO`
        : undefined;
  }

  const order: CreatedOrder = {
    id: orderId,
    number: orderNumber,
    createdAt: new Date().toISOString(),
    status: "aguardando_pagamento",
    paymentStatus,
    paymentMethod: payload.paymentMethod,
    paymentId,
    invoiceUrl,
    pixQrCode,
    pixCopyPaste,
    items: priced.items,
    dates: payload.selectedDates,
    deliveryWindow: payload.deliveryWindow,
    customer: payload.customer,
    address: payload.address,
    totals: priced.totals,
    notes: payload.notes,
  };

  if (admin) {
    const { error: orderError } = await admin.from("orders").insert({
      id: order.id,
      user_id: authData.user?.id ?? null,
      order_number: order.number,
      status: order.status,
      payment_status: order.paymentStatus,
      payment_method: order.paymentMethod,
      payment_id: order.paymentId,
      customer_snapshot: order.customer,
      address_snapshot: order.address,
      items_subtotal: order.totals.itemsSubtotal,
      delivery_fee: order.totals.deliveryFees,
      discount: order.totals.discount,
      total: order.totals.total,
      delivery_window: order.deliveryWindow,
      notes: order.notes,
      idempotency_key: payload.idempotencyKey,
    });
    if (orderError) {
      return NextResponse.json(
        { error: "O pagamento foi criado, mas o pedido não pôde ser salvo." },
        { status: 500 },
      );
    }

    await Promise.all([
      admin.from("order_items").insert(
        order.items.map((item) => ({
          order_id: order.id,
          product_id: item.id,
          product_name: item.name,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          addons: item.addons,
          subtotal: item.subtotal,
        })),
      ),
      admin.from("order_dates").insert(
        order.dates.map((date) => ({
          order_id: order.id,
          delivery_date: date,
          delivery_window: order.deliveryWindow,
        })),
      ),
      admin.from("payments").insert({
        order_id: order.id,
        provider: "asaas",
        provider_payment_id: order.paymentId,
        status: order.paymentStatus,
        method: order.paymentMethod,
        amount: order.totals.total,
        invoice_url: order.invoiceUrl,
        pix_copy_paste: order.pixCopyPaste,
      }),
      admin.from("order_status_history").insert({
        order_id: order.id,
        status: order.status,
        note: "Pedido criado pelo checkout.",
      }),
    ]);
  }

  return NextResponse.json({ order }, { status: 201 });
}
