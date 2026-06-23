"use client";

import {
  CalendarRange,
  BookOpenText,
  ChevronRight,
  CircleDollarSign,
  FileText,
  Gauge,
  LayoutDashboard,
  MapPinned,
  Menu,
  Package,
  PackageCheck,
  Settings,
  ShieldCheck,
  Tags,
  TicketPercent,
  UserRound,
  Users,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import { OysterLogo } from "@/components/oyster-logo";

const adminNavigation = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/pedidos", label: "Pedidos", icon: PackageCheck },
  { href: "/admin/produtos", label: "Produtos", icon: Package },
  { href: "/admin/adicionais", label: "Adicionais", icon: Tags },
  { href: "/admin/cupons", label: "Cupons", icon: TicketPercent },
  { href: "/admin/blog", label: "Blog", icon: BookOpenText },
  { href: "/admin/autores", label: "Autores", icon: UserRound },
  { href: "/admin/usuarios", label: "Usuários", icon: Users },
  { href: "/admin/entregas", label: "Áreas de entrega", icon: MapPinned },
  { href: "/admin/calendario", label: "Calendário", icon: CalendarRange },
  { href: "/admin/pagamentos", label: "Pagamentos", icon: CircleDollarSign },
  { href: "/admin/conteudos", label: "Conteúdos", icon: FileText },
  { href: "/admin/configuracoes", label: "Configurações", icon: Settings },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <main className="min-h-screen bg-[#060606] text-pearl">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#070707]/95 backdrop-blur lg:left-72">
        <div className="flex h-18 items-center justify-between px-5 py-4 md:px-8">
          <button type="button" onClick={() => setMenuOpen(true)} className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden">
            <Menu size={19} />
          </button>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-gold">Administração</p>
            <p className="mt-1 text-xs text-white/40">Operação Quero Ostra</p>
          </div>
          <div className="flex items-center gap-3 rounded-full border border-emerald-400/20 bg-emerald-400/[0.05] px-4 py-2 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-emerald-200">
            <span className="size-2 rounded-full bg-emerald-400" />
            Operação online
          </div>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-[60] flex w-72 flex-col border-r border-white/10 bg-[#080808] p-5 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-14 items-center justify-between">
          <Link href="/"><OysterLogo /></Link>
          <button type="button" onClick={() => setMenuOpen(false)} className="lg:hidden"><X size={20} /></button>
        </div>
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-gold/20 bg-gold/[0.05] p-4">
          <span className="grid size-10 place-items-center rounded-full bg-gold text-ink"><ShieldCheck size={19} /></span>
          <div><p className="text-sm font-semibold">Administrador</p><p className="mt-1 text-[0.62rem] text-white/35">Acesso total</p></div>
        </div>

        <nav className="mt-6 flex-1 space-y-1 overflow-y-auto">
          {adminNavigation.map((item) => {
            const active = item.href === "/admin" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3 text-[0.78rem] transition ${active ? "bg-gold text-ink" : "text-white/45 hover:bg-white/[0.04] hover:text-white"}`}
              >
                <item.icon size={17} />{item.label}
              </Link>
            );
          })}
        </nav>
        <Link href="/dashboard" className="mt-4 flex items-center justify-between rounded-xl border border-white/10 px-4 py-3 text-xs text-white/45 transition hover:border-gold/30 hover:text-gold">
          Área do cliente <ChevronRight size={15} />
        </Link>
      </aside>

      {menuOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-50 bg-black/70 lg:hidden" />}

      <div className="min-h-screen pt-20 lg:ml-72">
        <div className="mx-auto max-w-[1440px] px-5 py-7 md:px-8 md:py-9">{children}</div>
      </div>
    </main>
  );
}

export function AdminHeading({ eyebrow, title, description, action }: { eyebrow: string; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
      <div>
        <p className="text-[0.62rem] font-semibold uppercase tracking-[0.19em] text-gold">{eyebrow}</p>
        <h1 className="mt-2 font-display text-4xl md:text-5xl">{title}</h1>
        {description && <p className="mt-3 max-w-2xl text-sm leading-7 text-white/40">{description}</p>}
      </div>
      {action}
    </div>
  );
}
