import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, CalendarDays, Clock3, Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBlogCategories, getPublishedBlogPosts } from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://queroostra.com.br";
const POSTS_PER_PAGE = 9;
export const revalidate = 300;

export const metadata: Metadata = {
  title: "Blog sobre Ostras em São Paulo | Quero Ostra",
  description: "Guias sobre ostras, onde comer ostras em São Paulo, delivery, harmonização, conservação e experiências na Zona Sul e Zona Leste.",
  alternates: { canonical: `${SITE_URL}/blog` },
  openGraph: {
    type: "website",
    url: `${SITE_URL}/blog`,
    title: "Blog sobre Ostras em São Paulo | Quero Ostra",
    description: "Conteúdo especializado sobre ostras, delivery e experiências em São Paulo.",
    images: [{ url: `${SITE_URL}/images/hero-oysters.png`, width: 1200, height: 630, alt: "Ostras em São Paulo" }],
  },
};

export default async function BlogPage({ searchParams }: { searchParams: Promise<{ q?: string; categoria?: string; pagina?: string }> }) {
  const params = await searchParams;
  const admin = createAdminClient();
  const [posts, categories] = admin
    ? await Promise.all([getPublishedBlogPosts(admin), getBlogCategories(admin)])
    : [[], []];
  const query = (params.q ?? "").trim().toLowerCase();
  const categorySlug = params.categoria ?? "";
  const filtered = posts.filter((post) => {
    const matchesQuery = !query || `${post.title} ${post.excerpt} ${post.tags.join(" ")}`.toLowerCase().includes(query);
    const matchesCategory = !categorySlug || post.category?.slug === categorySlug;
    return matchesQuery && matchesCategory;
  });
  const totalPages = Math.max(1, Math.ceil(filtered.length / POSTS_PER_PAGE));
  const currentPage = Math.min(totalPages, Math.max(1, Number(params.pagina) || 1));
  const visiblePosts = filtered.slice((currentPage - 1) * POSTS_PER_PAGE, currentPage * POSTS_PER_PAGE);
  const listJsonLd = {
    "@context": "https://schema.org",
    "@type": "Blog",
    name: "Blog Quero Ostra",
    url: `${SITE_URL}/blog`,
    description: metadata.description,
    blogPost: visiblePosts.map((post) => ({ "@type": "BlogPosting", headline: post.title, url: `${SITE_URL}/blog/${post.slug}`, datePublished: post.publishedAt })),
  };

  const pageHref = (page: number) => {
    const next = new URLSearchParams();
    if (params.q) next.set("q", params.q);
    if (categorySlug) next.set("categoria", categorySlug);
    if (page > 1) next.set("pagina", String(page));
    return `/blog${next.size ? `?${next.toString()}` : ""}`;
  };

  return (
    <main className="min-h-screen bg-ink text-pearl">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(listJsonLd) }} />
      <SiteHeader />
      <section className="relative min-h-[430px] overflow-hidden border-b border-white/10">
        <Image src="/images/hero-oysters.png" alt="Conteúdos sobre ostras em São Paulo" fill priority className="object-cover opacity-45" sizes="100vw" />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/75 to-black/30" />
        <div className="relative mx-auto flex min-h-[430px] max-w-[1280px] items-center px-5 py-20 md:px-8">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">Conteúdo Quero Ostra</p>
            <h1 className="mt-5 font-display text-5xl leading-[.95] md:text-7xl">O universo das ostras em São Paulo</h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-white/60">Guias, lugares, delivery, harmonizações e tudo o que você precisa saber para viver uma experiência especial com ostras.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1280px] gap-10 px-5 py-16 md:px-8 lg:grid-cols-[1fr_310px] lg:py-24">
        <div>
          <div className="flex items-end justify-between gap-4 border-b border-white/10 pb-6">
            <div><p className="text-xs uppercase tracking-[0.18em] text-gold">Publicações</p><h2 className="mt-2 font-display text-4xl">Artigos recentes</h2></div>
            <span className="text-xs text-white/35">{filtered.length} artigo(s)</span>
          </div>
          {visiblePosts.length > 0 ? (
            <div className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
              {visiblePosts.map((post) => <ArticleCard key={post.id} post={post} />)}
            </div>
          ) : (
            <div className="mt-8 rounded-2xl border border-white/10 p-10 text-center"><p className="font-display text-3xl">Nenhum artigo encontrado</p><p className="mt-3 text-sm text-white/40">Publique artigos no admin ou ajuste os filtros.</p></div>
          )}
          {totalPages > 1 && <nav className="mt-10 flex items-center justify-center gap-3" aria-label="Paginação do blog">
            {currentPage > 1 && <Link href={pageHref(currentPage - 1)} className="carousel-arrow" aria-label="Página anterior"><ArrowLeft size={17} /></Link>}
            {Array.from({ length: totalPages }, (_, index) => <Link key={index} href={pageHref(index + 1)} className={`grid size-10 place-items-center rounded-full border text-xs ${currentPage === index + 1 ? "border-gold bg-gold text-ink" : "border-white/10 text-white/45"}`}>{index + 1}</Link>)}
            {currentPage < totalPages && <Link href={pageHref(currentPage + 1)} className="carousel-arrow" aria-label="Próxima página"><ArrowRight size={17} /></Link>}
          </nav>}
        </div>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <section className="rounded-2xl border border-white/10 bg-[#080808] p-5">
            <h2 className="font-display text-2xl">Buscar no blog</h2>
            <form action="/blog" className="relative mt-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gold" size={17} />
              <input name="q" defaultValue={params.q} className="field pl-11" placeholder="Ex.: ostra delivery" aria-label="Buscar artigos" />
            </form>
          </section>
          <section className="rounded-2xl border border-white/10 bg-[#080808] p-5">
            <h2 className="font-display text-2xl">Categorias</h2>
            <div className="mt-4 divide-y divide-white/10">
              <Link href="/blog" className={`flex justify-between py-3 text-sm ${!categorySlug ? "text-gold" : "text-white/50"}`}><span>Todos os artigos</span><span>{posts.length}</span></Link>
              {categories.map((category) => <Link key={category.id} href={`/blog?categoria=${category.slug}`} className={`flex justify-between gap-4 py-3 text-sm transition hover:text-gold ${categorySlug === category.slug ? "text-gold" : "text-white/50"}`}><span>{category.name}</span><span>{posts.filter((post) => post.categoryId === category.id).length}</span></Link>)}
            </div>
          </section>
          <Link href="/cardapio" className="block rounded-2xl border border-gold/30 bg-gold/[0.06] p-6"><p className="text-xs uppercase tracking-[0.15em] text-gold">Experiência em casa</p><h2 className="mt-3 font-display text-3xl">Conheça nosso cardápio</h2><span className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.13em] text-champagne">Ver experiências <ArrowRight size={14} /></span></Link>
        </aside>
      </section>
      <SiteFooter />
    </main>
  );
}

