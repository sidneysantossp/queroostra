"use client";

import { useState, useEffect } from "react";
import { Cookie, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const COOKIE_KEY = "quero-ostra-cookie-consent";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_KEY);
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 2000);
      return () => clearTimeout(timer);
    }
  }, []);

  function accept() {
    localStorage.setItem(COOKIE_KEY, "accepted");
    setVisible(false);
  }

  function reject() {
    localStorage.setItem(COOKIE_KEY, "rejected");
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 60 }}
          transition={{ type: "spring", damping: 22, stiffness: 260 }}
          className="fixed bottom-4 left-4 right-4 z-[60] mx-auto max-w-[540px] overflow-hidden rounded-2xl border border-white/10 bg-[#0a0a0a]/95 shadow-[0_20px_60px_rgba(0,0,0,.6)] backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-auto"
        >
          <div className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/30 bg-gold/[0.08]">
                <Cookie className="text-gold" size={18} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg text-pearl">Cookies</h3>
                  <button
                    onClick={reject}
                    className="grid size-7 place-items-center rounded-full text-white/30 transition hover:bg-white/5 hover:text-white/60"
                    aria-label="Fechar"
                  >
                    <X size={14} />
                  </button>
                </div>
                <p className="mt-2 text-[0.8rem] leading-6 text-white/50">
                  Utilizamos cookies para melhorar sua experiência de navegação, personalizar conteúdo e analisar nosso tráfego. Ao continuar, você concorda com nossa{" "}
                  <a href="/politica-de-privacidade" className="text-gold underline underline-offset-2 transition hover:text-champagne">
                    Política de Privacidade
                  </a>.
                </p>
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={accept}
                    className="rounded-lg bg-gold px-5 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-ink transition hover:bg-champagne"
                  >
                    Aceitar todos
                  </button>
                  <button
                    onClick={reject}
                    className="rounded-lg border border-white/15 px-5 py-2.5 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-white/50 transition hover:border-white/30 hover:text-white/80"
                  >
                    Apenas essenciais
                  </button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
