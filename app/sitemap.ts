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
      url: `${siteUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.9,
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
  const blogPages: MetadataRoute.Sitemap = [];
  const authorPages: MetadataRoute.Sitemap = [];
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
      const { data: posts } = await admin
        .from("blog_posts")
        .select("slug, updated_at")
        .eq("status", "published")
        .lte("published_at", new Date().toISOString())
        .order("published_at", { ascending: false });
      for (const post of posts ?? []) {
        blogPages.push({
          url: `${siteUrl}/blog/${post.slug}`,
          lastModified: new Date(post.updated_at),
          changeFrequency: "monthly",
          priority: 0.75,
        });
      }
      const { data: authors } = await admin.from("blog_authors").select("slug, updated_at").eq("active", true).order("full_name");
      for (const author of authors ?? []) {
        authorPages.push({ url: `${siteUrl}/blog/autor/${author.slug}`, lastModified: new Date(author.updated_at), changeFrequency: "monthly", priority: 0.7 });
      }
    }
  } catch {
    /* Fallback: sitemap still works with static pages only */
  }

  return [...staticPages, ...productPages, ...blogPages, ...authorPages];
}
