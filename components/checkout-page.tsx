"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isBefore,
  isSameMonth,
  startOfDay,
  startOfMonth,
  subMonths,
} from "date-fns";
import { ptBR } from "date-fns/locale";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Loader2,
  LockKeyhole,
  Mail,
  MapPin,
  PackageCheck,
  QrCode,
  ShieldCheck,
  ShoppingCart,
  UserRound,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import type { z } from "zod";
import { CART_STORAGE_KEY } from "@/components/catalog-data";
import { OysterLogo } from "@/components/oyster-logo";
import { syncLocalCart } from "@/lib/cart-sync";
import { addons, deliveryWindows, products } from "@/lib/catalog";
import { DEMO_ORDERS_KEY, DEMO_SESSION_KEY } from "@/lib/demo-data";
import { priceCart } from "@/lib/pricing";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import { addressSchema, customerSchema } from "@/lib/validation";
import { useCheckoutStore } from "@/stores/checkout-store";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const steps = [
  { id: 1, label: "Data", icon: CalendarDays },
  { id: 2, label: "Cliente", icon: UserRound },
  { id: 3, label: "Endereço", icon: MapPin },
  { id: 4, label: "Revisão", icon: PackageCheck },
  { id: 5, label: "Pagamento", icon: CreditCard },
];

const AUTH_NEXT_STORAGE_KEY = "qo-auth-next";

type CustomerForm = z.infer<typeof customerSchema>;
type AddressForm = z.infer<typeof addressSchema>;

type Availability = {
  date: string;
  available: boolean;
  reason?: string;
  windows: {
    id: string;
    label: string;
    available: boolean;
    remaining: number;
  }[];
};

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <span className="text-[0.68rem] normal-case tracking-normal text-red-300">{message}</span>;
}

