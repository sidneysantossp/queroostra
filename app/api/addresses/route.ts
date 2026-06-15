import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const addressSchema = z.object({
  id: z.string().optional(),
  label: z.string().min(1),
  cep: z.string().min(8),
  street: z.string().min(1),
  number: z.string().min(1),
  complement: z.string().optional(),
  neighborhood: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2),
  reference: z.string().optional(),
  instructions: z.string().optional(),
  isDefault: z.boolean(),
});

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ addresses: [], demo: true });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data, error } = await supabase
    .from("delivery_addresses")
    .select("*")
    .eq("user_id", authData.user.id)
    .order("is_default", { ascending: false });
  if (error) return NextResponse.json({ error: "Falha ao carregar endereços." }, { status: 500 });
  return NextResponse.json({
    addresses: (data ?? []).map((address) => ({
      id: address.id,
      label: address.label,
      cep: address.cep,
      street: address.street,
      number: address.number,
      complement: address.complement ?? "",
      neighborhood: address.neighborhood,
      city: address.city,
      state: address.state,
      reference: address.reference ?? "",
      instructions: address.instructions ?? "",
      isDefault: address.is_default,
    })),
  });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ saved: true, demo: true });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const parsed = z.object({ addresses: z.array(addressSchema) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Endereços inválidos." }, { status: 400 });
  if (parsed.data.addresses.some((address) => address.isDefault)) {
    await supabase
      .from("delivery_addresses")
      .update({ is_default: false })
      .eq("user_id", authData.user.id);
  }
  const rows = parsed.data.addresses.map((address) => ({
    id: address.id && z.string().uuid().safeParse(address.id).success ? address.id : crypto.randomUUID(),
    user_id: authData.user.id,
    label: address.label,
    cep: address.cep.replace(/\D/g, ""),
    street: address.street,
    number: address.number,
    complement: address.complement || null,
    neighborhood: address.neighborhood,
    city: address.city,
    state: address.state.toUpperCase(),
    reference: address.reference || null,
    instructions: address.instructions || null,
    is_default: address.isDefault,
  }));
  const { error } = await supabase.from("delivery_addresses").upsert(rows);
  if (error) return NextResponse.json({ error: "Falha ao salvar endereços." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
