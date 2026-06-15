import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

const zoneSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  cepStart: z.string().min(8),
  cepEnd: z.string().min(8),
  neighborhood: z.string().optional(),
  city: z.string().default("São Paulo"),
  fee: z.number().min(0),
  minimumOrder: z.number().min(0),
  active: z.boolean(),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ zones: [], demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const { data, error } = await context.supabase.from("delivery_zones").select("*").order("fee");
  if (error) return NextResponse.json({ error: "Falha ao carregar regiões." }, { status: 500 });
  return NextResponse.json({
    zones: (data ?? []).map((zone) => ({
      id: zone.id,
      name: zone.name,
      cepStart: zone.cep_start ?? "",
      cepEnd: zone.cep_end ?? "",
      neighborhood: zone.neighborhood ?? "",
      city: zone.city ?? "",
      fee: Number(zone.fee),
      minimumOrder: Number(zone.minimum_order),
      active: zone.active,
    })),
  });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const parsed = z.object({ zones: z.array(zoneSchema) }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Regiões inválidas." }, { status: 400 });
  const rows = parsed.data.zones.map((zone) => ({
    id: zone.id && z.string().uuid().safeParse(zone.id).success ? zone.id : crypto.randomUUID(),
    name: zone.name,
    cep_start: zone.cepStart.replace(/\D/g, ""),
    cep_end: zone.cepEnd.replace(/\D/g, ""),
    neighborhood: zone.neighborhood || null,
    city: zone.city,
    fee: zone.fee,
    minimum_order: zone.minimumOrder,
    active: zone.active,
  }));
  const { error } = await context.supabase.from("delivery_zones").upsert(rows);
  if (error) return NextResponse.json({ error: "Falha ao salvar regiões." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
