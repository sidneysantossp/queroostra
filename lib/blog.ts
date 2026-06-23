import type { SupabaseClient } from "@supabase/supabase-js";

export type BlogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string;
  active: boolean;
};

export type BlogAuthor = {
  id: string;
  fullName: string;
  slug: string;
  jobTitle: string;
  shortBio: string;
  biography: string;
  photoUrl?: string;
  photoAlt?: string;
  education: string[];
  certifications: string[];
  awards: string[];
  expertise: string[];
  linkedinUrl?: string;
  instagramUrl?: string;
  portfolioUrl?: string;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type BlogPost = {
  id: string;
  categoryId?: string;
  category?: BlogCategory;
  authorId?: string;
  author?: BlogAuthor;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  featuredImage?: string;
  imageAlt?: string;
  authorName: string;
  status: "draft" | "published";
  publishedAt?: string;
  seoTitle?: string;
  seoDescription?: string;
  focusKeyword?: string;
  tags: string[];
  readingTime: number;
  createdAt?: string;
  updatedAt?: string;
};

type BlogRow = Record<string, unknown> & {
  blog_categories?: BlogCategory | BlogCategory[] | null;
  blog_authors?: Record<string, unknown> | Record<string, unknown>[] | null;
};

export function mapBlogAuthor(row: Record<string, unknown>): BlogAuthor {
  return {
    id: String(row.id), fullName: String(row.full_name), slug: String(row.slug),
    jobTitle: String(row.job_title ?? ""), shortBio: String(row.short_bio ?? ""), biography: String(row.biography ?? ""),
    photoUrl: row.photo_url ? String(row.photo_url) : undefined, photoAlt: row.photo_alt ? String(row.photo_alt) : undefined,
    education: Array.isArray(row.education) ? row.education.map(String) : [],
    certifications: Array.isArray(row.certifications) ? row.certifications.map(String) : [],
    awards: Array.isArray(row.awards) ? row.awards.map(String) : [],
    expertise: Array.isArray(row.expertise) ? row.expertise.map(String) : [],
    linkedinUrl: row.linkedin_url ? String(row.linkedin_url) : undefined,
    instagramUrl: row.instagram_url ? String(row.instagram_url) : undefined,
    portfolioUrl: row.portfolio_url ? String(row.portfolio_url) : undefined,
    active: Boolean(row.active), createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export function mapBlogCategory(row: Record<string, unknown>): BlogCategory {
  return {
    id: String(row.id),
    name: String(row.name),
    slug: String(row.slug),
    description: String(row.description ?? ""),
    active: Boolean(row.active),
  };
}

export function mapBlogPost(row: BlogRow): BlogPost {
  const rawCategory = Array.isArray(row.blog_categories)
    ? row.blog_categories[0]
    : row.blog_categories;
  const rawAuthor = Array.isArray(row.blog_authors) ? row.blog_authors[0] : row.blog_authors;
  const author = rawAuthor ? mapBlogAuthor(rawAuthor) : undefined;
  return {
    id: String(row.id),
    categoryId: row.category_id ? String(row.category_id) : undefined,
    category: rawCategory
      ? {
          id: String(rawCategory.id),
          name: String(rawCategory.name),
          slug: String(rawCategory.slug),
          description: String(rawCategory.description ?? ""),
          active: Boolean(rawCategory.active),
        }
      : undefined,
    authorId: row.author_id ? String(row.author_id) : undefined,
    author,
    title: String(row.title),
    slug: String(row.slug),
    excerpt: String(row.excerpt ?? ""),
    content: String(row.content ?? ""),
    featuredImage: row.featured_image ? String(row.featured_image) : undefined,
    imageAlt: row.image_alt ? String(row.image_alt) : undefined,
    authorName: author?.fullName ?? String(row.author_name ?? "Quero Ostra"),
    status: row.status === "published" ? "published" : "draft",
    publishedAt: row.published_at ? String(row.published_at) : undefined,
    seoTitle: row.seo_title ? String(row.seo_title) : undefined,
    seoDescription: row.seo_description ? String(row.seo_description) : undefined,
    focusKeyword: row.focus_keyword ? String(row.focus_keyword) : undefined,
    tags: Array.isArray(row.tags) ? row.tags.map(String) : [],
    readingTime: Number(row.reading_time ?? 5),
    createdAt: row.created_at ? String(row.created_at) : undefined,
    updatedAt: row.updated_at ? String(row.updated_at) : undefined,
  };
}

export async function getPublishedBlogPosts(supabase: SupabaseClient) {
  const query = supabase
    .from("blog_posts")
    .select("*, blog_categories(id, name, slug, description, active), blog_authors(*)")
    .eq("status", "published")
    .lte("published_at", new Date().toISOString())
    .order("published_at", { ascending: false });
  let { data, error } = await query;
  if (error) {
    const fallback = await supabase.from("blog_posts").select("*, blog_categories(id, name, slug, description, active)").eq("status", "published").lte("published_at", new Date().toISOString()).order("published_at", { ascending: false });
    data = fallback.data; error = fallback.error;
  }
  if (error) return [];
  return (data ?? []).map((row) => mapBlogPost(row));
}

export async function getBlogAuthors(supabase: SupabaseClient, activeOnly = true) {
  let query = supabase.from("blog_authors").select("*").order("full_name");
  if (activeOnly) query = query.eq("active", true);
  const { data, error } = await query;
  if (error) return [];
  return (data ?? []).map((row) => mapBlogAuthor(row));
}

export async function getBlogCategories(supabase: SupabaseClient) {
  const { data, error } = await supabase
    .from("blog_categories")
    .select("id, name, slug, description, active")
    .eq("active", true)
    .order("name");
  if (error) return [];
  return (data ?? []).map((row) => mapBlogCategory(row));
}

export function estimateReadingTime(content: string) {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 220));
}
