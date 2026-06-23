"use client";

import { Award, Edit3, Save, Trash2, UserRound } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import type { BlogAuthor } from "@/lib/blog";

const emptyAuthor = (): BlogAuthor => ({ id: "", fullName: "", slug: "", jobTitle: "", shortBio: "", biography: "", education: [], certifications: [], awards: [], expertise: [], active: true });
const lines = (value: string) => value.split("\n").map((item) => item.trim()).filter(Boolean);

export function AdminAuthorManager({ authors, reload }: { authors: BlogAuthor[]; reload: () => Promise<void> }) {
  const [form, setForm] = useState<BlogAuthor>(emptyAuthor());
  const [message, setMessage] = useState("");
  const slugify = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  async function upload(file?: File) {
    if (!file) return;
    const body = new FormData(); body.append("file", file);
    const response = await fetch("/api/admin/upload", { method: "POST", body });
    const data = (await response.json()) as { url?: string };
    if (data.url) setForm((current) => ({ ...current, photoUrl: data.url }));
  }
  async function save() {
    setMessage("");
    const response = await fetch("/api/admin/blog", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ type: "author", data: { ...form, id: form.id || undefined } }) });
    const data = (await response.json()) as { error?: string };
    setMessage(response.ok ? "Autor salvo." : data.error ?? "Falha ao salvar autor.");
    if (response.ok) { setForm(emptyAuthor()); await reload(); }
  }
  async function remove(id: string) {
    if (!confirm("Excluir este autor? Os artigos permanecerao publicados sem o vinculo.")) return;
    await fetch(`/api/admin/blog?id=${id}&type=author`, { method: "DELETE" }); await reload();
  }
  return <section className="admin-panel mt-7">
    <h2 className="admin-panel-title"><UserRound size={20} /> Autores e autoridade editorial</h2>
    <p className="mt-2 text-sm leading-6 text-white/40">Use foto real, formacao verificavel e links profissionais. Esses dados alimentam a pagina publica e o Schema Person.</p>
    <div className="mt-6 grid gap-6 xl:grid-cols-[220px_1fr]">
      <div><label className="relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-2xl border border-dashed border-gold/30">{form.photoUrl ? <Image src={form.photoUrl} alt={form.photoAlt || form.fullName} fill unoptimized={form.photoUrl.startsWith("http")} className="object-cover" sizes="220px" /> : <span className="px-4 text-center text-xs text-white/35">Foto real e profissional</span>}<input type="file" accept="image/*" className="sr-only" onChange={(event) => void upload(event.target.files?.[0])} /></label><label className="field-label mt-4">Texto alternativo<input className="field" value={form.photoAlt ?? ""} onChange={(e) => setForm({ ...form, photoAlt: e.target.value })} /></label></div>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="field-label">Nome completo<input className="field" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} /></label>
        <label className="field-label">Cargo ou titulo<input className="field" value={form.jobTitle} onChange={(e) => setForm({ ...form, jobTitle: e.target.value })} placeholder="Chef e pesquisador gastronomico" /></label>
        <label className="field-label">Slug<input className="field" value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} /></label>
        <label className="field-label">Especialidades, uma por linha<textarea className="field min-h-24" value={form.expertise.join("\n")} onChange={(e) => setForm({ ...form, expertise: lines(e.target.value) })} /></label>
        <label className="field-label md:col-span-2">Resumo profissional<textarea className="field min-h-24" value={form.shortBio} onChange={(e) => setForm({ ...form, shortBio: e.target.value })} /></label>
        <label className="field-label md:col-span-2">Biografia detalhada e conexao com o nicho<textarea className="field min-h-40" value={form.biography} onChange={(e) => setForm({ ...form, biography: e.target.value })} /></label>
        <label className="field-label">Formacao, uma por linha<textarea className="field min-h-28" value={form.education.join("\n")} onChange={(e) => setForm({ ...form, education: lines(e.target.value) })} /></label>
        <label className="field-label">Certificacoes, uma por linha<textarea className="field min-h-28" value={form.certifications.join("\n")} onChange={(e) => setForm({ ...form, certifications: lines(e.target.value) })} /></label>
        <label className="field-label">Premios, um por linha<textarea className="field min-h-24" value={form.awards.join("\n")} onChange={(e) => setForm({ ...form, awards: lines(e.target.value) })} /></label>
        <div className="grid gap-4"><label className="field-label">LinkedIn<input className="field" value={form.linkedinUrl ?? ""} onChange={(e) => setForm({ ...form, linkedinUrl: e.target.value })} /></label><label className="field-label">Instagram profissional<input className="field" value={form.instagramUrl ?? ""} onChange={(e) => setForm({ ...form, instagramUrl: e.target.value })} /></label><label className="field-label">Portfolio ou site<input className="field" value={form.portfolioUrl ?? ""} onChange={(e) => setForm({ ...form, portfolioUrl: e.target.value })} /></label></div>
        <label className="flex items-center gap-3 text-sm text-white/60"><input type="checkbox" checked={form.active} onChange={(e) => setForm({ ...form, active: e.target.checked })} /> Perfil publico e ativo</label>
      </div>
    </div>
    <div className="mt-6 flex gap-3"><button className="gold-button" onClick={save}><Save size={16} /> Salvar autor</button>{form.id && <button className="outline-button" onClick={() => setForm(emptyAuthor())}>Cancelar</button>}</div>{message && <p className="mt-3 text-sm text-champagne">{message}</p>}
    <div className="mt-7 grid gap-3 md:grid-cols-2">{authors.map((author) => <div key={author.id} className="flex items-center gap-4 rounded-xl border border-white/10 p-4"><div className="relative size-14 shrink-0 overflow-hidden rounded-full bg-white/5">{author.photoUrl ? <Image src={author.photoUrl} alt={author.photoAlt || author.fullName} fill unoptimized={author.photoUrl.startsWith("http")} className="object-cover" sizes="56px" /> : <UserRound className="m-4 text-white/25" />}</div><div className="min-w-0 flex-1"><strong className="block truncate text-sm text-pearl">{author.fullName}</strong><span className="block truncate text-xs text-white/35">{author.jobTitle}</span></div><button className="admin-icon-button" onClick={() => setForm(author)}><Edit3 size={14} /></button><button className="admin-icon-button text-red-200" onClick={() => remove(author.id)}><Trash2 size={14} /></button></div>)}</div>
  </section>;
}
