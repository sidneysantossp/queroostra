"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

const AUTH_NEXT_STORAGE_KEY = "qo-auth-next";

export default function AuthFinishPage() {
  const router = useRouter();

  useEffect(() => {
    let active = true;

    async function finishAuth() {
      const storedNext = window.sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY);
      window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
      const next = storedNext?.startsWith("/") ? storedNext : "/checkout";

      if (supabaseConfigured) {
        const supabase = createClient();
        const { data } = supabase ? await supabase.auth.getSession() : { data: { session: null } };
        if (!active) return;
        router.replace(data.session ? next : "/login");
        return;
      }

      router.replace(next);
    }

    void finishAuth();

    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="grid min-h-screen place-items-center bg-ink px-6 text-pearl">
      <div className="text-center">
        <Loader2 className="mx-auto size-8 animate-spin text-gold" />
        <p className="mt-4 text-sm text-white/55">Finalizando acesso seguro...</p>
      </div>
    </main>
  );
}
