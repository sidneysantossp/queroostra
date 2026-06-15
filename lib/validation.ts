import { z } from "zod";

const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().min(10, "Informe um telefone válido").max(13));

const cepSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .pipe(z.string().length(8, "Informe um CEP válido"));

export const customerSchema = z.object({
  fullName: z.string().trim().min(3, "Informe seu nome completo"),
  email: z.email("Informe um e-mail válido"),
  whatsapp: phoneSchema,
  alternatePhone: z.union([phoneSchema, z.literal("")]).optional(),
});

export const addressSchema = z.object({
  cep: cepSchema,
  street: z.string().trim().min(3, "Informe a rua"),
  number: z.string().trim().min(1, "Informe o número"),
  complement: z.string().trim().optional(),
  neighborhood: z.string().trim().min(2, "Informe o bairro"),
  city: z.string().trim().min(2, "Informe a cidade"),
  state: z.string().trim().length(2, "Use a sigla do estado"),
  reference: z.string().trim().optional(),
  instructions: z.string().trim().max(500).optional(),
});

export const checkoutSchema = z.object({
  cart: z
    .array(
      z.object({
        id: z.string().min(1),
        quantity: z.number().int().min(1).max(50),
        addonIds: z.array(z.string()).optional(),
      }),
    )
    .min(1, "Seu carrinho está vazio"),
  selectedDates: z.array(z.iso.date()).min(1, "Selecione pelo menos uma data").max(12),
  deliveryWindow: z.string().min(1, "Selecione uma janela de entrega"),
  customer: customerSchema,
  address: addressSchema,
  paymentMethod: z.enum(["PIX", "CREDIT_CARD"]),
  notes: z.string().max(1000).optional(),
  reviewed: z.literal(true, { error: "Confirme a revisão do pedido" }),
  acceptedTerms: z.literal(true, { error: "Aceite os termos para continuar" }),
  idempotencyKey: z.string().uuid(),
});

export type CheckoutPayload = z.infer<typeof checkoutSchema>;

export function isDeliveryDateAllowed(dateValue: string) {
  if (!isFutureDeliveryDate(dateValue)) return false;
  const date = new Date(`${dateValue}T12:00:00`);
  const day = date.getDay();
  return [0, 3, 4, 5, 6].includes(day);
}

export function isFutureDeliveryDate(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  const minimum = new Date();
  minimum.setHours(0, 0, 0, 0);
  minimum.setDate(minimum.getDate() + 1);
  return !Number.isNaN(date.getTime()) && date >= minimum;
}
