"use client";

import { useEffect, useState } from "react";
import { AdminAuthorManager } from "@/components/admin-author-manager";
import { AdminHeading, AdminShell } from "@/components/admin-shell";
import type { BlogAuthor } from "@/lib/blog";

export function AdminAuthorsPage() {
  const [authors, setAuthors] = useState<BlogAuthor[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    const response = await fetch("/api/admin/blog", { cache: "no-store" });
    const data = (await response.json()) as { authors?: BlogAuthor[]; error?: string };
    if (!response.ok) {
      setError(data.error ?? "Falha ao carregar autores.");
      return;
    }
    setAuthors(data.authors ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  return (
    <AdminShell>
      <AdminHeading
        eyebrow="Conteúdo"
        title="Autores"
        description="Gerencie os perfis editoriais usados nos artigos, nas páginas públicas de autor e nos dados estruturados."
      />
      {error && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/10 px-4 py-3 text-sm text-red-100">{error}</p>}
      <AdminAuthorManager authors={authors} reload={load} />
    </AdminShell>
  );
}
