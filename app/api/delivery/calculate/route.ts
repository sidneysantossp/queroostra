import { NextResponse } from "next/server";
import { z } from "zod";
import { calculateDeliveryQuote } from "@/lib/delivery";

const requestSchema = z.object({
  cep: z.string().min(8),
});

export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Informe um CEP válido." },
      { status: 400 },
    );
  }

  const quote = await calculateDeliveryQuote(parsed.data.cep);
  let address: Record<string, string> | undefined;

  if (quote.covered) {
    try {
      const cep = parsed.data.cep.replace(/\D/g, "");
      const response = await fetch(`https://viacep.com.br/ws/${cep}/json/`, {
        next: { revalidate: 86400 },
      });
      if (response.ok) {
        const data = (await response.json()) as {
          erro?: boolean;
          logradouro?: string;
          bairro?: string;
          localidade?: string;
          uf?: string;
        };
        if (!data.erro) {
          address = {
            street: data.logradouro ?? "",
            neighborhood: data.bairro ?? "",
            city: data.localidade ?? "",
            state: data.uf ?? "",
          };
        }
      }
    } catch {
      // A quote remains valid even if the optional CEP lookup is unavailable.
    }
  }

  return NextResponse.json({ ...quote, address });
}
