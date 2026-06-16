import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const schema = z.object({
  fullName: z.string().min(3),
  cpfCnpj: z.string().transform((val) => val.replace(/\D/g, "")).pipe(z.string().refine((val) => val.length === 11 || val.length === 14, "CPF ou CNPJ inválido")),
  whatsapp: z.string().min(10),
  alternatePhone: z.string().optional(),
  communicationPreferences: z.object({
    email: z.boolean(),
    whatsapp: z.boolean(),
  }),
});

export async function GET() {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ profile: null, demo: true });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const { data, error } = await supabase
    .from("profiles")
    .select("full_name, email, cpf_cnpj, whatsapp, alternate_phone, communication_preferences")
    .eq("id", authData.user.id)
    .single();
  if (error) return NextResponse.json({ error: "Perfil não encontrado." }, { status: 404 });
  return NextResponse.json({ profile: data });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  if (!supabase) return NextResponse.json({ saved: true, demo: true });
  const { data: authData } = await supabase.auth.getUser();
  if (!authData.user) return NextResponse.json({ error: "Sessão necessária." }, { status: 401 });
  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      cpf_cnpj: parsed.data.cpfCnpj,
      whatsapp: parsed.data.whatsapp,
      alternate_phone: parsed.data.alternatePhone || null,
      communication_preferences: parsed.data.communicationPreferences,
    })
    .eq("id", authData.user.id);
  if (error) return NextResponse.json({ error: "Falha ao salvar perfil." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
