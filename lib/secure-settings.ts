import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export type AsaasSettings = {
  environment: "sandbox" | "production";
  apiKey?: string;
  webhookSecret?: string;
  pixEnabled: boolean;
  cardEnabled: boolean;
  installments: number;
  pixExpirationHours: number;
};

type StoredAsaasSettings = Omit<AsaasSettings, "apiKey" | "webhookSecret"> & {
  encryptedApiKey?: string;
  encryptedWebhookSecret?: string;
};

function encryptionKey() {
  const source = process.env.SETTINGS_ENCRYPTION_KEY;
  if (!source) return null;
  return createHash("sha256").update(source).digest();
}

function encrypt(value: string) {
  const key = encryptionKey();
  if (!key) throw new Error("SETTINGS_ENCRYPTION_KEY não configurada");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, encrypted].map((part) => part.toString("base64url")).join(".");
}

function decrypt(value?: string) {
  if (!value) return undefined;
  const key = encryptionKey();
  if (!key) return undefined;
  const [ivValue, tagValue, encryptedValue] = value.split(".");
  if (!ivValue || !tagValue || !encryptedValue) return undefined;
  const decipher = createDecipheriv(
    "aes-256-gcm",
    key,
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

export async function loadAsaasSettings(): Promise<AsaasSettings> {
  const fallback: AsaasSettings = {
    environment:
      process.env.ASAAS_ENVIRONMENT === "production" ? "production" : "sandbox",
    apiKey: process.env.ASAAS_API_KEY,
    webhookSecret: process.env.ASAAS_WEBHOOK_SECRET,
    pixEnabled: true,
    cardEnabled: true,
    installments: 1,
    pixExpirationHours: 24,
  };

  const admin = createAdminClient();
  if (!admin) return fallback;
  const { data } = await admin
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "asaas")
    .maybeSingle();
  if (!data?.setting_value) return fallback;

  const stored = data.setting_value as StoredAsaasSettings;
  return {
    environment: stored.environment ?? fallback.environment,
    apiKey: decrypt(stored.encryptedApiKey) ?? fallback.apiKey,
    webhookSecret:
      decrypt(stored.encryptedWebhookSecret) ?? fallback.webhookSecret,
    pixEnabled: stored.pixEnabled ?? true,
    cardEnabled: stored.cardEnabled ?? true,
    installments: stored.installments ?? 1,
    pixExpirationHours: stored.pixExpirationHours ?? 24,
  };
}

export async function saveAsaasSettings(
  input: AsaasSettings,
  updatedBy: string,
) {
  const admin = createAdminClient();
  if (!admin) return { saved: false, demo: true };

  const { data: current } = await admin
    .from("admin_settings")
    .select("setting_value")
    .eq("setting_key", "asaas")
    .maybeSingle();
  const previous = (current?.setting_value ?? {}) as StoredAsaasSettings;
  const stored: StoredAsaasSettings = {
    environment: input.environment,
    pixEnabled: input.pixEnabled,
    cardEnabled: input.cardEnabled,
    installments: input.installments,
    pixExpirationHours: input.pixExpirationHours,
    encryptedApiKey: input.apiKey
      ? encrypt(input.apiKey)
      : previous.encryptedApiKey,
    encryptedWebhookSecret: input.webhookSecret
      ? encrypt(input.webhookSecret)
      : previous.encryptedWebhookSecret,
  };

  const { error } = await admin.from("admin_settings").upsert(
    {
      setting_key: "asaas",
      setting_value: stored,
      sensitive: true,
      updated_by: updatedBy,
    },
    { onConflict: "setting_key" },
  );
  if (error) throw error;
  return { saved: true, demo: false };
}
