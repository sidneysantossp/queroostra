"use client";

import { Home, ShoppingCart, User } from "lucide-react";
import Link from "next/link";
import { OysterLogo } from "@/components/oyster-logo";

type MobileNavProps = {
  activeTab: "inicio" | "cardapio" | "carrinho" | "conta";
  cartCount: number;
  onCartClick: () => void;
};

export function MobileNav({ activeTab, cartCount, onCartClick }: MobileNavProps) {
  return (
    <nav
      className="fixed bottom-0 inset-x-0 z-50 border-t border-white/10 bg-[#070707]/95 backdrop-blur-md px-4 py-2 flex items-center justify-around lg:hidden pb-[calc(env(safe-area-inset-bottom)+0.5rem)] pt-2 shadow-[0_-8px_32px_rgba(0,0,0,0.55)]"
      aria-label="Navegação móvel"
    >
      {/* Inicio */}
      <Link href="/" className="relative flex flex-col items-center gap-1.5 py-1 w-16 text-center select-none">
        {activeTab === "inicio" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gold rounded-full" />
        )}
        <Home size={22} className={activeTab === "inicio" ? "text-gold" : "text-white/45"} />
        <span className={`text-[0.62rem] font-semibold tracking-wider uppercase ${activeTab === "inicio" ? "text-gold" : "text-white/45"}`}>
          Início
        </span>
      </Link>

      {/* Cardapio */}
      <Link href="/cardapio" className="relative flex flex-col items-center gap-1.5 py-1 w-16 text-center select-none">
        {activeTab === "cardapio" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gold rounded-full" />
        )}
        <div className="relative size-[22px] flex items-center justify-center scale-90">
          <OysterLogo compact className={activeTab === "cardapio" ? "opacity-100" : "opacity-45"} />
        </div>
        <span className={`text-[0.62rem] font-semibold tracking-wider uppercase ${activeTab === "cardapio" ? "text-gold" : "text-white/45"}`}>
          Cardápio
        </span>
      </Link>

      {/* Carrinho */}
      <button
        type="button"
        onClick={onCartClick}
        className="relative flex flex-col items-center gap-1.5 py-1 w-16 text-center select-none"
      >
        {activeTab === "carrinho" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gold rounded-full" />
        )}
        <div className="relative">
          <ShoppingCart size={22} className={activeTab === "carrinho" ? "text-gold" : "text-white/45"} />
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-3 bg-gold text-ink font-bold text-[0.62rem] min-w-[17px] h-[17px] px-1 flex items-center justify-center rounded-full border border-ink">
              {cartCount}
            </span>
          )}
        </div>
        <span className={`text-[0.62rem] font-semibold tracking-wider uppercase ${activeTab === "carrinho" ? "text-gold" : "text-white/45"}`}>
          Carrinho
        </span>
      </button>

      {/* Conta */}
      <Link href="/dashboard" className="relative flex flex-col items-center gap-1.5 py-1 w-16 text-center select-none">
        {activeTab === "conta" && (
          <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-10 h-0.5 bg-gold rounded-full" />
        )}
        <User size={22} className={activeTab === "conta" ? "text-gold" : "text-white/45"} />
        <span className={`text-[0.62rem] font-semibold tracking-wider uppercase ${activeTab === "conta" ? "text-gold" : "text-white/45"}`}>
          Conta
        </span>
      </Link>
    </nav>
  );
}
