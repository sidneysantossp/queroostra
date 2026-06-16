"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, LockKeyhole, Mail } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { OysterLogo } from "@/components/oyster-logo";
import { syncLocalCart } from "@/lib/cart-sync";
import { DEMO_SESSION_KEY } from "@/lib/demo-data";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

const AUTH_NEXT_STORAGE_KEY = "qo-auth-next";

const loginSchema = z.object({
  email: z.email("Informe um e-mail válido"),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres"),
});

const signupSchema = loginSchema
  .extend({
    fullName: z.string().min(3, "Informe seu nome completo"),
    whatsapp: z.string().min(10, "Informe um WhatsApp válido"),
    confirmPassword: z.string().min(6),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ["confirmPassword"],
    message: "As senhas não coincidem",
  });

type LoginData = z.infer<typeof loginSchema>;
type SignupData = z.infer<typeof signupSchema>;

export function AuthPage({ mode }: { mode: "login" | "signup" }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const next = searchParams.get("next") || (mode === "login" ? "/dashboard" : "/checkout");

  const loginForm = useForm<LoginData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });
  const signupForm = useForm<SignupData>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      fullName: "",
      whatsapp: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  async function login(data: LoginData) {
    setLoading(true);
    setMessage("");
    try {
      if (supabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase!.auth.signInWithPassword(data);
        if (error) throw error;
        await syncLocalCart();
      } else {
        window.localStorage.setItem(
          DEMO_SESSION_KEY,
          JSON.stringify({ email: data.email, name: "Cliente Quero Ostra", role: "customer" }),
        );
      }
      router.push(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  }

  async function loginWithGoogle() {
    setLoading(true);
    setMessage("");
    try {
      if (supabaseConfigured) {
        const supabase = createClient();
        const redirectTo = new URL("/auth/callback", window.location.origin);
        redirectTo.searchParams.set("next", next);
        window.sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, next);
        const { error } = await supabase!.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: redirectTo.toString(),
          },
        });
        if (error) throw error;
      } else {
        window.localStorage.setItem(
          DEMO_SESSION_KEY,
          JSON.stringify({ email: "google-demo@queroostra.com.br", name: "Cliente Google Demo", role: "customer" }),
        );
        router.push(next);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível entrar com o Google.");
    } finally {
      setLoading(false);
    }
  }

  async function signup(data: SignupData) {
    setLoading(true);
    setMessage("");
    try {
      if (supabaseConfigured) {
        const supabase = createClient();
        const { error } = await supabase!.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
            data: { full_name: data.fullName, whatsapp: data.whatsapp },
          },
        });
        if (error) throw error;
        router.push("/confirmar-email");
      } else {
        window.localStorage.setItem(
          DEMO_SESSION_KEY,
          JSON.stringify({ email: data.email, name: data.fullName, role: "customer" }),
        );
        router.push(next);
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível criar a conta.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="relative grid min-h-screen bg-ink text-pearl lg:grid-cols-[.9fr_1.1fr]">
      <section className="relative hidden overflow-hidden border-r border-white/10 lg:block">
        <div className="absolute inset-0 bg-[url('/images/hero-oysters.png')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.2),rgba(5,5,5,.9))]" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <OysterLogo />
          <div className="max-w-lg">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
              Reserva protegida
            </p>
            <h1 className="mt-5 font-display text-6xl leading-[0.92]">
              Seu carrinho continua esperando por você.
            </h1>
            <p className="mt-6 text-sm leading-7 text-white/60">
              Entre para restaurar sua seleção, acompanhar pagamentos e consultar todas as datas reservadas.
            </p>
          </div>
        </div>
      </section>

      <section className="flex min-h-screen items-center justify-center px-5 py-12 md:px-10">
        <div className="w-full max-w-lg">
          <div className="lg:hidden"><OysterLogo /></div>
          <Link href="/" className="mt-10 inline-flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-white/45 lg:mt-0">
            <ArrowLeft size={15} /> Voltar ao início
          </Link>
          <p className="mt-10 text-xs font-semibold uppercase tracking-[0.22em] text-gold">
            {mode === "login" ? "Bem-vindo de volta" : "Sua conta Quero Ostra"}
          </p>
          <h2 className="mt-3 font-display text-5xl">
            {mode === "login" ? "Entrar na conta" : "Criar sua conta"}
          </h2>
          <p className="mt-4 text-sm leading-7 text-white/45">
            {mode === "login"
              ? "Acesse suas reservas, endereços e histórico de pedidos."
              : "Cadastre-se para finalizar e acompanhar sua reserva."}
          </p>

          {!supabaseConfigured && (
            <div className="mt-6 flex items-start gap-3 rounded-xl border border-gold/20 bg-gold/[0.06] p-4 text-xs leading-6 text-white/55">
              <LockKeyhole className="mt-0.5 shrink-0 text-gold" size={17} />
              Ambiente demonstrativo ativo. A conexão real será usada quando as variáveis Supabase forem configuradas.
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={loginForm.handleSubmit(login)} className="mt-8 space-y-5">
              <label className="field-label">
                E-mail
                <input {...loginForm.register("email")} className="field" type="email" autoComplete="email" />
                {loginForm.formState.errors.email?.message && <span className="text-red-300">{loginForm.formState.errors.email.message}</span>}
              </label>
              <label className="field-label">
                Senha
                <input {...loginForm.register("password")} className="field" type="password" autoComplete="current-password" />
                {loginForm.formState.errors.password?.message && <span className="text-red-300">{loginForm.formState.errors.password.message}</span>}
              </label>
              <button disabled={loading} className="gold-button w-full justify-center">
                {loading ? <Loader2 className="animate-spin" size={17} /> : <LockKeyhole size={17} />}
                Entrar <ArrowRight size={17} />
              </button>
            </form>
          ) : (
            <form onSubmit={signupForm.handleSubmit(signup)} className="mt-8 grid gap-5 md:grid-cols-2">
              <label className="field-label md:col-span-2">
                Nome completo
                <input {...signupForm.register("fullName")} className="field" autoComplete="name" />
                {signupForm.formState.errors.fullName?.message && <span className="text-red-300">{signupForm.formState.errors.fullName.message}</span>}
              </label>
              <label className="field-label">
                WhatsApp
                <input {...signupForm.register("whatsapp")} className="field" autoComplete="tel" />
                {signupForm.formState.errors.whatsapp?.message && <span className="text-red-300">{signupForm.formState.errors.whatsapp.message}</span>}
              </label>
              <label className="field-label">
                E-mail
                <input {...signupForm.register("email")} className="field" type="email" autoComplete="email" />
                {signupForm.formState.errors.email?.message && <span className="text-red-300">{signupForm.formState.errors.email.message}</span>}
              </label>
              <label className="field-label">
                Senha
                <input {...signupForm.register("password")} className="field" type="password" autoComplete="new-password" />
                {signupForm.formState.errors.password?.message && <span className="text-red-300">{signupForm.formState.errors.password.message}</span>}
              </label>
              <label className="field-label">
                Confirmar senha
                <input {...signupForm.register("confirmPassword")} className="field" type="password" autoComplete="new-password" />
                {signupForm.formState.errors.confirmPassword?.message && <span className="text-red-300">{signupForm.formState.errors.confirmPassword.message}</span>}
              </label>
              <button disabled={loading} className="gold-button w-full justify-center md:col-span-2">
                {loading ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
                Criar conta <ArrowRight size={17} />
              </button>
            </form>
          )}

          <div className="relative flex py-5 items-center mt-3">
            <div className="flex-grow border-t border-white/10"></div>
            <span className="flex-shrink mx-4 text-white/30 text-xs uppercase tracking-wider">ou</span>
            <div className="flex-grow border-t border-white/10"></div>
          </div>

          <button
            type="button"
            disabled={loading}
            onClick={loginWithGoogle}
            className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 py-4 text-sm font-semibold text-pearl transition hover:bg-white/10 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <svg className="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
            </svg>
            {mode === "login" ? "Entrar com o Google" : "Cadastrar com o Google"}
          </button>

          {message && <p className="mt-5 rounded-xl border border-red-400/20 bg-red-400/[0.06] p-4 text-sm text-red-200">{message}</p>}

          <p className="mt-7 text-center text-xs text-white/40">
            {mode === "login" ? "Ainda não tem conta?" : "Já possui uma conta?"}{" "}
            <Link href={mode === "login" ? "/cadastro" : "/login"} className="font-semibold text-gold">
              {mode === "login" ? "Criar conta" : "Entrar"}
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}

export function ConfirmEmailPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-ink px-5 text-center text-pearl">
      <div className="max-w-lg">
        <span className="mx-auto grid size-16 place-items-center rounded-full border border-gold/35 bg-gold/[0.06] text-gold">
          <Mail size={27} />
        </span>
        <h1 className="mt-7 font-display text-5xl">Confirme seu e-mail</h1>
        <p className="mt-5 text-sm leading-7 text-white/50">
          Enviamos um link de confirmação. Depois de validar o endereço, você voltará ao checkout com o carrinho e a etapa restaurados.
        </p>
        <Link href="/checkout" className="gold-button mt-8">
          Voltar ao checkout <ArrowRight size={17} />
        </Link>
      </div>
    </main>
  );
}
