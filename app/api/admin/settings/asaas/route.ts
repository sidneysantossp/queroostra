import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";
import { loadAsaasSettings, saveAsaasSettings } from "@/lib/secure-settings";

const schema = z.object({
  environment: z.enum(["sandbox", "production"]),
  apiKey: z.string().optional(),
  webhookSecret: z.string().optional(),
  pixEnabled: z.boolean(),
  cardEnabled: z.boolean(),
  installments: z.number().int().min(1).max(12),
  pixExpirationHours: z.number().int().min(1).max(168),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) {
    return NextResponse.json({
      environment: "sandbox",
      pixEnabled: true,
      cardEnabled: true,
      installments: 1,
      pixExpirationHours: 24,
      apiKeyConfigured: false,
      webhookSecretConfigured: false,
      demo: true,
    });
  }
  if (!context.user) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const settings = await loadAsaasSettings();
  return NextResponse.json({
    environment: settings.environment,
    pixEnabled: settings.pixEnabled,
    cardEnabled: settings.cardEnabled,
    installments: settings.installments,
    pixExpirationHours: settings.pixExpirationHours,
    apiKeyConfigured: Boolean(settings.apiKey),
    webhookSecretConfigured: Boolean(settings.webhookSecret),
  });
}

export async function PUT(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) {
    return NextResponse.json({ error: "Acesso administrativo necessário." }, { status: 403 });
  }

  const parsed = schema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Configuração inválida." }, { status: 400 });
  }

  try {
    const result = await saveAsaasSettings(parsed.data, context.user.id);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Não foi possível salvar as credenciais.",
      },
      { status: 500 },
    );
  }
}
