import type { CreatedOrder } from "@/lib/domain";

export const DEMO_ORDERS_KEY = "quero-ostra-orders";
export const DEMO_SESSION_KEY = "quero-ostra-session";

export const sampleOrder: CreatedOrder = {
  id: "demo-order-1",
  number: "QO-2026-0148",
  createdAt: "2026-06-12T14:20:00.000Z",
  status: "reserva_confirmada",
  paymentStatus: "confirmed",
  paymentMethod: "PIX",
  paymentId: "pay_demo_0148",
  items: [
    {
      id: "tradicional",
      name: "Experiência Happy Hour",
      description: "Ostras tradicionais para compartilhar.",
      image: "/images/kit-happy-hour.png",
      quantity: 1,
      unitPrice: 79.9,
      addons: [{ id: "molho-especial", name: "Molho especial", unitPrice: 8.9 }],
      subtotal: 88.8,
    },
    {
      id: "espumante-brut",
      name: "Espumante Brut",
      description: "Espumante nacional, 750 ml",
      quantity: 1,
      unitPrice: 119.9,
      addons: [],
      subtotal: 119.9,
    },
  ],
  dates: ["2026-06-18"],
  deliveryWindow: "16h às 18h",
  customer: {
    fullName: "Cliente Quero Ostra",
    email: "cliente@queroostra.com.br",
    cpfCnpj: "12345678909",
    whatsapp: "11999999999",
  },
  address: {
    cep: "04538000",
    street: "Rua Doutor Renato Paes de Barros",
    number: "750",
    neighborhood: "Itaim Bibi",
    city: "São Paulo",
    state: "SP",
    instructions: "Entregar na portaria.",
  },
  totals: {
    itemsSubtotal: 208.7,
    deliveryFeePerDate: 18,
    deliveryFees: 18,
    discount: 0,
    dateMultiplier: 1,
    total: 226.7,
  },
};
