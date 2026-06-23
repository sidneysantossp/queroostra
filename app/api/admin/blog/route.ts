import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminContext } from "@/lib/admin-auth";
import { estimateReadingTime, mapBlogAuthor, mapBlogCategory, mapBlogPost } from "@/lib/blog";

const categorySchema = z.object({ id: z.uuid().optional(), name: z.string().min(2), slug: z.string().min(2), description: z.string(), active: z.boolean() });
const postSchema = z.object({
  id: z.uuid().optional(), categoryId: z.uuid().nullable().optional(), authorId: z.uuid().nullable().optional(), title: z.string().min(5), slug: z.string().min(3), excerpt: z.string().min(20), content: z.string().min(50), featuredImage: z.string().optional(), imageAlt: z.string().optional(), authorName: z.string().min(2), status: z.enum(["draft", "published"]), publishedAt: z.string().nullable().optional(), seoTitle: z.string().optional(), seoDescription: z.string().optional(), focusKeyword: z.string().optional(), tags: z.array(z.string()),
});
const authorSchema = z.object({
  id: z.uuid().optional(), fullName: z.string().min(3), slug: z.string().min(3), jobTitle: z.string().min(3), shortBio: z.string().min(20), biography: z.string().min(50), photoUrl: z.string().optional(), photoAlt: z.string().optional(), education: z.array(z.string()), certifications: z.array(z.string()), awards: z.array(z.string()), expertise: z.array(z.string()), linkedinUrl: z.string().optional(), instagramUrl: z.string().optional(), portfolioUrl: z.string().optional(), active: z.boolean(),
});

export async function GET() {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ categories: [], posts: [], authors: [], demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const [categoriesResult, postsResult, authorsResult] = await Promise.all([
    context.supabase.from("blog_categories").select("*").order("name"),
    context.supabase.from("blog_posts").select("*, blog_categories(id, name, slug, description, active), blog_authors(*)").order("created_at", { ascending: false }),
    context.supabase.from("blog_authors").select("*").order("full_name"),
  ]);
  if (categoriesResult.error || postsResult.error || authorsResult.error) return NextResponse.json({ error: "Execute as migracoes 005_blog.sql e 006_blog_authors.sql antes de usar o blog." }, { status: 500 });
  return NextResponse.json({ categories: (categoriesResult.data ?? []).map(mapBlogCategory), posts: (postsResult.data ?? []).map(mapBlogPost), authors: (authorsResult.data ?? []).map(mapBlogAuthor) });
}

export async function POST(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ saved: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const body = await request.json();
  if (body.type === "category") {
    const parsed = categorySchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: "Categoria invalida." }, { status: 400 });
    const item = parsed.data;
    const row = { name: item.name, slug: item.slug, description: item.description, active: item.active };
    const query = item.id ? context.supabase.from("blog_categories").update(row).eq("id", item.id) : context.supabase.from("blog_categories").insert(row);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Ja existe uma categoria com esse slug." : "Falha ao salvar categoria." }, { status: 500 });
    return NextResponse.json({ saved: true });
  }
  if (body.type === "author") {
    const parsed = authorSchema.safeParse(body.data);
    if (!parsed.success) return NextResponse.json({ error: "Revise os campos obrigatorios do autor." }, { status: 400 });
    const author = parsed.data;
    const row = { full_name: author.fullName, slug: author.slug, job_title: author.jobTitle, short_bio: author.shortBio, biography: author.biography, photo_url: author.photoUrl || null, photo_alt: author.photoAlt || null, education: author.education, certifications: author.certifications, awards: author.awards, expertise: author.expertise, linkedin_url: author.linkedinUrl || null, instagram_url: author.instagramUrl || null, portfolio_url: author.portfolioUrl || null, active: author.active };
    const query = author.id ? context.supabase.from("blog_authors").update(row).eq("id", author.id) : context.supabase.from("blog_authors").insert(row);
    const { error } = await query;
    if (error) return NextResponse.json({ error: error.code === "23505" ? "Ja existe um autor com esse slug." : "Falha ao salvar autor." }, { status: 500 });
    return NextResponse.json({ saved: true });
  }
  const parsed = postSchema.safeParse(body.data);
  if (!parsed.success) return NextResponse.json({ error: "Revise os campos obrigatorios do artigo." }, { status: 400 });
  const post = parsed.data;
  const row = { category_id: post.categoryId || null, author_id: post.authorId || null, title: post.title, slug: post.slug, excerpt: post.excerpt, content: post.content, featured_image: post.featuredImage || null, image_alt: post.imageAlt || null, author_name: post.authorName, status: post.status, published_at: post.status === "published" ? post.publishedAt || new Date().toISOString() : post.publishedAt || null, seo_title: post.seoTitle || null, seo_description: post.seoDescription || null, focus_keyword: post.focusKeyword || null, tags: post.tags, reading_time: estimateReadingTime(post.content) };
  const query = post.id ? context.supabase.from("blog_posts").update(row).eq("id", post.id) : context.supabase.from("blog_posts").insert(row);
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.code === "23505" ? "Ja existe um artigo com esse slug." : "Falha ao salvar artigo." }, { status: 500 });
  return NextResponse.json({ saved: true });
}

export async function DELETE(request: Request) {
  const context = await getAdminContext();
  if (!context.configured) return NextResponse.json({ deleted: true, demo: true });
  if (!context.user) return NextResponse.json({ error: "Acesso negado." }, { status: 403 });
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  const requestedType = url.searchParams.get("type");
  const type = requestedType === "category" ? "blog_categories" : requestedType === "author" ? "blog_authors" : "blog_posts";
  if (!id || !z.uuid().safeParse(id).success) return NextResponse.json({ error: "Registro invalido." }, { status: 400 });
  const { error } = await context.supabase.from(type).delete().eq("id", id);
  if (error) return NextResponse.json({ error: "Falha ao excluir registro." }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
