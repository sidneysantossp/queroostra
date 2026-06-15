export type DeliveryQuote = {
  covered: boolean;
  fee: number;
  minimumOrder: number;
  zone: string;
  message?: string;
};

const coveredPrefixes = [
  "040",
  "041",
  "042",
  "043",
  "044",
  "045",
  "046",
  "047",
  "048",
  "049",
  "056",
  "057",
];

export function calculateDelivery(cepValue: string): DeliveryQuote {
  const cep = cepValue.replace(/\D/g, "");
  if (cep.length !== 8) {
    return {
      covered: false,
      fee: 0,
      minimumOrder: 0,
      zone: "",
      message: "Informe um CEP válido.",
    };
  }

  const covered = coveredPrefixes.some((prefix) => cep.startsWith(prefix));
  if (!covered) {
    return {
      covered: false,
      fee: 0,
      minimumOrder: 0,
      zone: "Fora da área padrão",
      message:
        "No momento, ainda não atendemos esse endereço. Fale conosco para consultar uma entrega especial.",
    };
  }

  const premiumZone = ["045", "046", "047"].some((prefix) => cep.startsWith(prefix));
  return {
    covered: true,
    fee: premiumZone ? 14 : 18,
    minimumOrder: 60,
    zone: premiumZone ? "Zona Sul central" : "Zona Sul estendida",
  };
}

export async function calculateDeliveryQuote(cepValue: string): Promise<DeliveryQuote> {
  const cep = cepValue.replace(/\D/g, "");
  if (cep.length !== 8) return calculateDelivery(cepValue);

  const { createAdminClient } = await import("@/lib/supabase/admin");
  const admin = createAdminClient();
  if (!admin) return calculateDelivery(cepValue);

  const { data } = await admin
    .from("delivery_zones")
    .select("name, fee, minimum_order")
    .eq("active", true)
    .lte("cep_start", cep)
    .gte("cep_end", cep)
    .order("fee", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (!data) {
    return {
      covered: false,
      fee: 0,
      minimumOrder: 0,
      zone: "Fora da área padrão",
      message:
        "No momento, ainda não atendemos esse endereço. Fale conosco para consultar uma entrega especial.",
    };
  }

  return {
    covered: true,
    fee: Number(data.fee),
    minimumOrder: Number(data.minimum_order),
    zone: data.name,
  };
}