function ArticleCard({ post }: { post: Awaited<ReturnType<typeof getPublishedBlogPosts>>[number] }) {
  return (
    <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#080808] transition hover:border-gold/40">
      <Link href={`/blog/${post.slug}`} className="relative aspect-[16/10] overflow-hidden bg-charcoal">
        <Image src={post.featuredImage ?? "/images/hero-oysters.png"} alt={post.imageAlt || post.title} fill unoptimized={post.featuredImage?.startsWith("http")} className="object-cover transition duration-700 group-hover:scale-105" sizes="(max-width: 767px) 100vw, 33vw" />
      </Link>
      <div className="flex flex-1 flex-col p-5">
        <p className="text-[0.6rem] font-semibold uppercase tracking-[0.14em] text-gold">{post.category?.name ?? "Ostras"}</p>
        <h3 className="mt-3 font-display text-2xl leading-tight"><Link href={`/blog/${post.slug}`}>{post.title}</Link></h3>
        <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/45">{post.excerpt}</p>
        <div className="mt-5 flex gap-4 border-t border-white/10 pt-4 text-[0.62rem] text-white/30"><span className="flex items-center gap-1"><CalendarDays size={13} /> {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("pt-BR") : "Em breve"}</span><span className="flex items-center gap-1"><Clock3 size={13} /> {post.readingTime} min</span></div>
        <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-champagne">Ler mais <ArrowRight size={14} /></Link>
      </div>
    </article>
  );
}
