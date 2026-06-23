export type PaymentMethod = "PIX" | "CREDIT_CARD";

export type OrderStatus =
  | "aguardando_pagamento"
  | "pagamento_confirmado"
  | "reserva_confirmada"
  | "em_preparacao"
  | "saiu_para_entrega"
  | "entregue"
  | "cancelado";

export type PaymentStatus =
  | "pending"
  | "confirmed"
  | "overdue"
  | "refunded"
  | "cancelled"
  | "failed";

export type CheckoutCartItem = {
  id: string;
  quantity: number;
  addonIds?: string[];
};

export type DeliveryAddress = {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  reference?: string;
  instructions?: string;
};

export type CustomerData = {
  fullName: string;
  email: string;
  cpfCnpj: string;
  whatsapp: string;
  alternatePhone?: string;
};

export type CheckoutDraft = {
  cart: CheckoutCartItem[];
  selectedDates: string[];
  deliveryWindow: string;
  customer: CustomerData;
  address: DeliveryAddress;
  paymentMethod: PaymentMethod;
  notes?: string;
  reviewed: boolean;
  acceptedTerms: boolean;
};

export type PricedOrderItem = {
  id: string;
  name: string;
  description: string;
  image?: string;
  quantity: number;
  unitPrice: number;
  addons: {
    id: string;
    name: string;
    unitPrice: number;
  }[];
  subtotal: number;
};

export type OrderTotals = {
  itemsSubtotal: number;
  deliveryFeePerDate: number;
  deliveryFees: number;
  discount: number;
  dateMultiplier: number;
  total: number;
};

export type CreatedOrder = {
  id: string;
  number: string;
  createdAt: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentId?: string;
  invoiceUrl?: string;
  pixQrCode?: string;
  pixCopyPaste?: string;
  items: PricedOrderItem[];
  dates: string[];
  deliveryWindow: string;
  customer: CustomerData;
  address: DeliveryAddress;
  totals: OrderTotals;
  notes?: string;
};

export type ProductRecord = {
  id: string;
  externalKey?: string;
  slug: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  type: "fresh" | "gratinated" | "beverage";
  category: string;
  categoryName?: string;
  price: number;
  promotionalPrice?: number;
  stock: number;
  active: boolean;
  featured: boolean;
  image?: string;
  includedItems: string[];
  preparationHours: number;
  approximateVolume?: string;
  displayOrder: number;
  seoTitle?: string;
  seoDescription?: string;
};

export type AddonRecord = {
  id: string;
  name: string;
  description: string;
  price: number;
  stock: number;
  active: boolean;
  productIds: string[];
};