export function CheckoutPage() {
  const router = useRouter();
  const store = useCheckoutStore();
  const [ready, setReady] = useState(false);
  const [month, setMonth] = useState(startOfMonth(new Date()));
  const [availability, setAvailability] = useState<Record<string, Availability>>({});
  const [calendarLoading, setCalendarLoading] = useState(true);
  const [authMode, setAuthMode] = useState<"quick" | "login" | "signup">("quick");
  const [customerEntry, setCustomerEntry] = useState<"choices" | "email">("choices");
  const [password, setPassword] = useState("");
  const [authMessage, setAuthMessage] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState(18);
  const [deliveryZone, setDeliveryZone] = useState("");
  const [cepMessage, setCepMessage] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [reviewed, setReviewed] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const customerForm = useForm<CustomerForm>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      whatsapp: "",
      alternatePhone: "",
    },
  });

  const addressForm = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      cep: "",
      street: "",
      number: "",
      complement: "",
      neighborhood: "",
      city: "",
      state: "SP",
      reference: "",
      instructions: "",
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch("/api/calendar/availability");
        const data = (await response.json()) as { dates: Availability[] };
        setAvailability(
          Object.fromEntries(data.dates.map((date) => [date.date, date])),
        );
      } finally {
        setCalendarLoading(false);
      }
    };
    void load();
  }, []);

  useEffect(() => {
    const current = useCheckoutStore.getState();
    if (current.cart.length === 0) {
      try {
        const legacyCart = window.localStorage.getItem(CART_STORAGE_KEY);
        if (legacyCart) {
          const quantities = JSON.parse(legacyCart) as Record<string, number>;
          current.setCart(
            Object.entries(quantities)
              .filter(([, quantity]) => quantity > 0)
              .map(([id, quantity]) => ({ id, quantity })),
          );
        }
      } catch {
        window.localStorage.removeItem(CART_STORAGE_KEY);
      }
    }

    const latest = useCheckoutStore.getState();
    customerForm.reset({
      fullName: latest.customer.fullName ?? "",
      email: latest.customer.email ?? "",
      whatsapp: latest.customer.whatsapp ?? "",
      alternatePhone: latest.customer.alternatePhone ?? "",
    });
    addressForm.reset({
      cep: latest.address.cep ?? "",
      street: latest.address.street ?? "",
      number: latest.address.number ?? "",
      complement: latest.address.complement ?? "",
      neighborhood: latest.address.neighborhood ?? "",
      city: latest.address.city ?? "",
      state: latest.address.state ?? "SP",
      reference: latest.address.reference ?? "",
      instructions: latest.address.instructions ?? "",
    });
    setReady(true);
  }, [addressForm, customerForm]);

  useEffect(() => {
    if (!ready || !supabaseConfigured) return;
    const syncAuthenticatedCart = async () => {
      const supabase = createClient();
      const { data } = await supabase!.auth.getUser();
      if (data.user) await syncLocalCart();
    };
    void syncAuthenticatedCart();
  }, [ready]);

  useEffect(() => {
    if (!ready || !supabaseConfigured || store.currentStep !== 2) return;

    let active = true;
    const continueAuthenticatedCustomer = async () => {
      const supabase = createClient();
      const { data } = supabase ? await supabase.auth.getUser() : { data: { user: null } };
      if (!active || !data.user) return;

      const metadata = data.user.user_metadata as {
        full_name?: string;
        name?: string;
        whatsapp?: string;
        phone?: string;
      };
      const customer = {
        fullName:
          store.customer.fullName ||
          metadata.full_name ||
          metadata.name ||
          data.user.email?.split("@")[0] ||
          "",
        email: store.customer.email || data.user.email || "",
        whatsapp: store.customer.whatsapp || metadata.whatsapp || metadata.phone || "",
        alternatePhone: store.customer.alternatePhone || "",
      };

      store.setCustomer(customer);
      customerForm.reset(customer);
      setCustomerEntry("email");
      goToStep(3);
    };

    void continueAuthenticatedCustomer();

    return () => {
      active = false;
    };
  }, [customerForm, ready, store, store.currentStep]);

  const cartDetails = useMemo(
    () =>
      store.cart
        .map((item) => {
          const product = products.find((candidate) => candidate.id === item.id);
          return product ? { ...item, product } : null;
        })
        .filter(Boolean) as {
        id: string;
        quantity: number;
        addonIds?: string[];
        product: (typeof products)[number];
      }[],
    [store.cart],
  );

  const pricing = useMemo(() => {
    try {
      return priceCart(
        store.cart,
        Math.max(1, store.selectedDates.length),
        deliveryFee,
      );
    } catch {
      return {
        items: [],
        totals: {
          itemsSubtotal: 0,
          deliveryFeePerDate: deliveryFee,
          deliveryFees: 0,
          discount: 0,
          dateMultiplier: 1,
          total: 0,
        },
      };
    }
  }, [deliveryFee, store.cart, store.selectedDates.length]);

  const calendarDays = eachDayOfInterval({
    start: startOfMonth(month),
    end: endOfMonth(month),
  });
  const leadingDays = (startOfMonth(month).getDay() + 6) % 7;
  const selectedAvailability = store.selectedDates
    .map((date) => availability[date])
    .filter(Boolean);
  const activeWindows = deliveryWindows.map((label) => ({
    label,
    available:
      selectedAvailability.length > 0 &&
      selectedAvailability.every((date) =>
        date.windows.some((window) => window.label === label && window.available),
      ),
    remaining: Math.min(
      ...selectedAvailability.map(
        (date) =>
          date.windows.find((window) => window.label === label)?.remaining ?? 0,
      ),
    ),
  }));

  const containsFresh = cartDetails.some(
    (item) => item.product.type === "fresh",
  );
  const containsGratinated = cartDetails.some(
    (item) => item.product.type === "gratinated",
  );

  function goToStep(step: number) {
    store.setCurrentStep(Math.min(5, Math.max(1, step)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleDate(dateValue: string) {
    const date = availability[dateValue];
    if (!date?.available) return;
    const selected = store.selectedDates.includes(dateValue);
    const nextDates = selected
      ? store.selectedDates.filter((item) => item !== dateValue)
      : [...store.selectedDates, dateValue].sort();
    store.setDates(nextDates);
    if (selected || !activeWindows.some((window) => window.label === store.deliveryWindow && window.available)) {
      store.setDeliveryWindow("");
    }
  }

  function toggleAddon(productId: string, addonId: string) {
    store.setCart(
      store.cart.map((item) => {
        if (item.id !== productId) return item;
        const current = item.addonIds ?? [];
        return {
          ...item,
          addonIds: current.includes(addonId)
            ? current.filter((id) => id !== addonId)
            : [...current, addonId],
        };
      }),
    );
  }

  async function loginWithGoogle() {
    setAuthMessage("");
    setAuthLoading(true);
    try {
      if (supabaseConfigured) {
        const supabase = createClient();
        const redirectTo = new URL("/auth/callback", window.location.origin);
        window.sessionStorage.setItem(AUTH_NEXT_STORAGE_KEY, "/checkout");
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
        goToStep(3);
      }
    } catch (error) {
      setAuthMessage(error instanceof Error ? error.message : "Não foi possível entrar com o Google.");
    } finally {
      setAuthLoading(false);
    }
  }

  async function submitCustomer(data: CustomerForm) {
    setAuthMessage("");
    store.setCustomer(data);

    const isQuickMode = authMode === "quick";

    if (!supabaseConfigured || isQuickMode) {
      window.localStorage.setItem(
        DEMO_SESSION_KEY,
        JSON.stringify({ email: data.email, name: data.fullName, role: "customer", emailVerified: false }),
      );
      goToStep(3);
      return;
    }

    if (!isQuickMode && password.length < 6) {
      setAuthMessage("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      setAuthMessage("Supabase não configurado.");
      return;
    }
    setAuthLoading(true);
    try {
      if (authMode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email: data.email,
          password,
        });
        if (error) throw error;
        await syncLocalCart();
        goToStep(3);
      } else {
        const { error } = await supabase.auth.signUp({
          email: data.email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=/checkout`,
            data: { full_name: data.fullName, whatsapp: data.whatsapp },
          },
        });
        if (error) throw error;
        setAuthMessage(
          "Conta criada. Confirme o e-mail; seu carrinho e esta etapa ficarão salvos.",
        );
      }
    } catch (error) {
      setAuthMessage(
        error instanceof Error ? error.message : "Não foi possível autenticar.",
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function lookupCep() {
    const cep = addressForm.getValues("cep");
    setCepLoading(true);
    setCepMessage("");
    try {
      const response = await fetch("/api/delivery/calculate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cep }),
      });
      const data = (await response.json()) as {
        covered?: boolean;
        fee?: number;
        zone?: string;
        message?: string;
        address?: Partial<AddressForm>;
        error?: string;
      };
      if (!response.ok || !data.covered) {
        setCepMessage(data.message ?? data.error ?? "CEP não atendido.");
        return;
      }
      setDeliveryFee(data.fee ?? 18);
      setDeliveryZone(data.zone ?? "");
      if (data.address) {
        if (data.address.street) addressForm.setValue("street", data.address.street);
        if (data.address.neighborhood)
          addressForm.setValue("neighborhood", data.address.neighborhood);
        if (data.address.city) addressForm.setValue("city", data.address.city);
        if (data.address.state) addressForm.setValue("state", data.address.state);
      }
      setCepMessage(`Entrega disponível em ${data.zone}.`);
    } finally {
      setCepLoading(false);
    }
  }

  function submitAddress(data: AddressForm) {
    if (!deliveryZone) {
      setCepMessage("Consulte o CEP antes de continuar.");
      return;
    }
    store.setAddress(data);
    goToStep(4);
  }

  async function createOrder() {
    setSubmitError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/checkout/create-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          cart: store.cart,
          selectedDates: store.selectedDates,
          deliveryWindow: store.deliveryWindow,
          customer: store.customer,
          address: store.address,
          paymentMethod: store.paymentMethod,
          notes: store.notes,
          reviewed,
          acceptedTerms,
          idempotencyKey,
        }),
      });
      const data = (await response.json()) as {
        order?: typeof store.lastOrder;
        error?: string;
      };
      if (!response.ok || !data.order) {
        throw new Error(data.error ?? "Não foi possível criar a reserva.");
      }

      store.setLastOrder(data.order);
      const saved = JSON.parse(
        window.localStorage.getItem(DEMO_ORDERS_KEY) ?? "[]",
      ) as typeof data.order[];
      window.localStorage.setItem(
        DEMO_ORDERS_KEY,
        JSON.stringify([data.order, ...saved.filter((order) => order?.id !== data.order?.id)]),
      );
      store.resetCheckout();
      router.push(`/dashboard/pedidos/${data.order.id}`);
    } catch (error) {
      setSubmitError(
        error instanceof Error ? error.message : "Não foi possível criar a reserva.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!ready) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink text-pearl">
        <Loader2 className="animate-spin text-gold" />
      </main>
    );
  }

  if (cartDetails.length === 0) {
    return (
      <main className="grid min-h-screen place-items-center bg-ink px-5 text-center text-pearl">
        <div>
          <ShoppingCart className="mx-auto text-gold" size={44} strokeWidth={1.3} />
          <h1 className="mt-6 font-display text-5xl">Seu carrinho está vazio</h1>
          <p className="mt-4 text-sm text-white/50">
            Escolha uma experiência antes de iniciar sua reserva.
          </p>
          <Link href="/cardapio" className="gold-button mt-8">
            Ver cardápio <ArrowRight size={17} />
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-ink pt-20 text-pearl">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#050505]/95 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1380px] items-center justify-start px-5 md:justify-between md:px-8">
          <Link href="/" className="hidden md:block"><OysterLogo /></Link>
          <nav className="hidden items-center gap-7 lg:flex">
            <Link href="/cardapio" className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne">Cardápio</Link>
            <Link href="/#kits" className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne">Porções</Link>
            <Link href="/#entrega" className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne">Entrega</Link>
            <Link href="/dashboard" className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne">Conta</Link>
          </nav>
          <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.15em] text-white/45">
            <LockKeyhole size={15} className="text-gold" />
            Checkout seguro
          </div>
        </div>
      </header>

      <div className="border-b border-white/10 bg-charcoal">
        <div className="mx-auto max-w-[1380px] overflow-x-auto px-5 py-5 md:px-8">
          <div className="flex min-w-[620px] items-center">
            {steps.map((step, index) => (
              <div key={step.id} className="flex flex-1 items-center last:flex-none">
                <button
                  type="button"
                  onClick={() => step.id < store.currentStep && goToStep(step.id)}
                  className={`flex items-center gap-3 ${step.id <= store.currentStep ? "text-champagne" : "text-white/25"}`}
                >
                  <span className={`grid size-9 place-items-center rounded-full border ${step.id < store.currentStep ? "border-gold bg-gold text-ink" : step.id === store.currentStep ? "border-gold" : "border-white/15"}`}>
                    {step.id < store.currentStep ? <Check size={16} /> : <step.icon size={16} />}
                  </span>
                  <span className="text-[0.65rem] font-semibold uppercase tracking-[0.14em]">
                    {step.label}
                  </span>
                </button>
                {index < steps.length - 1 && (
                  <span className={`mx-4 h-px flex-1 ${step.id < store.currentStep ? "bg-gold" : "bg-white/10"}`} />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <section className={`mx-auto grid max-w-[1380px] gap-8 px-5 py-10 md:px-8 ${store.currentStep === 5 ? "lg:grid-cols-[minmax(0,1fr)_410px]" : ""} lg:py-14`}>
        <div className="min-w-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={store.currentStep}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
              className="rounded-2xl border border-white/10 bg-[#090909] p-5 md:p-8"
            >
              {store.currentStep === 1 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Etapa 1 de 5</p>
                  <h1 className="mt-3 font-display text-4xl md:text-5xl">Quando você quer receber?</h1>
                  <p className="mt-4 max-w-2xl text-sm leading-7 text-white/50">
                    Selecione uma ou mais datas. Cada data cria uma reserva e multiplica produtos e entrega.
                  </p>

                  <div className="mt-8 rounded-2xl border border-white/10 bg-black/25 p-4 md:p-6">
                    <div className="flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => setMonth(subMonths(month, 1))}
                        disabled={isSameMonth(month, new Date())}
                        className="calendar-nav"
                      >
                        <ChevronLeft size={18} />
                      </button>
                      <h2 className="font-display text-2xl capitalize text-champagne">
                        {format(month, "MMMM 'de' yyyy", { locale: ptBR })}
                      </h2>
                      <button
                        type="button"
                        onClick={() => setMonth(addMonths(month, 1))}
                        className="calendar-nav"
                      >
                        <ChevronRight size={18} />
                      </button>
                    </div>

                    <div className="mt-6 grid grid-cols-7 text-center text-[0.62rem] font-semibold uppercase tracking-[0.12em] text-white/35">
                      {["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"].map((day) => <span key={day}>{day}</span>)}
                    </div>
                    <div className="mt-3 grid grid-cols-7 gap-1.5 md:gap-2">
                      {Array.from({ length: leadingDays }, (_, index) => <span key={`empty-${index}`} />)}
                      {calendarDays.map((day) => {
                        const value = format(day, "yyyy-MM-dd");
                        const dayAvailability = availability[value];
                        const past = isBefore(day, startOfDay(new Date()));
                        const available = Boolean(dayAvailability?.available) && !past;
                        const selected = store.selectedDates.includes(value);
                        return (
                          <button
                            type="button"
                            key={value}
                            disabled={!available || calendarLoading}
                            title={dayAvailability?.reason}
                            onClick={() => toggleDate(value)}
                            className={`calendar-day ${selected ? "calendar-day-selected" : available ? "calendar-day-available" : "calendar-day-disabled"}`}
                          >
                            <span>{format(day, "d")}</span>
                            <span className="hidden text-[0.5rem] uppercase md:block">
                              {selected ? "Escolhida" : available ? "Disponível" : "Fechada"}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {store.selectedDates.length > 1 && (
                    <div className="mt-5 flex items-start gap-3 rounded-xl border border-gold/25 bg-gold/[0.07] p-4 text-sm leading-6 text-champagne">
                      <AlertCircle className="mt-0.5 shrink-0" size={18} />
                      Você selecionou mais de uma data. Sua reserva será criada para todas as datas escolhidas e o valor será atualizado automaticamente.
                    </div>
                  )}

                  {store.selectedDates.length > 0 && (
                    <div className="mt-8">
                      <h2 className="font-display text-2xl">Datas selecionadas</h2>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {store.selectedDates.map((date) => (
                          <button
                            type="button"
                            onClick={() => toggleDate(date)}
                            key={date}
                            className="rounded-full border border-gold/30 bg-gold/[0.06] px-4 py-2 text-xs text-champagne"
                          >
                            {format(new Date(`${date}T12:00:00`), "EEEE, d 'de' MMMM", { locale: ptBR })}
                            <span className="ml-2 text-white/35">×</span>
                          </button>
                        ))}
                      </div>

                      <h2 className="mt-8 font-display text-2xl">Janela de entrega</h2>
                      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {activeWindows.map((window) => (
                          <button
                            type="button"
                            key={window.label}
                            disabled={!window.available}
                            onClick={() => store.setDeliveryWindow(window.label)}
                            className={`rounded-xl border p-4 text-left transition ${store.deliveryWindow === window.label ? "border-gold bg-gold text-ink" : window.available ? "border-white/10 hover:border-gold/50" : "cursor-not-allowed border-white/5 opacity-30"}`}
                          >
                            <Clock3 size={18} />
                            <span className="mt-3 block text-sm font-semibold">{window.label}</span>
                            <span className="mt-1 block text-[0.64rem] opacity-60">
                              {window.available ? `${window.remaining} vagas restantes` : "Indisponível"}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <button
                    type="button"
                    disabled={store.selectedDates.length === 0 || !store.deliveryWindow}
                    onClick={() => goToStep(2)}
                    className="gold-button mt-8 w-full justify-center disabled:cursor-not-allowed disabled:opacity-35"
                  >
                    Continuar <ArrowRight size={17} />
                  </button>
                </div>
              )}

              {store.currentStep === 2 && (
                <>
                  <form onSubmit={customerForm.handleSubmit(submitCustomer)}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Etapa 2 de 5</p>
                  <h1 className="mt-3 font-display text-4xl md:text-5xl">Seus dados</h1>
                  <p className="mt-4 text-sm leading-7 text-white/50">
                    Entre ou crie sua conta para acompanhar sua reserva com segurança.
                  </p>

                  {customerEntry === "choices" && (
                    <div className="mt-8 space-y-3">
                      <button type="button" disabled={authLoading} onClick={loginWithGoogle} className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 py-4 text-sm font-semibold text-pearl transition hover:border-white/20 hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50">
                        <svg className="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                          <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                          <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                          <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                          <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                        </svg>
                        Continuar com o Google
                      </button>
                      <div className="flex items-center gap-3 py-1" aria-hidden="true">
                        <div className="h-px flex-1 bg-white/10" />
                        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-white/30">ou</span>
                        <div className="h-px flex-1 bg-white/10" />
                      </div>
                      <button type="button" onClick={() => setCustomerEntry("email")} className="outline-button w-full justify-center">
                        <Mail size={17} /> Entrar com e-mail
                      </button>
                    </div>
                  )}

                  <div className="hidden">
                    {[
                      ["quick", "Cadastro rápido"],
                      ["login", "Entrar"],
                      ["signup", "Criar conta"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setAuthMode(value as typeof authMode)}
                        className={`rounded-lg px-3 py-3 text-[0.62rem] font-semibold uppercase tracking-[0.1em] transition ${authMode === value ? "bg-gold text-ink" : "text-white/45 hover:text-white"}`}
                      >
                        {label}
                      </button>
                    ))}
                  </div>

                  {!supabaseConfigured && authMode !== "quick" && (
                    <div className="mt-5 rounded-xl border border-gold/20 bg-gold/[0.06] p-4 text-xs leading-6 text-white/55">
                      O Supabase ainda não possui chaves configuradas. O fluxo seguirá em modo demonstrativo e será ativado automaticamente após configurar o ambiente.
                    </div>
                  )}

                  {customerEntry === "email" && <div className="mt-7 grid gap-5 md:grid-cols-2">
                    <label className="field-label md:col-span-2">
                      Nome completo
                      <input {...customerForm.register("fullName")} className="field" placeholder="Como podemos chamar você?" />
                      <FieldError message={customerForm.formState.errors.fullName?.message} />
                    </label>
                    <label className="field-label">
                      WhatsApp
                      <input {...customerForm.register("whatsapp")} className="field" inputMode="tel" placeholder="(11) 99999-9999" />
                      <FieldError message={customerForm.formState.errors.whatsapp?.message} />
                    </label>
                    <label className="field-label">
                      Telefone alternativo
                      <input {...customerForm.register("alternatePhone")} className="field" inputMode="tel" placeholder="Opcional" />
                      <FieldError message={customerForm.formState.errors.alternatePhone?.message} />
                    </label>
                    <label className="field-label md:col-span-2">
                      E-mail
                      <input {...customerForm.register("email")} className="field" type="email" placeholder="voce@email.com" />
                      <FieldError message={customerForm.formState.errors.email?.message} />
                    </label>
                    {authMode !== "quick" && (
                      <label className="field-label md:col-span-2">
                        Senha
                        <input value={password} onChange={(event) => setPassword(event.target.value)} className="field" type="password" placeholder="Mínimo de 6 caracteres" />
                      </label>
                    )}
                  </div>}

                  {authMessage && (
                    <div className="mt-5 rounded-xl border border-gold/25 bg-gold/[0.06] p-4 text-sm leading-6 text-champagne">
                      {authMessage}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" onClick={() => customerEntry === "email" ? setCustomerEntry("choices") : goToStep(1)} className="outline-button flex-1 justify-center">
                      <ArrowLeft size={16} /> Voltar
                    </button>
                    {customerEntry === "email" && <button disabled={authLoading} type="submit" className="gold-button flex-1 justify-center disabled:opacity-50">
                      {authLoading ? <Loader2 className="animate-spin" size={17} /> : null}
                      Continuar
                      {!authLoading && <ArrowRight size={17} />}
                    </button>}
                  </div>
                </form>

                <div className="hidden">
                  <div className="relative flex py-5 items-center">
                    <div className="flex-grow border-t border-white/10"></div>
                    <span className="flex-shrink mx-4 text-white/30 text-xs uppercase tracking-wider">ou</span>
                    <div className="flex-grow border-t border-white/10"></div>
                  </div>

                  <button
                    type="button"
                    disabled={authLoading}
                    onClick={loginWithGoogle}
                    className="flex w-full items-center justify-center gap-3 rounded-full border border-white/10 bg-white/5 py-4 text-sm font-semibold text-pearl transition hover:bg-white/10 hover:border-white/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <svg className="size-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" fill="#EA4335" />
                    </svg>
                    Continuar com o Google
                  </button>
                </div>
              </>
            )}

              {store.currentStep === 3 && (
                <form onSubmit={addressForm.handleSubmit(submitAddress)}>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Etapa 3 de 5</p>
                  <h1 className="mt-3 font-display text-4xl md:text-5xl">Endereço de entrega</h1>
                  <p className="mt-4 text-sm leading-7 text-white/50">
                    Consulte o CEP para confirmar cobertura e calcular a entrega por data.
                  </p>

                  <div className="mt-7 grid gap-5 md:grid-cols-6">
                    <label className="field-label md:col-span-3">
                      CEP
                      <div className="flex gap-2">
                        <input {...addressForm.register("cep")} className="field" inputMode="numeric" placeholder="00000-000" />
                        <button type="button" onClick={lookupCep} disabled={cepLoading} className="outline-button shrink-0 px-4">
                          {cepLoading ? <Loader2 className="animate-spin" size={17} /> : <MapPin size={17} />}
                          <span className="hidden sm:inline">Consultar</span>
                        </button>
                      </div>
                      <FieldError message={addressForm.formState.errors.cep?.message} />
                    </label>
                    <label className="field-label md:col-span-3">
                      Estado
                      <input {...addressForm.register("state")} className="field uppercase" maxLength={2} />
                      <FieldError message={addressForm.formState.errors.state?.message} />
                    </label>
                    <label className="field-label md:col-span-4">
                      Rua
                      <input {...addressForm.register("street")} className="field" />
                      <FieldError message={addressForm.formState.errors.street?.message} />
                    </label>
                    <label className="field-label md:col-span-2">
                      Número
                      <input {...addressForm.register("number")} className="field" />
                      <FieldError message={addressForm.formState.errors.number?.message} />
                    </label>
                    <label className="field-label md:col-span-3">
                      Bairro
                      <input {...addressForm.register("neighborhood")} className="field" />
                      <FieldError message={addressForm.formState.errors.neighborhood?.message} />
                    </label>
                    <label className="field-label md:col-span-3">
                      Cidade
                      <input {...addressForm.register("city")} className="field" />
                      <FieldError message={addressForm.formState.errors.city?.message} />
                    </label>
                    <label className="field-label md:col-span-3">
                      Complemento
                      <input {...addressForm.register("complement")} className="field" placeholder="Apto, bloco, sala..." />
                    </label>
                    <label className="field-label md:col-span-3">
                      Ponto de referência
                      <input {...addressForm.register("reference")} className="field" />
                    </label>
                    <label className="field-label md:col-span-6">
                      Instruções para entrega
                      <textarea {...addressForm.register("instructions")} className="field min-h-24 resize-none" />
                    </label>
                  </div>

                  {cepMessage && (
                    <div className={`mt-5 flex items-start gap-3 rounded-xl border p-4 text-sm leading-6 ${deliveryZone ? "border-emerald-400/25 bg-emerald-400/[0.06] text-emerald-200" : "border-red-400/25 bg-red-400/[0.06] text-red-200"}`}>
                      {deliveryZone ? <CheckCircle2 className="mt-0.5 shrink-0" size={18} /> : <AlertCircle className="mt-0.5 shrink-0" size={18} />}
                      {cepMessage}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" onClick={() => goToStep(2)} className="outline-button flex-1 justify-center"><ArrowLeft size={16} /> Voltar</button>
                    <button type="submit" className="gold-button flex-1 justify-center">Revisar pedido <ArrowRight size={17} /></button>
                  </div>
                </form>
              )}

              {store.currentStep === 4 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Etapa 4 de 5</p>
                  <h1 className="mt-3 font-display text-4xl md:text-5xl">Revise sua reserva</h1>

                  <div className="mt-8 grid gap-4 md:grid-cols-2">
                    <div className="review-card">
                      <UserRound className="text-gold" size={20} />
                      <p className="review-label">Cliente</p>
                      <p className="review-value">{store.customer.fullName}</p>
                      <p className="review-copy">{store.customer.email}<br />{store.customer.whatsapp}</p>
                      <button type="button" onClick={() => goToStep(2)} className="review-edit">Editar</button>
                    </div>
                    <div className="review-card">
                      <MapPin className="text-gold" size={20} />
                      <p className="review-label">Entrega</p>
                      <p className="review-value">{store.address.street}, {store.address.number}</p>
                      <p className="review-copy">{store.address.neighborhood}, {store.address.city} - {store.address.state}<br />CEP {store.address.cep}</p>
                      <button type="button" onClick={() => goToStep(3)} className="review-edit">Editar</button>
                    </div>
                    <div className="review-card md:col-span-2">
                      <CalendarDays className="text-gold" size={20} />
                      <p className="review-label">Reservas</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {store.selectedDates.map((date) => (
                          <span key={date} className="rounded-full border border-white/10 px-3 py-2 text-xs text-white/65">
                            {format(new Date(`${date}T12:00:00`), "dd/MM/yyyy", { locale: ptBR })}
                          </span>
                        ))}
                      </div>
                      <p className="review-copy mt-3">Janela: {store.deliveryWindow}</p>
                      <button type="button" onClick={() => goToStep(1)} className="review-edit">Editar</button>
                    </div>
                  </div>

                  <label className="field-label mt-6">
                    Observações do pedido
                    <textarea value={store.notes} onChange={(event) => store.setNotes(event.target.value)} className="field min-h-24 resize-none" placeholder="Preferências, recados ou informações importantes" />
                  </label>

                  <div className="mt-6 space-y-3">
                    {containsFresh && (
                      <div className="notice-card">As ostras frescas devem ser mantidas refrigeradas e consumidas preferencialmente no mesmo dia da entrega.</div>
                    )}
                    {containsGratinated && (
                      <div className="notice-card">As ostras gratinadas são enviadas prontas para consumo e devem ser consumidas ainda quentes para melhor experiência.</div>
                    )}
                  </div>

                  <div className="mt-7 space-y-4">
                    <label className="check-row">
                      <input type="checkbox" checked={reviewed} onChange={(event) => setReviewed(event.target.checked)} />
                      Confirmo que revisei os dados, datas, horários e endereço da minha reserva.
                    </label>
                    <label className="check-row">
                      <input type="checkbox" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
                      Li e aceito os termos de compra, política de entrega, conservação e consumo.
                    </label>
                  </div>

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" onClick={() => goToStep(3)} className="outline-button flex-1 justify-center"><ArrowLeft size={16} /> Voltar</button>
                    <button type="button" disabled={!reviewed || !acceptedTerms} onClick={() => goToStep(5)} className="gold-button flex-1 justify-center disabled:cursor-not-allowed disabled:opacity-35">Ir para pagamento <ArrowRight size={17} /></button>
                  </div>
                </div>
              )}

              {store.currentStep === 5 && (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Etapa 5 de 5</p>
                  <h1 className="mt-3 font-display text-4xl md:text-5xl">Pagamento</h1>
                  <p className="mt-4 text-sm leading-7 text-white/50">
                    Escolha como pagar. A cobrança é criada no servidor e os valores são recalculados antes da reserva.
                  </p>

                  <div className="mt-8 grid gap-4 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => store.setPaymentMethod("PIX")}
                      className={`payment-choice ${store.paymentMethod === "PIX" ? "payment-choice-active" : ""}`}
                    >
                      <QrCode size={26} />
                      <span className="font-display text-2xl">PIX</span>
                      <span className="text-xs opacity-55">Confirmação rápida</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => store.setPaymentMethod("CREDIT_CARD")}
                      className={`payment-choice ${store.paymentMethod === "CREDIT_CARD" ? "payment-choice-active" : ""}`}
                    >
                      <CreditCard size={26} />
                      <span className="font-display text-2xl">Cartão</span>
                      <span className="text-xs opacity-55">Ambiente seguro Asaas</span>
                    </button>
                  </div>

                  <div className="mt-7 flex items-start gap-3 rounded-xl border border-gold/20 bg-gold/[0.05] p-5">
                    <ShieldCheck className="mt-0.5 shrink-0 text-gold" size={20} />
                    <p className="text-xs leading-6 text-white/50">
                      Os dados sensíveis de pagamento não são armazenados pela Quero Ostra. A cobrança é processada pelo Asaas.
                    </p>
                  </div>

                  {submitError && (
                    <div className="mt-5 rounded-xl border border-red-400/25 bg-red-400/[0.06] p-4 text-sm text-red-200">
                      {submitError}
                    </div>
                  )}

                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row">
                    <button type="button" onClick={() => goToStep(4)} className="outline-button flex-1 justify-center"><ArrowLeft size={16} /> Voltar</button>
                    <button type="button" disabled={submitting} onClick={createOrder} className="gold-button flex-1 justify-center disabled:opacity-50">
                      {submitting ? <><Loader2 className="animate-spin" size={17} /> Criando reserva</> : <>Finalizar {money.format(pricing.totals.total)} <ArrowRight size={17} /></>}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        {store.currentStep === 5 && <aside className="h-fit rounded-2xl border border-gold/25 bg-[#080808] p-5 lg:sticky lg:top-28">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.2em] text-gold">Resumo do pedido</p>
              <h2 className="mt-2 font-display text-3xl">Sua reserva</h2>
            </div>
            <PackageCheck className="text-gold" size={27} strokeWidth={1.4} />
          </div>

          <div className="mt-6 max-h-[430px] space-y-4 overflow-y-auto pr-1">
            {cartDetails.map((item) => {
              const productAddons = addons.filter(
                (addon) => addon.productIds.length === 0 || addon.productIds.includes(item.id),
              );
              return (
                <article key={item.id} className="rounded-xl border border-white/10 bg-white/[0.025] p-4">
                  <div className="flex gap-3">
                    <div className="relative size-16 shrink-0 overflow-hidden rounded-lg bg-gold/[0.06]">
                      {item.product.image ? <Image src={item.product.image} alt={item.product.name} fill className="object-cover" sizes="64px" /> : <ShoppingCart className="m-5 text-gold" size={22} />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-xl leading-tight">{item.product.name}</h3>
                      <p className="mt-1 text-xs text-white/35">{item.quantity} × {money.format(item.product.price)}</p>
                    </div>
                  </div>
                  {item.product.type !== "beverage" && store.currentStep <= 3 && (
                    <div className="mt-4 border-t border-white/10 pt-3">
                      <p className="text-[0.58rem] uppercase tracking-[0.13em] text-white/30">Adicionais</p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        {productAddons.map((addon) => {
                          const selected = item.addonIds?.includes(addon.id);
                          return (
                            <button
                              type="button"
                              key={addon.id}
                              onClick={() => toggleAddon(item.id, addon.id)}
                              className={`rounded-full border px-3 py-1.5 text-[0.62rem] transition ${selected ? "border-gold bg-gold text-ink" : "border-white/10 text-white/45 hover:border-gold/40"}`}
                            >
                              {addon.name} +{money.format(addon.price)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </div>

          {store.selectedDates.length > 0 && (
            <div className="mt-5 rounded-xl border border-gold/20 bg-gold/[0.05] p-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-champagne">
                <CalendarDays size={16} />
                {store.selectedDates.length} {store.selectedDates.length === 1 ? "data selecionada" : "datas selecionadas"}
              </div>
              {store.deliveryWindow && <p className="mt-2 text-xs text-white/45">{store.deliveryWindow}</p>}
            </div>
          )}

          <div className="mt-5 space-y-3 border-y border-white/10 py-5 text-sm">
            <div className="flex justify-between text-white/45">
              <span>Produtos {store.selectedDates.length > 1 ? `× ${store.selectedDates.length} datas` : ""}</span>
              <span className="text-pearl">{money.format(pricing.totals.itemsSubtotal)}</span>
            </div>
            <div className="flex justify-between text-white/45">
              <span>Entrega {store.selectedDates.length > 1 ? `× ${store.selectedDates.length}` : ""}</span>
              <span className="text-pearl">{money.format(pricing.totals.deliveryFees)}</span>
            </div>
            <div className="flex items-end justify-between pt-2">
              <span className="text-white/65">Total</span>
              <span className="font-display text-3xl text-champagne">{money.format(pricing.totals.total)}</span>
            </div>
          </div>

          <Link href="/cardapio" className="mt-5 inline-flex items-center gap-2 text-[0.64rem] font-semibold uppercase tracking-[0.13em] text-white/40 transition hover:text-gold">
            <ArrowLeft size={15} /> Editar carrinho
          </Link>
        </aside>}
      </section>
    </main>
  );
}
