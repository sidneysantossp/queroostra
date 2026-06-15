import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ users: [], demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const { data: profiles, error } = await context.supabase
    .from("profiles")
    .select("id, full_name, email, whatsapp, role, active, created_at")
    .order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: "Falha ao carregar usuários." }, { status: 500 });

  const { data: orders } = await context.supabase
    .from("orders")
    .select("user_id, created_at");
  const users = (profiles ?? []).map((profile) => {
    const userOrders = (orders ?? []).filter((order) => order.user_id === profile.id);
    return {
      ...profile,
      orderCount: userOrders.length,
      lastOrder: userOrders.sort((a, b) => b.created_at.localeCompare(a.created_at))[0]?.created_at,
    };
  });
  return NextResponse.json({ users });
}

export async function PATCH(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const parsed = z.object({
    id: z.uuid(),
    role: z.enum(["customer", "admin"]),
    active: z.boolean().optional(),
  }).safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  if (parsed.data.id === context.user.id && parsed.data.role !== "admin") {
    return NextResponse.json({ error: "Você não pode remover seu próprio acesso." }, { status: 409 });
  }

  const { error } = await context.supabase
    .from("profiles")
    .update({
      role: parsed.data.role,
      ...(parsed.data.active === undefined ? {} : { active: parsed.data.active }),
    })
    .eq("id", parsed.data.id);
  if (error) return NextResponse.json({ error: "Falha ao atualizar usuário." }, { status: 500 });
  return NextResponse.json({ saved: true });
}
