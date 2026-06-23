import type { Metadata } from "next";
import { ArrowRight, Award, BookOpen, ExternalLink, GraduationCap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { getBlogAuthors, getPublishedBlogPosts } from "@/lib/blog";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://queroostra.com.br";
export const revalidate = 300;

async function getAuthor(slug: string) {
  const admin = createAdminClient();
  return admin ? (await getBlogAuthors(admin)).find((author) => author.slug === slug) : undefined;
}
export async function generateStaticParams() {
  const admin = createAdminClient();
  return admin ? (await getBlogAuthors(admin)).map((author) => ({ slug: author.slug })) : [];
}
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const author = await getAuthor((await params).slug);
  if (!author) return {};
  const canonical = `${SITE_URL}/blog/autor/${author.slug}`;
  return { title: `${author.fullName}, ${author.jobTitle} | Quero Ostra`, description: author.shortBio, alternates: { canonical }, authors: [{ name: author.fullName, url: canonical }], openGraph: { type: "profile", url: canonical, title: author.fullName, description: author.shortBio, images: author.photoUrl ? [{ url: author.photoUrl, alt: author.photoAlt || author.fullName }] : undefined } };
}

export default async function AuthorPage({ params }: { params: Promise<{ slug: string }> }) {
  const author = await getAuthor((await params).slug);
  if (!author) notFound();
  const admin = createAdminClient();
  const posts = admin ? (await getPublishedBlogPosts(admin)).filter((post) => post.authorId === author.id) : [];
  const canonical = `${SITE_URL}/blog/autor/${author.slug}`;
  const sameAs = [author.linkedinUrl, author.instagramUrl, author.portfolioUrl].filter(Boolean) as string[];
  const schema = { "@context": "https://schema.org", "@type": "ProfilePage", "@id": `${canonical}#profilepage`, url: canonical, name: `Perfil de ${author.fullName}`, mainEntity: { "@type": "Person", "@id": `${canonical}#person`, name: author.fullName, url: canonical, image: author.photoUrl, jobTitle: author.jobTitle, description: author.shortBio, sameAs, knowsAbout: author.expertise, alumniOf: author.education.map((name) => ({ "@type": "EducationalOrganization", name })), hasCredential: author.certifications.map((name) => ({ "@type": "EducationalOccupationalCredential", name, credentialCategory: "certification" })), award: author.awards, worksFor: { "@type": "Organization", name: "Quero Ostra", url: SITE_URL } } };
  return <main className="min-h-screen bg-ink text-pearl">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><SiteHeader />
    <header className="border-b border-white/10 bg-[radial-gradient(circle_at_20%_20%,rgba(214,171,49,.12),transparent_35%)]"><div className="mx-auto grid max-w-[1180px] gap-10 px-5 py-16 md:grid-cols-[300px_1fr] md:px-8 md:py-24">
      <div className="relative aspect-square overflow-hidden rounded-2xl border border-gold/25 bg-charcoal">{author.photoUrl ? <Image src={author.photoUrl} alt={author.photoAlt || author.fullName} fill priority unoptimized={author.photoUrl.startsWith("http")} className="object-cover" sizes="300px" /> : <div className="grid h-full place-items-center text-white/20">Foto do autor</div>}</div>
      <div className="self-center"><nav className="text-[0.62rem] uppercase tracking-[0.15em] text-white/35"><Link href="/">Inicio</Link> / <Link href="/blog">Blog</Link> / <span className="text-gold">Autor</span></nav><p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-gold">Autor e especialista</p><h1 className="mt-3 font-display text-5xl leading-none md:text-7xl">{author.fullName}</h1><p className="mt-4 text-lg text-champagne">{author.jobTitle}</p><p className="mt-6 max-w-3xl text-base leading-8 text-white/55">{author.shortBio}</p><div className="mt-7 flex flex-wrap gap-3">{sameAs.map((url) => <a key={url} href={url} target="_blank" rel="me noreferrer" className="outline-button inline-flex">Perfil profissional <ExternalLink size={14} /></a>)}</div></div>
    </div></header>
    <section className="mx-auto grid max-w-[1180px] gap-12 px-5 py-16 md:grid-cols-[1fr_380px] md:px-8 md:py-24"><div><p className="text-xs uppercase tracking-[0.18em] text-gold">Trajetoria</p><h2 className="mt-3 font-display text-4xl">Experiencia e conexao com o tema</h2>{author.biography.split("\n").filter(Boolean).map((paragraph) => <p key={paragraph} className="mt-6 text-base leading-8 text-white/55">{paragraph}</p>)}</div><aside className="space-y-4">{author.education.length > 0 && <Credential title="Formacao" icon={<GraduationCap size={18} />} items={author.education} />}{author.certifications.length > 0 && <Credential title="Certificacoes" icon={<BookOpen size={18} />} items={author.certifications} />}{author.awards.length > 0 && <Credential title="Premios" icon={<Award size={18} />} items={author.awards} />}{author.expertise.length > 0 && <Credential title="Areas de conhecimento" icon={<BookOpen size={18} />} items={author.expertise} />}</aside></section>
    <section className="border-t border-white/10 bg-charcoal"><div className="mx-auto max-w-[1180px] px-5 py-20 md:px-8"><p className="text-xs uppercase tracking-[0.18em] text-gold">Producao editorial</p><h2 className="mt-3 font-display text-4xl md:text-5xl">Artigos de {author.fullName}</h2><div className="mt-9 grid gap-6 md:grid-cols-3">{posts.map((post) => <Link key={post.id} href={`/blog/${post.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#080808] hover:border-gold/40"><div className="relative aspect-[16/10]"><Image src={post.featuredImage ?? "/images/hero-oysters.png"} alt={post.imageAlt || post.title} fill unoptimized={post.featuredImage?.startsWith("http")} className="object-cover transition duration-500 group-hover:scale-105" sizes="33vw" /></div><div className="p-5"><p className="text-[0.6rem] uppercase tracking-[0.14em] text-gold">{post.category?.name}</p><h3 className="mt-2 font-display text-2xl leading-tight">{post.title}</h3><span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.13em] text-champagne">Ler artigo <ArrowRight size={14} /></span></div></Link>)}</div>{posts.length === 0 && <p className="mt-8 text-white/40">Nenhum artigo publicado por este autor ainda.</p>}</div></section>
    <SiteFooter />
  </main>;
}

function Credential({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return <section className="rounded-2xl border border-white/10 bg-[#080808] p-6"><h2 className="flex items-center gap-3 text-sm font-semibold uppercase tracking-[0.13em] text-gold">{icon}{title}</h2><ul className="mt-4 space-y-3 text-sm leading-6 text-white/50">{items.map((item) => <li key={item} className="border-t border-white/10 pt-3 first:border-0 first:pt-0">{item}</li>)}</ul></section>;
}
