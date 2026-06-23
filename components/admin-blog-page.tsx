"use client";

import { Edit3, Eye, FileText, ImageIcon, Plus, Save, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { AdminHeading, AdminShell } from "@/components/admin-shell";
import type { BlogAuthor, BlogCategory, BlogPost } from "@/lib/blog";

const emptyPost = (): BlogPost => ({ id: "", title: "", slug: "", excerpt: "", content: "", authorName: "Quero Ostra", status: "draft", tags: [], readingTime: 5 });

export function AdminBlogPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [categories, setCategories] = useState<BlogCategory[]>([]);
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [form, setForm] = useState<BlogPost>(emptyPost());
  const [categoryName, setCategoryName] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const response = await fetch("/api/admin/blog", { cache: "no-store" });
    const data = (await response.json()) as { posts?: BlogPost[]; categories?: BlogCategory[]; authors?: BlogAuthor[]; error?: string };
    if (!response.ok) { setError(data.error ?? "Falha ao carregar blog."); return; }
    setPosts(data.posts ?? []); setCategories(data.categories ?? []); setAuthors(data.authors ?? []);
  }
  useEffect(() => { void load(); }, []);
  const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  async function savePost() {
    setMessage(""); setError("");
    const response = await fetch("/api/admin/blog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "post", data: { ...form, id: form.id || undefined, categoryId: form.categoryId || null, tags: form.tags } }) });
    const data = (await response.json()) as { saved?: boolean; error?: string };
    if (!response.ok) { setError(data.error ?? "Falha ao salvar artigo."); return; }
    setMessage("Artigo salvo."); setForm(emptyPost()); await load();
  }
  async function addCategory() {
    if (!categoryName.trim()) return;
    const response = await fetch("/api/admin/blog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "category", data: { name: categoryName, slug: slugify(categoryName), description: "", active: true } }) });
    if (response.ok) { setCategoryName(""); await load(); }
  }
  async function remove(id: string, type: "post" | "category") {
    if (!confirm("Excluir este registro?")) return;
    await fetch(`/api/admin/blog?id=${id}&type=${type}`, { method: "DELETE" }); await load();
  }
  async function uploadImage(file?: File) {
    if (!file) return;
    const body = new FormData(); body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await response.json()) as { url?: string };
    if (data.url) setForm({ ...form, featuredImage: data.url });
  }

  return <AdminShell>
    <AdminHeading eyebrow="Conteúdo" title="Blog" description="Publique artigos, categorias e metadados para busca orgânica e mecanismos de IA." />
    <div className="mt-7 grid gap-6 xl:grid-cols-[1fr_360px]">
      <section className="admin-panel">
        <h2 className="admin-panel-title"><FileText size={20} /> {form.id ? "Editar artigo" : "Novo artigo"}</h2>
        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <label className="field-label md:col-span-2">Título<input className="field" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} /></label>
          <label className="field-label">Slug<input className="field" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></label>
          <label className="field-label">Categoria<select className="field" value={form.categoryId ?? ""} onChange={(e) => setForm({ ...form, categoryId: e.target.value || undefined })}><option value="">Sem categoria</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
          <label className="field-label md:col-span-2">Resumo<textarea className="field min-h-24" value={form.excerpt} onChange={(e) => setForm({ ...form, excerpt: e.target.value })} /></label>
          <label className="field-label md:col-span-2">Conteúdo em Markdown<textarea className="field min-h-[420px] font-mono text-sm leading-6" value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} placeholder={'## Título da seção\n\nParágrafo do artigo.\n\n- Item de lista\n- Outro item'} /></label>
          <label className="field-label">Autor<select className="field" value={form.authorId ?? ""} onChange={(e) => { const author = authors.find((item) => item.id === e.target.value); setForm({ ...form, authorId: author?.id, author, authorName: author?.fullName ?? "Quero Ostra" }); }}><option value="">Autoria institucional</option>{authors.filter((author) => author.active).map((author) => <option key={author.id} value={author.id}>{author.fullName}{author.jobTitle ? ` - ${author.jobTitle}` : ""}</option>)}</select></label>
          <label className="field-label">Status<select className="field" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as BlogPost["status"] })}><option value="draft">Rascunho</option><option value="published">Publicado</option></select></label>
          <label className="field-label">Palavra-chave principal<input className="field" value={form.focusKeyword ?? ""} onChange={(e) => setForm({ ...form, focusKeyword: e.target.value })} /></label>
          <label className="field-label">Tags, separadas por vírgula<input className="field" value={form.tags.join(", ")} onChange={(e) => setForm({ ...form, tags: e.target.value.split(",").map((tag) => tag.trim()).filter(Boolean) })} /></label>
          <label className="field-label md:col-span-2">SEO title<input className="field" value={form.seoTitle ?? ""} onChange={(e) => setForm({ ...form, seoTitle: e.target.value })} /></label>
          <label className="field-label md:col-span-2">SEO description<textarea maxLength={160} className="field min-h-24" value={form.seoDescription ?? ""} onChange={(e) => setForm({ ...form, seoDescription: e.target.value })} /></label>
        </div>
        <div className="mt-6 flex gap-3"><button onClick={savePost} className="gold-button"><Save size={16} /> Salvar artigo</button>{form.id && <button onClick={() => setForm(emptyPost())} className="outline-button">Cancelar</button>}</div>
        {message && <p className="mt-3 text-sm text-emerald-200">{message}</p>}{error && <p className="mt-3 text-sm text-red-200">{error}</p>}
      </section>
      <aside className="space-y-6">
        <section className="admin-panel"><h2 className="admin-panel-title"><ImageIcon size={20} /> Imagem destacada</h2><label className="relative mt-4 grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-xl border border-dashed border-gold/25">{form.featuredImage ? <Image src={form.featuredImage} alt="" fill unoptimized={form.featuredImage.startsWith("http")} className="object-cover" sizes="320px" /> : <span className="text-xs text-white/35">Selecionar imagem</span>}<input type="file" accept="image/*" className="sr-only" onChange={(e) => void uploadImage(e.target.files?.[0])} /></label><label className="field-label mt-4">Texto alternativo<input className="field" value={form.imageAlt ?? ""} onChange={(e) => setForm({ ...form, imageAlt: e.target.value })} /></label></section>
        <section className="admin-panel"><h2 className="admin-panel-title"><Plus size={20} /> Categorias</h2><div className="mt-4 flex gap-2"><input className="field" value={categoryName} onChange={(e) => setCategoryName(e.target.value)} placeholder="Nova categoria" /><button onClick={addCategory} className="admin-icon-button"><Plus size={15} /></button></div><div className="mt-4 divide-y divide-white/10">{categories.map((category) => <div key={category.id} className="flex items-center justify-between py-3 text-sm text-white/55"><span>{category.name}</span><button onClick={() => remove(category.id, "category")} className="text-red-200"><Trash2 size={14} /></button></div>)}</div></section>
      </aside>
    </div>
    <section className="mt-7 overflow-x-auto rounded-2xl border border-white/10 bg-[#0A0A0A] p-5"><table className="admin-table min-w-[850px]"><thead><tr><th>Artigo</th><th>Categoria</th><th>Status</th><th>Data</th><th /></tr></thead><tbody>{posts.map((post) => <tr key={post.id}><td className="font-semibold text-pearl">{post.title}<span className="block text-[0.62rem] text-white/25">/{post.slug}</span></td><td>{post.category?.name ?? "-"}</td><td className={post.status === "published" ? "text-emerald-200" : "text-amber-200"}>{post.status === "published" ? "Publicado" : "Rascunho"}</td><td>{post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("pt-BR") : "-"}</td><td><div className="flex gap-2"><Link href={`/blog/${post.slug}`} target="_blank" rel="noopener noreferrer" className="admin-icon-button" title="Visualizar artigo"><Eye size={14} /></Link><button onClick={() => { setForm(post); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="admin-icon-button" title="Editar artigo"><Edit3 size={14} /></button><button onClick={() => remove(post.id, "post")} className="admin-icon-button text-red-200" title="Excluir artigo"><Trash2 size={14} /></button></div></td></tr>)}</tbody></table></section>
  </AdminShell>;
}
