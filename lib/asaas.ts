import type { PaymentMethod } from "@/lib/domain";
import { loadAsaasSettings } from "@/lib/secure-settings";

type AsaasCustomerInput = {
  name: string;
  email: string;
  cpfCnpj: string;
  phone: string;
  postalCode: string;
  address: string;
  addressNumber: string;
  complement?: string;
  province: string;
  externalReference: string;
};

type AsaasPaymentInput = {
  customer: string;
  billingType: PaymentMethod;
  value: number;
  dueDate: string;
  description: string;
  externalReference: string;
};

type AsaasPayment = {
  id: string;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
};

async function asaasRequest<T>(path: string, init: RequestInit): Promise<T> {
  const settings = await loadAsaasSettings();
  const apiKey = settings.apiKey;
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada");
  const baseUrl =
    settings.environment === "production"
      ? "https://api.asaas.com/v3"
      : "https://api-sandbox.asaas.com/v3";

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      access_token: apiKey,
      "User-Agent": "Quero Ostra Checkout",
      ...init.headers,
    },
    cache: "no-store",
  });

  const body = (await response.json()) as T & {
    errors?: { code: string; description: string }[];
  };
  if (!response.ok) {
    const message =
      body.errors?.map((error) => error.description).join("; ") ||
      "Falha na comunicação com o Asaas";
    throw new Error(message);
  }
  return body;
}

export async function createAsaasCustomer(input: AsaasCustomerInput) {
  return asaasRequest<{ id: string }>("/customers", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function createAsaasPayment(input: AsaasPaymentInput) {
  return asaasRequest<AsaasPayment>("/payments", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function getPixQrCode(paymentId: string) {
  return asaasRequest<{
    encodedImage: string;
    payload: string;
    expirationDate: string;
  }>(`/payments/${paymentId}/pixQrCode`, { method: "GET" });
}

export async function isAsaasConfigured() {
  return Boolean((await loadAsaasSettings()).apiKey);
}
