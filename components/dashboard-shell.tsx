"use client";

import {
  CalendarDays,
  ChevronRight,
  Home,
  LogOut,
  MapPin,
  Menu,
  PackageCheck,
  UserRound,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { type ReactNode, useEffect, useState } from "react";
import { OysterLogo } from "@/components/oyster-logo";
import { DEMO_SESSION_KEY } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";

const navigation = [
  { href: "/dashboard", label: "Visão geral", icon: Home },
  { href: "/dashboard/pedidos", label: "Meus pedidos", icon: PackageCheck },
  { href: "/dashboard/enderecos", label: "Endereços", icon: MapPin },
  { href: "/dashboard/perfil", label: "Minha conta", icon: UserRound },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [emailNeedsVerification, setEmailNeedsVerification] = useState(false);

  useEffect(() => {
    const checkEmailVerification = async () => {
      try {
        const demoSession = window.localStorage.getItem(DEMO_SESSION_KEY);
        if (demoSession) {
          const parsed = JSON.parse(demoSession) as { emailVerified?: boolean };
          setEmailNeedsVerification(parsed.emailVerified === false);
          return;
        }
      } catch {
        window.localStorage.removeItem(DEMO_SESSION_KEY);
      }

      const supabase = createClient();
      if (!supabase) return;
      const { data } = await supabase.auth.getUser();
      setEmailNeedsVerification(Boolean(data.user && !data.user.email_confirmed_at));
    };
    void checkEmailVerification();
  }, []);

  async function signOut() {
    window.localStorage.removeItem(DEMO_SESSION_KEY);
    const supabase = createClient();
    if (supabase) await supabase.auth.signOut();
    router.push("/");
  }

  return (
    <main className="min-h-screen bg-ink text-pearl">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/95 backdrop-blur lg:left-72">
        <div className="flex h-20 items-center justify-between px-5 md:px-8">
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="grid size-10 place-items-center rounded-full border border-white/10 lg:hidden"
          >
            <Menu size={19} />
          </button>
          <div>
            <p className="text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-gold">Área do cliente</p>
            <p className="mt-1 text-sm text-white/55">Acompanhe suas reservas</p>
          </div>
          <Link href="/cardapio" className="hidden items-center gap-2 text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-champagne sm:flex">
            Nova reserva <ChevronRight size={15} />
          </Link>
        </div>
      </header>

      <aside className={`fixed inset-y-0 left-0 z-[60] flex w-72 flex-col border-r border-white/10 bg-[#070707] p-5 transition-transform lg:translate-x-0 ${menuOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-16 items-center justify-between">
          <Link href="/"><OysterLogo /></Link>
          <button type="button" onClick={() => setMenuOpen(false)} className="lg:hidden"><X size={20} /></button>
        </div>
        <div className="mt-8 rounded-xl border border-gold/20 bg-gold/[0.05] p-4">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-full bg-gold text-ink"><UserRound size={18} /></span>
            <div>
              <p className="text-sm font-semibold">Cliente Quero Ostra</p>
              <p className="mt-1 text-[0.64rem] text-white/35">Conta verificada</p>
            </div>
          </div>
        </div>

        <nav className="mt-7 space-y-2">
          {navigation.map((item) => {
            const active = item.href === "/dashboard" ? pathname === item.href : pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-4 py-3.5 text-sm transition ${active ? "bg-gold text-ink" : "text-white/50 hover:bg-white/[0.04] hover:text-white"}`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto">
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-white/10 p-4">
            <CalendarDays className="mt-0.5 shrink-0 text-gold" size={18} />
            <p className="text-[0.68rem] leading-5 text-white/40">
              Reservas podem ser feitas para quarta a domingo.
            </p>
          </div>
          <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-white/40 transition hover:bg-red-400/[0.06] hover:text-red-300">
            <LogOut size={18} /> Sair da conta
          </button>
        </div>
      </aside>

      {menuOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMenuOpen(false)} className="fixed inset-0 z-50 bg-black/70 lg:hidden" />}

      <div className="min-h-screen pt-20 lg:ml-72">
        {emailNeedsVerification && (
          <div className="sticky top-20 z-40 border-b border-gold/30 bg-gold px-5 py-3 text-sm font-semibold text-ink md:px-8">
            Confirme seu e-mail para liberar todos os recursos da conta. Enviamos a validação depois do checkout, sem interromper sua reserva.
          </div>
        )}
        <div className="mx-auto max-w-[1240px] px-5 py-8 md:px-8 md:py-10">
          {children}
        </div>
      </div>
    </main>
  );
}
