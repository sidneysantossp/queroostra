import type { MetadataRoute } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://queroostra.com.br";

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${siteUrl}/cardapio`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${siteUrl}/produtos`,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${siteUrl}/login`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: `${siteUrl}/cadastro`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  // Gerar URLs dinâmicas dos produtos
  const productPages: MetadataRoute.Sitemap = [];
  try {
    const admin = createAdminClient();
    if (admin) {
      const { data } = await admin
        .from("products")
        .select("slug, updated_at")
        .eq("active", true)
        .order("display_order");

      if (data) {
        for (const product of data) {
          productPages.push({
            url: `${siteUrl}/produtos/${product.slug}`,
            lastModified: new Date(product.updated_at),
            changeFrequency: "weekly",
            priority: 0.7,
          });
        }
      }
    }
  } catch {
    /* Fallback: sitemap still works with static pages only */
  }

  return [...staticPages, ...productPages];
}
