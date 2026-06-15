import { addDays, format } from "date-fns";
import { NextResponse } from "next/server";
import { deliveryWindows as fallbackWindows } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const rangeStart = format(addDays(today, 1), "yyyy-MM-dd");
  const rangeEnd = format(addDays(today, 90), "yyyy-MM-dd");
  const admin = createAdminClient();

  let calendarRows: {
    id: string;
    delivery_date: string;
    availability_override: boolean | null;
    capacity: number | null;
    order_cutoff: string | null;
    reason: string | null;
  }[] = [];
  let windows: {
    id: string;
    label: string;
    default_capacity: number;
  }[] = fallbackWindows.map((label, index) => ({
    id: `fallback-${index}`,
    label,
    default_capacity: 8,
  }));
  let reservations: { delivery_date: string }[] = [];
  let operationalRules = {
    availableWeekdays: [0, 3, 4, 5, 6],
    dailyCapacity: 24,
    minimumPreparationHours: 18,
    cutoffHour: "18:00",
  };

  if (admin) {
    const [calendarResult, windowResult, reservationResult, settingsResult] = await Promise.all([
      admin
        .from("operational_calendar")
        .select("id, delivery_date, availability_override, capacity, order_cutoff, reason")
        .gte("delivery_date", rangeStart)
        .lte("delivery_date", rangeEnd),
      admin
        .from("delivery_windows")
        .select("id, label, default_capacity")
        .eq("active", true)
        .order("display_order"),
      admin
        .from("order_dates")
        .select("delivery_date")
        .gte("delivery_date", rangeStart)
        .lte("delivery_date", rangeEnd)
        .neq("status", "cancelado"),
      admin
        .from("admin_settings")
        .select("setting_value")
        .eq("setting_key", "operational_rules")
        .maybeSingle(),
    ]);
    calendarRows = calendarResult.data ?? [];
    if (windowResult.data?.length) windows = windowResult.data;
    reservations = reservationResult.data ?? [];
    if (settingsResult.data?.setting_value) {
      operationalRules = {
        ...operationalRules,
        ...(settingsResult.data.setting_value as typeof operationalRules),
      };
    }
  }

  const calendarMap = new Map(calendarRows.map((row) => [row.delivery_date, row]));
  const reservationCount = reservations.reduce<Record<string, number>>((counts, row) => {
    counts[row.delivery_date] = (counts[row.delivery_date] ?? 0) + 1;
    return counts;
  }, {});

  const dates = Array.from({ length: 90 }, (_, index) => {
    const date = addDays(today, index + 1);
    const dateValue = format(date, "yyyy-MM-dd");
    const weekday = date.getDay();
    const defaultAvailable = operationalRules.availableWeekdays.includes(weekday);
    const override = calendarMap.get(dateValue);
    const [cutoffHours, cutoffMinutes] = operationalRules.cutoffHour
      .split(":")
      .map(Number);
    const previousDayCutoff = new Date(date);
    previousDayCutoff.setDate(previousDayCutoff.getDate() - 1);
    previousDayCutoff.setHours(cutoffHours, cutoffMinutes, 0, 0);
    const preparationCutoff = new Date(
      date.getTime() - operationalRules.minimumPreparationHours * 60 * 60 * 1000,
    );
    const defaultCutoff =
      previousDayCutoff < preparationCutoff
        ? previousDayCutoff
        : preparationCutoff;
    const effectiveCutoff = override?.order_cutoff
      ? new Date(override.order_cutoff)
      : defaultCutoff;
    const cutoffReached = effectiveCutoff <= new Date();
    const capacity =
      override?.capacity ??
      (admin ? operationalRules.dailyCapacity : weekday === 6 ? 36 : 24);
    const reserved =
      reservationCount[dateValue] ??
      (admin ? 0 : (date.getDate() * 7 + weekday * 3) % capacity);
    const allowed = override?.availability_override ?? defaultAvailable;
    const available = allowed && !cutoffReached && reserved < capacity;

    return {
      date: dateValue,
      available,
      reason: !allowed
        ? override?.reason ?? "Dia sem operação"
        : cutoffReached
          ? "Prazo de reserva encerrado"
          : reserved >= capacity
            ? "Capacidade esgotada"
            : undefined,
      capacity,
      reserved,
      windows: windows.map((window, windowIndex) => {
        const remaining = Math.max(
          0,
          window.default_capacity -
            Math.floor(reserved / Math.max(1, windows.length)) -
            (windowIndex < reserved % Math.max(1, windows.length) ? 1 : 0),
        );
        return {
          id: `${dateValue}-${window.id}`,
          label: window.label,
          available: available && remaining > 0,
          remaining,
        };
      }),
    };
  });

  return NextResponse.json({ dates });
}
