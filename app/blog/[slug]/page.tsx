import type { Metadata } from "next";
import { ArrowRight, CalendarDays, Clock3, Facebook, Linkedin, MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogContent } from "@/components/blog-content";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getPublishedBlogPosts } from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://queroostra.com.br";
export const revalidate = 300;

async function getPost(slug: string) {
  const admin = createAdminClient();
  if (!admin) return undefined;
  return (await getPublishedBlogPosts(admin)).find((post) => post.slug === slug);
}

export async function generateStaticParams() {
  const admin = createAdminClient();
  if (!admin) return [];
  return (await getPublishedBlogPosts(admin)).map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = await getPost((await params).slug);
  if (!post) return {};
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const title = post.seoTitle || `${post.title} | Blog Quero Ostra`;
  const description = post.seoDescription || post.excerpt;
  return {
    title, description, alternates: { canonical },
    keywords: [post.focusKeyword, ...post.tags].filter(Boolean) as string[],
    authors: [{ name: post.authorName, url: post.author ? `${SITE_URL}/blog/autor/${post.author.slug}` : SITE_URL }],
    openGraph: { type: "article", url: canonical, title, description, publishedTime: post.publishedAt, modifiedTime: post.updatedAt, authors: [post.authorName], tags: post.tags, images: [{ url: post.featuredImage ?? `${SITE_URL}/images/hero-oysters.png`, width: 1200, height: 630, alt: post.imageAlt || post.title }] },
    twitter: { card: "summary_large_image", title, description, images: [post.featuredImage ?? `${SITE_URL}/images/hero-oysters.png`] },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const post = await getPost((await params).slug);
  if (!post) notFound();
  const admin = createAdminClient();
  const allPosts = admin ? await getPublishedBlogPosts(admin) : [];
  const related = allPosts.filter((item) => item.slug !== post.slug && item.categoryId === post.categoryId).slice(0, 3);
  const canonical = `${SITE_URL}/blog/${post.slug}`;
  const image = post.featuredImage ?? "/images/hero-oysters.png";
  const absoluteImage = image.startsWith("http") ? image : `${SITE_URL}${image}`;
  const articleJsonLd = {
    "@context": "https://schema.org", "@type": "BlogPosting", "@id": `${canonical}#article`,
    headline: post.title, description: post.seoDescription || post.excerpt, image: [absoluteImage],
    datePublished: post.publishedAt, dateModified: post.updatedAt || post.publishedAt,
    author: post.author ? { "@type": "Person", "@id": `${SITE_URL}/blog/autor/${post.author.slug}#person`, name: post.author.fullName, url: `${SITE_URL}/blog/autor/${post.author.slug}`, jobTitle: post.author.jobTitle, image: post.author.photoUrl, sameAs: [post.author.linkedinUrl, post.author.instagramUrl, post.author.portfolioUrl].filter(Boolean) } : { "@type": "Organization", name: post.authorName, url: SITE_URL },
    publisher: { "@type": "Organization", name: "Quero Ostra", url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/icon.svg` } },
    mainEntityOfPage: { "@type": "WebPage", "@id": canonical }, articleSection: post.category?.name, keywords: [post.focusKeyword, ...post.tags].filter(Boolean).join(", "), wordCount: post.content.split(/\s+/).length, inLanguage: "pt-BR",
  };
  const breadcrumbJsonLd = { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
    { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
    { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
    { "@type": "ListItem", position: 3, name: post.title, item: canonical },
  ] };
  const share = [
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(canonical)}`, Icon: Facebook },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${post.title} ${canonical}`)}`, Icon: MessageCircle },
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(canonical)}`, Icon: Linkedin },
  ];

  return (
    <main className="min-h-screen bg-ink text-pearl">
      {[articleJsonLd, breadcrumbJsonLd].map((data, index) => <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />)}
      <SiteHeader />
      <article>
        <header className="mx-auto max-w-[1100px] px-5 pb-10 pt-12 text-center md:px-8 md:pt-16">
          <nav aria-label="Breadcrumb" className="flex flex-wrap justify-center gap-2 text-[0.62rem] uppercase tracking-[0.13em] text-white/35"><Link href="/">Início</Link><span>/</span><Link href="/blog">Blog</Link><span>/</span><span className="text-gold">{post.category?.name}</span></nav>
          <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-gold">{post.category?.name ?? "Blog Quero Ostra"}</p>
          <h1 className="mx-auto mt-4 max-w-5xl font-display text-5xl leading-[.95] md:text-7xl">{post.title}</h1>
          <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-white/55">{post.excerpt}</p>
          <div className="mt-6 flex flex-wrap justify-center gap-5 text-xs text-white/35"><span className="flex items-center gap-2"><CalendarDays size={14} /> {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("pt-BR") : ""}</span><span className="flex items-center gap-2"><Clock3 size={14} /> {post.readingTime} minutos</span>{post.author ? <Link className="transition hover:text-gold" href={`/blog/autor/${post.author.slug}`}>Por {post.authorName}</Link> : <span>Por {post.authorName}</span>}</div>
          <div className="mt-6 flex justify-center gap-3">{share.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Compartilhar no ${label}`} className="grid size-10 place-items-center rounded-full border border-white/10 text-white/45 transition hover:border-gold hover:text-gold"><Icon size={17} /></a>)}</div>
        </header>

        <div className="mx-auto max-w-[1180px] px-5 md:px-8"><div className="relative aspect-[16/8] overflow-hidden rounded-2xl border border-gold/20"><Image src={image} alt={post.imageAlt || post.title} fill priority unoptimized={image.startsWith("http")} className="object-cover" sizes="100vw" /></div></div>

        <div className="mx-auto max-w-[850px] px-5 py-14 md:px-8 md:py-20">
          <BlogContent content={post.content} middleCta={<Link href="/cardapio" className="my-12 block rounded-2xl border border-gold/30 bg-[linear-gradient(120deg,rgba(214,171,49,.16),rgba(214,171,49,.03))] p-7 md:p-9"><p className="text-xs uppercase tracking-[0.17em] text-gold">Do conteúdo para a mesa</p><h2 className="mt-3 font-display text-3xl md:text-4xl">Conheça as experiências Quero Ostra</h2><p className="mt-3 text-sm leading-7 text-white/50">Escolha sua porção e programe a entrega para a data do seu momento especial.</p><span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.13em] text-champagne">Conhecer o cardápio <ArrowRight size={14} /></span></Link>} />

          {post.author && <Link href={`/blog/autor/${post.author.slug}`} className="mt-12 grid gap-5 rounded-2xl border border-white/10 bg-charcoal p-6 transition hover:border-gold/35 sm:grid-cols-[88px_1fr]"><div className="relative size-[88px] overflow-hidden rounded-full bg-white/5">{post.author.photoUrl && <Image src={post.author.photoUrl} alt={post.author.photoAlt || post.author.fullName} fill unoptimized={post.author.photoUrl.startsWith("http")} className="object-cover" sizes="88px" />}</div><div><p className="text-[0.62rem] uppercase tracking-[0.15em] text-gold">Sobre o autor</p><h2 className="mt-2 font-display text-2xl">{post.author.fullName}</h2><p className="text-sm text-champagne">{post.author.jobTitle}</p><p className="mt-3 text-sm leading-6 text-white/45">{post.author.shortBio}</p></div></Link>}

          <section className="mt-14 rounded-2xl border border-gold/40 bg-gold-gradient p-7 text-ink md:p-10">
            <p className="text-xs font-bold uppercase tracking-[0.16em]">Sua primeira experiência</p>
            <h2 className="mt-3 font-display text-4xl md:text-5xl">Use o cupom PRIMEIRACOMPRA</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-black/65">Aplique o código no checkout para aproveitar a condição disponível para a primeira compra.</p>
            <Link href="/cardapio" className="mt-6 inline-flex items-center gap-2 rounded-full bg-black px-6 py-3 text-xs font-semibold uppercase tracking-[0.13em] text-champagne">Escolher minhas ostras <ArrowRight size={14} /></Link>
          </section>
          <div className="mt-10 flex items-center justify-between border-y border-white/10 py-5"><span className="text-xs uppercase tracking-[0.13em] text-white/35">Compartilhe este artigo</span><div className="flex gap-2">{share.map(({ label, href, Icon }) => <a key={label} href={href} target="_blank" rel="noreferrer" aria-label={`Compartilhar no ${label}`} className="grid size-9 place-items-center rounded-full border border-white/10 text-white/45 hover:text-gold"><Icon size={15} /></a>)}</div></div>
        </div>
      </article>

      <section className="border-t border-white/10 bg-charcoal"><div className="mx-auto max-w-[1180px] px-5 py-20 text-center md:px-8"><p className="text-xs uppercase tracking-[0.18em] text-gold">Continue lendo</p><h2 className="mt-3 font-display text-4xl md:text-5xl">Recomendado para você</h2><div className="mt-9 grid gap-6 text-left md:grid-cols-3">{related.map((item) => <Link key={item.id} href={`/blog/${item.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#080808] hover:border-gold/40"><div className="relative aspect-[16/10]"><Image src={item.featuredImage ?? "/images/hero-oysters.png"} alt={item.imageAlt || item.title} fill unoptimized={item.featuredImage?.startsWith("http")} className="object-cover transition duration-500 group-hover:scale-105" sizes="33vw" /></div><div className="p-5"><p className="text-[0.6rem] uppercase tracking-[0.14em] text-gold">{item.category?.name}</p><h3 className="mt-2 font-display text-2xl leading-tight">{item.title}</h3><span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.13em] text-champagne">Ler artigo <ArrowRight size={14} /></span></div></Link>)}</div><Link href="/blog" className="outline-button mt-10 inline-flex">Ler mais artigos <ArrowRight size={15} /></Link></div></section>
      <SiteFooter />
    </main>
  );
}
