import { CalendarDays } from "lucide-react";
import Link from "next/link";
import { OysterLogo } from "@/components/oyster-logo";

export function SiteHeader() {
  return (
    <header className="sticky inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/95 backdrop-blur-xl">
      <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 md:px-8">
        <Link href="/" aria-label="Quero Ostra"><OysterLogo /></Link>
        <nav className="hidden items-center gap-7 lg:flex" aria-label="Navegação principal">
          <Link href="/cardapio" className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-white/55 transition hover:text-gold">Cardápio</Link>
          <Link href="/produtos" className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-white/55 transition hover:text-gold">Produtos</Link>
          <Link href="/blog" className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-white/55 transition hover:text-gold">Blog</Link>
          <Link href="/dashboard" className="text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-white/55 transition hover:text-gold">Conta</Link>
        </nav>
        <Link href="/cardapio" className="inline-flex items-center gap-2 rounded-full border border-gold/60 px-4 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-champagne transition hover:bg-gold hover:text-ink">
          <CalendarDays size={15} /> Reservar
        </Link>
      </div>
    </header>
  );
}
