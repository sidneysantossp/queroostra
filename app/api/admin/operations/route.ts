import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";

const rulesSchema = z.object({
  availableWeekdays: z.array(z.number().int().min(0).max(6)),
  dailyCapacity: z.number().int().min(0),
  minimumPreparationHours: z.number().int().min(0),
  cutoffHour: z.string().regex(/^\d{2}:\d{2}$/),
  windows: z.array(
    z.object({
      id: z.string().optional(),
      label: z.string().min(1),
      capacity: z.number().int().min(0),
      active: z.boolean(),
    }),
  ),
  override: z
    .object({
      date: z.iso.date(),
      available: z.boolean(),
      capacity: z.number().int().min(0),
      reason: z.string().optional(),
    })
    .optional(),
});

const defaults = {
  availableWeekdays: [0, 3, 4, 5, 6],
  dailyCapacity: 32,
  minimumPreparationHours: 18,
  cutoffHour: "18:00",
};

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) {
    return NextResponse.json({ rules: defaults, windows: [], overrides: [], demo: true });
  }
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });

  const [settingsResult, windowsResult, overridesResult] = await Promise.all([
    context.supabase
      .from("admin_settings")
      .select("setting_value")
      .eq("setting_key", "operational_rules")
      .maybeSingle(),
    context.supabase
      .from("delivery_windows")
      .select("id, label, default_capacity, active")
      .order("display_order"),
    context.supabase
      .from("operational_calendar")
      .select("delivery_date, availability_override, capacity, reason")
      .gte("delivery_date", new Date().toISOString().slice(0, 10))
      .order("delivery_date")
      .limit(30),
  ]);

  return NextResponse.json({
    rules: { ...defaults, ...(settingsResult.data?.setting_value ?? {}) },
    windows: (windowsResult.data ?? []).map((window) => ({
      id: window.id,
      label: window.label,
      capacity: window.default_capacity,
      active: window.active,
    })),
    overrides: overridesResult.data ?? [],
  });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const parsed = rulesSchema.safeParse(await request.json());
  if (!parsed.success) return NextResponse.json({ error: "Regras inválidas." }, { status: 400 });

  const { override, windows, ...rules } = parsed.data;
  const windowRows = windows.map((window, index) => {
    const times = window.label.match(/(\d{1,2})h.*?(\d{1,2})h/);
    return {
      id: window.id && z.string().uuid().safeParse(window.id).success ? window.id : crypto.randomUUID(),
      label: window.label,
      start_time: `${times?.[1]?.padStart(2, "0") ?? "10"}:00`,
      end_time: `${times?.[2]?.padStart(2, "0") ?? "12"}:00`,
      default_capacity: window.capacity,
      active: window.active,
      display_order: index + 1,
    };
  });

  const tasks = [
    context.supabase.from("admin_settings").upsert(
      {
        setting_key: "operational_rules",
        setting_value: rules,
        sensitive: false,
        updated_by: context.user.id,
      },
      { onConflict: "setting_key" },
    ),
    context.supabase.from("delivery_windows").upsert(windowRows),
  ];
  if (override) {
    tasks.push(
      context.supabase.from("operational_calendar").upsert(
        {
          delivery_date: override.date,
          availability_override: override.available,
          capacity: override.capacity,
          reason: override.reason || null,
        },
        { onConflict: "delivery_date" },
      ),
    );
  }
  const results = await Promise.all(tasks);
  if (results.some((result) => result.error)) {
    return NextResponse.json({ error: "Falha ao salvar calendário." }, { status: 500 });
  }
  return NextResponse.json({ saved: true });
}
