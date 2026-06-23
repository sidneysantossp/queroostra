"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type CSSProperties, type FormEvent, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Beer,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  CupSoda,
  Facebook,
  Gem,
  GlassWater,
  Instagram,
  Mail,
  MapPin,
  Menu,
  MessageCircle,
  Minus,
  PackageCheck,
  Phone,
  Plus,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Star,
  Trash2,
  Truck,
  User,
  UtensilsCrossed,
  Wine,
  X,
} from "lucide-react";
import { OysterLogo } from "@/components/oyster-logo";
import { SectionTitle } from "@/components/section-title";
import {
  CART_STORAGE_KEY,
  oysterExperiences as fallbackKits,
  beverageCategories,
} from "@/components/catalog-data";
import type { CartProduct } from "@/components/catalog-data";
import type { ProductRecord } from "@/lib/domain";
import { createClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import { useCheckoutStore } from "@/stores/checkout-store";

const steps = [
  {
    icon: ShoppingBag,
    title: "Escolha sua porção",
    copy: "Selecione a experiência ideal para o seu momento.",
  },
  {
    icon: CalendarDays,
    title: "Reserve a entrega",
    copy: "Escolha uma das datas disponíveis no calendário.",
  },
  {
    icon: CreditCard,
    title: "Pague com segurança",
    copy: "Finalize online e receba a confirmação da reserva.",
  },
  {
    icon: Truck,
    title: "Receba em casa",
    copy: "Entregamos com cuidado, frescor e hora marcada.",
  },
];

const benefits = [
  { icon: Star, title: "+30 Anos Experiência", copy: "Do Físico para o Online com a mesma qualidade." },
  { icon: CalendarDays, title: "Entrega programada", copy: "Você escolhe entre as datas abertas." },
  { icon: Gem, title: "Qualidade premium", copy: "Ostras escolhidas para servir e impressionar." },
  { icon: UtensilsCrossed, title: "Experiência completa", copy: "Porções prontas para uma ocasião especial." },
  { icon: ShieldCheck, title: "Pagamento seguro", copy: "Sua reserva protegida do início ao fim." },
];

const neighborhoods = [
  "Moema",
  "Vila Mariana",
  "Itaim Bibi",
  "Campo Belo",
  "Brooklin",
  "Morumbi",
  "Santo Amaro",
  "Vila Olímpia",
];

const categoryIcons = {
  aguas: GlassWater,
  refrigerantes: CupSoda,
  cervejas: Beer,
  vinhos: Wine,
};

const AUTH_NEXT_STORAGE_KEY = "qo-auth-next";
const experienceSlugs: Record<string, string> = {
  gratinada: "brasa-gourmet",
  baby: "experiencia-degustacao",
  tradicional: "experiencia-happy-hour",
  premium: "reserva-premium",
};

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const reveal = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.16 },
  transition: { duration: 0.65, ease: "easeOut" as const },
};

export function HomePage() {
  const router = useRouter();
  const checkoutStore = useCheckoutStore();
  const [liveProducts, setLiveProducts] = useState<ProductRecord[]>([]);
  const liveProductMap = useMemo(
    () =>
      new Map(
        liveProducts.map((product) => [
          product.externalKey ?? product.id,
          product,
        ]),
      ),
    [liveProducts],
  );
  const kits = useMemo(
    () =>
      fallbackKits.map((kit) => {
        const live = liveProductMap.get(kit.id);
        return live
          ? {
              ...kit,
              slug: live.slug,
              name: live.name,
              size: live.shortDescription,
              details: live.includedItems,
              price: live.promotionalPrice ?? live.price,
              image: live.image ?? kit.image,
              tag: live.featured ? kit.tag ?? "Destaque" : undefined,
            }
          : { ...kit, slug: experienceSlugs[kit.id] ?? kit.id };
      }),
    [liveProductMap],
  );
  const [siteContent, setSiteContent] = useState({
    title: "Experiência que desperta o paladar",
    subtitle:
      "Ostras selecionadas sob demanda e entregues com data e hora programada em sua casa ou evento para transformar momentos especiais em experiências memoráveis.",
    institutional:
      "Cada pedido é planejado sob demanda para preservar frescor, qualidade e uma apresentação especial.",
    heroImage: "/images/hero-oysters.png",
  });
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [slidesPerView, setSlidesPerView] = useState(1);
  const [carouselPaused, setCarouselPaused] = useState(false);
  const [cepResult, setCepResult] = useState<"idle" | "checking" | "covered" | "outside" | "contact" | "error">("idle");
  const maxSlide = Math.max(0, kits.length - slidesPerView);
  const [whatsappUrl, setWhatsappUrl] = useState(() => {
    const envNum = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER?.replace(/\D/g, "");
    return envNum ? `https://wa.me/${envNum}` : "#kits";
  });
  const [instagramUrl, setInstagramUrl] = useState(process.env.NEXT_PUBLIC_INSTAGRAM_URL || "#");

  // Cart implementation
  const [cartQuantities, setCartQuantities] = useState<Record<string, number>>({});
  const [cartReady, setCartReady] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);

  useEffect(() => {
    if (!supabaseConfigured || window.location.pathname !== "/") return;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    if (!code) return;

    let active = true;
    const supabase = createClient();
    if (!supabase) return;

    void supabase.auth.exchangeCodeForSession(code).then(({ error }) => {
      if (!active) return;

      params.delete("code");
      params.delete("error");
      params.delete("error_code");
      params.delete("error_description");

      if (!error) {
        const storedNext = window.sessionStorage.getItem(AUTH_NEXT_STORAGE_KEY);
        window.sessionStorage.removeItem(AUTH_NEXT_STORAGE_KEY);
        const next = storedNext?.startsWith("/") ? storedNext : "/checkout";
        router.replace(next);
        return;
      }

      const query = params.toString();
      window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
    });

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    fetch("/api/content/settings")
      .then((r) => r.json())
      .then((d: { whatsappSupport?: string; instagramUrl?: string }) => {
        if (d.whatsappSupport) {
          const num = d.whatsappSupport.replace(/\D/g, "");
          if (num) setWhatsappUrl(`https://wa.me/${num}`);
        }
        if (d.instagramUrl) setInstagramUrl(d.instagramUrl);
      })
      .catch(() => {});
  }, []);

  const displayCartProducts = useMemo<CartProduct[]>(
    () => [
      ...kits.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.size,
        price: product.price,
        category: "ostras",
        image: product.image,
      })),
      ...beverageCategories.map((category) => ({
        ...category,
        products: category.products.map((product) => {
          const live = liveProductMap.get(product.id);
          return live
            ? {
                ...product,
                name: live.name,
                description: live.shortDescription,
                price: live.promotionalPrice ?? live.price,
                image: live.image,
              }
            : product;
        }),
      })).flatMap((category) =>
        category.products.map((product) => ({ ...product, category: category.id })),
      ),
    ],
    [liveProductMap, kits],
  );

  const cartItems = useMemo(() => {
    return displayCartProducts
      .filter((item) => (cartQuantities[item.id] ?? 0) > 0)
      .map((item) => ({
        ...item,
        quantity: cartQuantities[item.id] ?? 0,
      }));
  }, [displayCartProducts, cartQuantities]);

  const selection = useMemo(() => {
    return {
      count: cartItems.reduce((total, item) => total + item.quantity, 0),
      total: cartItems.reduce((total, item) => total + item.price * item.quantity, 0),
    };
  }, [cartItems]);

  useEffect(() => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as Record<string, number>;
        setCartQuantities((current) => ({ ...current, ...parsed }));
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setCartReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartQuantities));
    window.dispatchEvent(new Event("cart-updated"));
  }, [cartReady, cartQuantities]);

  useEffect(() => {
    const handleOpenCart = () => setCartOpen(true);
    window.addEventListener("open-cart-drawer", handleOpenCart);
    return () => window.removeEventListener("open-cart-drawer", handleOpenCart);
  }, []);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  function setQuantity(id: string, quantity: number) {
    const nextQuantity = Math.min(20, Math.max(0, Math.round(quantity) || 0));
    setCartQuantities((current) => ({ ...current, [id]: nextQuantity }));
  }

  function finishOrder() {
    if (selection.count === 0) return;
    setCartOpen(false);
    router.push("/checkout");
  }

  useEffect(() => {
    void fetch("/api/content/home")
      .then((response) => (response.ok ? response.json() : null))
      .then(
        (data: {
          content?: Partial<typeof siteContent>;
        } | null) => {
          if (data?.content) {
            setSiteContent((current) => ({ ...current, ...data.content }));
          }
        },
      );
  }, []);

  useEffect(() => {
    void fetch("/api/catalog", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { products?: ProductRecord[] } | null) => {
        if (data?.products) setLiveProducts(data.products);
      });
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(min-width: 1024px)");
    const updateSlidesPerView = () => setSlidesPerView(mediaQuery.matches ? 3 : 2);

    updateSlidesPerView();
    mediaQuery.addEventListener("change", updateSlidesPerView);
    return () => mediaQuery.removeEventListener("change", updateSlidesPerView);
  }, []);

  useEffect(() => {
    setActiveSlide((current) => Math.min(current, maxSlide));
  }, [maxSlide]);

  useEffect(() => {
    if (carouselPaused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current >= maxSlide ? 0 : current + 1));
    }, 3000);

    return () => window.clearInterval(timer);
  }, [carouselPaused, maxSlide]);

  function scrollTo(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  }

  function moveCarousel(direction: -1 | 1) {
    setActiveSlide((current) => {
      if (direction === 1) {
        return current >= maxSlide ? 0 : current + 1;
      }
      return current <= 0 ? maxSlide : current - 1;
    });
  }

  // Bairros da Zona Sul de SP atendidos pela rota refrigerada
  const zonaSulBairros = [
    "moema", "vila mariana", "itaim bibi", "campo belo", "brooklin",
    "morumbi", "santo amaro", "vila olimpia", "vila olímpia", "jardim paulista",
    "paraíso", "paraiso", "saúde", "saude", "jabaquara", "cursino",
    "ipiranga", "sacoma", "sacomã", "cidade ademar", "campo grande",
    "campo limpo", "capão redondo", "capao redondo", "jardim são luís",
    "jardim sao luis", "jardim ângela", "jardim angela", "socorro",
    "granja julieta", "chácara santo antônio", "chacara santo antonio",
    "alto da boa vista", "brooklin novo", "brooklin paulista",
    "vila cordeiro", "vila cruzeiro", "americanópolis", "americanopolis",
    "interlagos", "grajaú", "grajau", "pedreira", "cidade dutra",
    "vila andrade", "jardim marajoara", "planalto paulista", "indianópolis",
    "indianopolis", "vila clementino", "vila gumercindo",
  ];

  async function checkCep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const digits = String(form.get("quick-cep") ?? "").replace(/\D/g, "");

    if (digits.length !== 8) {
      setCepResult("contact");
      return;
    }

    setCepResult("checking");

    try {
      const res = await fetch(`https://viacep.com.br/ws/${digits}/json/`);
      const data = await res.json();

      if (data.erro) {
        setCepResult("error");
        return;
      }

      // Verifica se é São Paulo capital e bairro da Zona Sul
      const cidade = (data.localidade || "").toLowerCase().trim();
      const bairro = (data.bairro || "").toLowerCase().trim();
      const isSP = cidade === "são paulo" || cidade === "sao paulo";
      const isZonaSul = isSP && zonaSulBairros.some((b) => bairro.includes(b) || b.includes(bairro));

      setCepResult(isZonaSul ? "covered" : "outside");
    } catch {
      setCepResult("error");
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-pearl">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between px-5 md:px-8 lg:h-[72px]">
          <button onClick={() => scrollTo("inicio")} aria-label="Voltar ao início">
            <OysterLogo />
          </button>

          <nav className="hidden items-center gap-8 lg:flex">
            <Link
              href="/cardapio"
              className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne"
            >
              Cardápio
            </Link>
            {[
              ["Porções", "kits"],
              ["Como funciona", "como-funciona"],
              ["Experiência", "experiencia"],
              ["Entrega", "entrega"],
            ].map(([label, id]) => (
              <button
                key={id}
                onClick={() => scrollTo(id)}
                className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne"
              >
                {label}
              </button>
            ))}
            <Link href="/blog" className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne">Blog</Link>
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-full bg-gold px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-ink transition hover:bg-champagne"
            >
              <User size={15} />
              Minha Conta
            </Link>
            <Link
              href="/cardapio"
              className="inline-flex items-center gap-2 rounded-full border border-gold/70 px-5 py-3 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-champagne transition hover:bg-gold hover:text-ink"
            >
              <CalendarDays size={15} />
              Fazer reserva
            </Link>
          </div>

          <button
            className="grid size-11 place-items-center rounded-full lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label="Abrir menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </header>

      <AnimatePresence>
        {menuOpen && (
          <motion.nav
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-[55] flex flex-col items-center justify-center bg-ink/90 backdrop-blur-2xl lg:hidden"
          >
            <button
              onClick={() => setMenuOpen(false)}
              className="absolute right-5 top-6 grid size-11 place-items-center rounded-full border border-white/10 text-white/60 transition hover:bg-white/5"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>

            <div className="flex flex-col items-center gap-7">
              <Link
                href="/cardapio"
                onClick={() => setMenuOpen(false)}
                className="font-display text-3xl uppercase tracking-[0.12em] text-pearl transition hover:text-gold"
              >
                Cardápio
              </Link>
              {[
                ["Nossas porções", "kits"],
                ["Como funciona", "como-funciona"],
                ["Por que escolher", "experiencia"],
                ["Área de entrega", "entrega"],
              ].map(([label, id]) => (
                <button
                  key={id}
                  onClick={() => scrollTo(id)}
                  className="font-display text-3xl uppercase tracking-[0.12em] text-pearl transition hover:text-gold"
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => scrollTo("kits")}
                className="mt-6 rounded-full bg-gold px-8 py-4 text-sm font-bold uppercase tracking-[0.16em] text-ink transition hover:bg-champagne"
              >
                Fazer minha reserva
              </button>
            </div>
          </motion.nav>
        )}
      </AnimatePresence>

      <section
        id="inicio"
        className="relative flex min-h-[820px] items-center overflow-hidden pt-20 lg:min-h-[620px] lg:items-stretch lg:pt-[72px]"
      >
        <div className="absolute inset-0 lg:bottom-0 lg:left-[43%] lg:top-[72px]">
          <Image
            src={siteContent.heroImage}
            alt="Ostras frescas servidas no gelo com limão e molho especial"
            fill
            priority
            unoptimized={siteContent.heroImage.startsWith("http")}
            className="object-cover object-[62%_center] lg:object-center"
            sizes="(max-width: 1023px) 100vw, 57vw"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(5,5,5,.9)_0%,rgba(5,5,5,.42)_42%,rgba(5,5,5,.96)_100%)] lg:bg-[linear-gradient(90deg,#050505_0%,#050505_34%,rgba(5,5,5,.96)_41%,rgba(5,5,5,.42)_57%,rgba(5,5,5,.12)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(212,175,55,.08),transparent_36%)]" />

        <div className="relative mx-auto flex w-full max-w-[1320px] items-center px-5 py-24 md:px-8 lg:py-10">
          <div className="max-w-[650px] lg:w-[43%] lg:max-w-[520px]">
            <div className="mb-8 flex items-center gap-3 text-[0.66rem] font-semibold uppercase tracking-[0.24em] text-champagne lg:mb-5 lg:text-[0.58rem]">
              <span className="h-px w-10 bg-gold lg:w-7" />
              Ostras frescas • selecionadas • entregues para você
            </div>
            <h1 className="font-display text-[3.2rem] font-medium uppercase leading-[1.05] tracking-[-0.04em] sm:text-7xl md:text-[6.6rem] lg:text-[4.45rem] lg:leading-[1]">
              Experiência<br />que desperta<br />o paladar
            </h1>
            <p className="mt-8 max-w-xl text-base font-light leading-7 text-white/75 md:text-lg md:leading-8 lg:mt-5 lg:max-w-[420px] lg:text-sm lg:leading-6">
              {siteContent.subtitle}
            </p>

            <div className="mt-9 grid max-w-xl grid-cols-3 gap-3 border-y border-white/10 py-5 lg:mt-6 lg:max-w-[440px] lg:py-4">
              {[
                [Sparkles, "Qualidade", "Garantida"],
                [CalendarDays, "Entrega", "Programada"],
                [ShieldCheck, "Compra", "100% segura"],
              ].map(([Icon, title, copy]) => {
                const FeatureIcon = Icon as typeof Sparkles;
                return (
                  <div key={String(title)} className="flex items-center gap-3 lg:gap-2">
                    <FeatureIcon className="shrink-0 text-gold" size={20} strokeWidth={1.4} />
                    <div>
                      <p className="text-[0.62rem] font-semibold uppercase tracking-[0.13em] text-champagne lg:text-[0.55rem]">
                        {String(title)}
                      </p>
                      <p className="mt-1 text-[0.68rem] text-white/60 lg:text-[0.58rem]">{String(copy)}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-9 flex flex-col gap-3 sm:flex-row lg:mt-6">
              <button onClick={() => scrollTo("kits")} className="gold-button">
                Fazer minha reserva <ArrowRight size={17} />
              </button>
              <button onClick={() => scrollTo("como-funciona")} className="outline-button lg:hidden">
                Como funciona <ChevronDown size={17} />
              </button>
            </div>
          </div>
        </div>

        <div className="absolute bottom-5 right-5 hidden size-28 place-items-center rounded-full border border-gold/60 bg-ink/85 text-center backdrop-blur md:grid lg:right-8">
          <div>
            <Clock3 className="mx-auto mb-2 text-gold" size={20} />
            <p className="text-[0.58rem] uppercase tracking-[0.18em] text-white/50">Reserve até</p>
            <p className="mt-1 font-display text-xl text-champagne">18h</p>
            <p className="text-[0.55rem] text-white/50">do dia anterior</p>
          </div>
        </div>
      </section>

      <section id="como-funciona" className="relative border-y border-white/10 bg-charcoal py-20 md:py-28 lg:py-8">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <div className="text-center">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-gold lg:hidden">
              Da reserva à sua mesa
            </p>
            <div className="flex items-center justify-center gap-5">
              <span className="hidden h-px w-16 bg-gold/25 lg:block" />
              <h2 className="font-display text-4xl font-semibold text-pearl md:text-6xl lg:text-3xl lg:uppercase lg:text-champagne">
                Como funciona
              </h2>
              <span className="hidden h-px w-16 bg-gold/25 lg:block" />
            </div>
            <p className="mx-auto mt-5 max-w-2xl text-sm leading-7 text-silver md:text-base lg:hidden">
              Não somos um delivery comum. Cada pedido é planejado para que as ostras
              cheguem frescas, no momento escolhido por você.
            </p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-2xl border border-white/10 bg-white/10 md:grid-cols-4 lg:mt-5 lg:rounded-none lg:border-x-0 lg:border-b-0">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="group relative bg-[#090909] p-7 md:min-h-64 md:p-8 lg:min-h-0 lg:px-6 lg:py-5"
              >
                <span className="absolute right-5 top-4 font-display text-6xl text-white/[0.035] lg:hidden">
                  0{index + 1}
                </span>
                <div className="flex items-center gap-4">
                  <span className="hidden size-8 shrink-0 place-items-center rounded-full bg-gold/20 font-display text-sm text-champagne lg:grid">
                    {index + 1}
                  </span>
                  <div className="grid size-12 place-items-center rounded-full border border-gold/35 bg-gold/5 text-gold transition group-hover:border-gold group-hover:bg-gold group-hover:text-ink lg:size-9 lg:rounded-none lg:border-0 lg:bg-transparent">
                    <step.icon size={22} strokeWidth={1.5} />
                  </div>
                </div>
                <p className="mt-7 text-xs font-semibold uppercase tracking-[0.16em] text-champagne lg:hidden">
                  Passo {index + 1}
                </p>
                <h3 className="mt-3 font-display text-2xl text-pearl lg:text-sm lg:font-sans lg:font-semibold lg:uppercase lg:tracking-[0.08em] lg:text-champagne">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-white/50 lg:mt-2 lg:text-[0.68rem] lg:leading-5">
                  {step.copy}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="kits" className="relative py-24 md:py-32">
        <div className="absolute inset-0 luxury-grid opacity-40" />
        <div className="relative mx-auto max-w-[1320px] px-5 md:px-8">
          <SectionTitle
            eyebrow="Seleção Quero Ostra"
            title="Nossas porções"
            description="Escolha sua categoria de ostra e ajuste a quantidade de porções. O valor é atualizado na hora."
          />

          <div className="mt-10 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
            <p className="text-xs uppercase tracking-[0.16em] text-white/40">
              Rotação automática • use as setas para explorar
            </p>
            <div className="flex shrink-0 self-end gap-2 sm:self-auto">
              <button
                type="button"
                onClick={() => moveCarousel(-1)}
                className="carousel-arrow"
                aria-label="Ver categorias anteriores"
              >
                <ChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => moveCarousel(1)}
                className="carousel-arrow"
                aria-label="Ver próximas categorias"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>

          <div
            className="product-carousel-viewport mt-7"
            onMouseEnter={() => setCarouselPaused(true)}
            onMouseLeave={() => setCarouselPaused(false)}
            onFocusCapture={() => setCarouselPaused(true)}
            onBlurCapture={() => setCarouselPaused(false)}
          >
            <div
              className="product-carousel-track"
              style={
                {
                  transform:
                    slidesPerView === 3
                      ? `translate3d(calc(-${activeSlide * (100 / 3)}% - ${activeSlide * 0.3333}rem), 0, 0)`
                      : `translate3d(calc(-${activeSlide * 50}% - ${activeSlide * 0.375}rem), 0, 0)`,
                } as CSSProperties
              }
            >
              {kits.map((kit, index) => {
                return (
                  <motion.article
                    key={kit.id}
                    {...reveal}
                    transition={{ ...reveal.transition, delay: index * 0.08 }}
                    whileHover={{ y: -6 }}
                    className={`product-card group flex h-full flex-col ${kit.tag ? "featured-card" : ""}`}
                  >
                    {kit.tag && (
                      <span className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-gradient px-5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink shadow-lg">
                        {kit.tag}
                      </span>
                    )}
                    <div className="product-card-media relative aspect-square overflow-hidden lg:aspect-[16/10]">
                      <Image
                        src={kit.image}
                        alt={kit.name}
                        fill
                        unoptimized={kit.image.startsWith("http")}
                        className="object-cover transition duration-700 group-hover:scale-105"
                        sizes="(max-width: 767px) 100vw, 50vw"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
                    </div>

                    <div className="relative flex flex-1 flex-col p-4 sm:p-5 md:p-9">
                      <div>
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-[0.56rem] font-semibold uppercase tracking-[0.16em] text-gold sm:text-[0.62rem] lg:text-[0.65rem] lg:tracking-[0.2em]">
                            Tipo de experiência
                          </p>
                          <OysterLogo compact />
                        </div>
                        <h3 className="mt-3 font-display text-[1.75rem] leading-[0.98] text-pearl sm:text-3xl lg:text-4xl">
                          {kit.name}
                        </h3>
                      </div>

                      <ul className="mt-5 flex-1 space-y-3 border-y border-white/10 py-5 lg:mt-7 lg:py-6">
                        <li className="flex items-start gap-2 text-xs leading-5 text-white/75 sm:text-sm">
                          <Check size={15} className="mt-0.5 shrink-0 text-gold" /> {kit.size}
                        </li>
                        {kit.details.map((detail) => (
                          <li key={detail} className="flex items-start gap-2 text-xs leading-5 text-white/55 sm:text-sm">
                            <Check size={15} className="mt-0.5 shrink-0 text-gold" /> {detail}
                          </li>
                        ))}
                      </ul>

                      <Link href={`/produtos/${kit.slug}`} className="mini-gold-button mt-auto w-full justify-center">
                        Ver detalhes <ArrowRight size={15} />
                      </Link>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </div>

          <div className="mt-7 flex justify-center gap-2" aria-label="Posição do carrossel">
            {Array.from({ length: maxSlide + 1 }, (_, index) => (
              <button
                key={index}
                type="button"
                onClick={() => setActiveSlide(index)}
                className={`h-1.5 rounded-full transition-all ${
                  activeSlide === index ? "w-10 bg-gold" : "w-4 bg-white/20 hover:bg-white/40"
                }`}
                aria-label={`Ir para a posição ${index + 1}`}
                aria-current={activeSlide === index ? "true" : undefined}
              />
            ))}
          </div>

          <motion.div
            {...reveal}
            className="mt-12 flex flex-col items-center justify-between gap-6 rounded-2xl border border-gold/20 bg-[#0a0a0a] p-7 md:flex-row md:p-9"
          >
            <div className="flex items-center gap-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-full border border-gold/30 text-gold">
                <Wine size={24} strokeWidth={1.4} />
              </div>
              <div>
                <h3 className="font-display text-2xl text-pearl">Escolha os acompanhamentos</h3>
                <p className="mt-1 text-sm text-white/50">
                  Bebidas geladas e vinhos selecionados para acompanhar suas ostras.
                </p>
              </div>
            </div>
            <Link href="/cardapio" className="outline-button shrink-0">
              Ver cardápio <ChevronRight size={16} />
            </Link>
          </motion.div>
        </div>
      </section>

      <section id="experiencia" className="border-y border-white/10 bg-charcoal py-24 md:py-32">
        <div className="mx-auto max-w-[1280px] px-5 md:px-8">
          <div className="grid items-end gap-8 lg:grid-cols-[1fr_.8fr]">
            <SectionTitle
              align="left"
              eyebrow="Cuidado em cada detalhe"
              title="Por que escolher a Quero Ostra?"
              description="Da seleção ao transporte, desenhamos uma jornada simples para servir um produto delicado com a atenção que ele exige."
            />
            <p className="border-l border-gold/35 pl-6 text-sm leading-7 text-white/45">
              Excelência não está apenas no produto, mas em toda a experiência. Cada detalhe foi
              pensado para oferecer um padrão à altura dos momentos mais especiais.
            </p>
          </div>

          <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {benefits.map((benefit, index) => (
              <motion.div
                key={benefit.title}
                {...reveal}
                transition={{ ...reveal.transition, delay: index * 0.07 }}
                className="group rounded-xl border border-white/10 bg-black/20 p-6 transition hover:border-gold/45 hover:bg-black/40"
              >
                <benefit.icon
                  size={26}
                  strokeWidth={1.35}
                  className="text-gold transition group-hover:text-champagne"
                />
                <h3 className="mt-6 font-display text-xl leading-tight text-pearl">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-xs leading-6 text-white/45">{benefit.copy}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section id="entrega" className="py-24 md:py-32">
        <div className="mx-auto grid max-w-[1280px] gap-12 px-5 md:px-8 lg:grid-cols-[.9fr_1.1fr] lg:items-center">
          <motion.div {...reveal}>
            <SectionTitle
              align="left"
              eyebrow="Área de atendimento"
              title="Entregamos na Zona Sul de SP"
              description="Nossa rota é programada para preservar a temperatura e a qualidade do produto. Consulte seu endereço antes de reservar."
            />
            <div className="mt-8 flex flex-wrap gap-2">
              {neighborhoods.map((name) => (
                <span
                  key={name}
                  className="rounded-full border border-white/10 bg-white/[0.025] px-4 py-2 text-xs text-white/55"
                >
                  {name}
                </span>
              ))}
            </div>

            <form onSubmit={checkCep} className="mt-8 max-w-lg">
              <label htmlFor="quick-cep" className="mb-3 block text-xs uppercase tracking-[0.15em] text-white/45">
                Consulte seu CEP
              </label>
              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  id="quick-cep"
                  name="quick-cep"
                  inputMode="numeric"
                  placeholder="00000-000"
                  className="field h-13 flex-1"
                  aria-label="CEP"
                />
                <button type="submit" className="gold-button justify-center">
                  <MapPin size={17} />
                  Verificar
                </button>
              </div>
              <AnimatePresence mode="wait">
                {cepResult !== "idle" && (
                  <motion.div
                    key={cepResult}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="mt-4 flex items-center gap-2 text-sm"
                  >
                    {cepResult === "checking" && <span className="text-white/50">Consultando área...</span>}
                    {cepResult === "covered" && (
                      <span className="flex items-center gap-2 text-champagne">
                        <Check size={16} /> CEP atendido! Adicione itens ao carrinho e continue.
                      </span>
                    )}
                    {cepResult === "outside" && (
                      <div className="flex flex-col gap-1">
                        <span className="flex items-center gap-2 text-champagne">
                          <Truck size={16} /> Frete: R$&nbsp;18,00
                        </span>
                        <span className="text-xs text-white/45">
                          Frete grátis a partir de 2 dúzias (24 ostras)
                        </span>
                      </div>
                    )}
                    {cepResult === "contact" && (
                      <span className="text-white/55">Digite os 8 números do CEP para consultar.</span>
                    )}
                    {cepResult === "error" && (
                      <span className="text-red-400/80">CEP não encontrado. Verifique e tente novamente.</span>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
          </motion.div>

          <motion.div {...reveal} className="relative min-h-[470px] overflow-hidden rounded-3xl border border-gold/20 bg-[#090909] p-7 md:p-10">
            <p className="relative z-10 mb-4 text-center text-sm italic text-white/50">
              Demais regiões, favor consultar.
            </p>
            <div className="absolute inset-0 map-grid opacity-50" />
            <div className="absolute -right-16 -top-16 size-64 rounded-full bg-gold/10 blur-3xl" />
            <svg viewBox="0 0 620 470" className="relative h-full min-h-[390px] w-full" aria-label="Mapa estilizado da Zona Sul de São Paulo">
              <path
                d="M67 81 144 46l75 34 54-31 86 28 60-21 100 45-24 66 53 54-53 49 25 73-79 29-33 58-86-21-58 33-71-44-82 12-36-72 27-65-54-54 43-65-24-53Z"
                fill="rgba(212,175,55,.035)"
                stroke="rgba(212,175,55,.25)"
                strokeWidth="1.5"
              />
              {[
                "M75 155c90 19 117 54 176 41 63-14 91-70 164-51 44 11 67 48 118 54",
                "M102 316c71-18 115-2 156 31 49 39 91 45 157 9 37-20 73-29 117-10",
                "M171 68c-8 65 22 107 11 161-8 43-41 70-37 126",
                "M356 72c13 48-9 83 1 125 10 45 49 72 52 130",
                "M260 92c32 38 42 82 23 124-18 40-9 83 23 126",
              ].map((path) => (
                <path key={path} d={path} fill="none" stroke="rgba(232,199,106,.15)" strokeWidth="1.5" />
              ))}
              <path
                d="M148 155c56 22 64 83 118 93 56 11 81-41 131-22 40 15 48 65 84 84"
                fill="none"
                stroke="#D4AF37"
                strokeDasharray="5 8"
                strokeLinecap="round"
                strokeWidth="2.5"
              />
              {[
                [148, 155, "Moema"],
                [266, 248, "Brooklin"],
                [397, 226, "Campo Belo"],
                [481, 310, "Santo Amaro"],
              ].map(([x, y, label]) => (
                <g key={String(label)}>
                  <circle cx={Number(x)} cy={Number(y)} r="12" fill="#090909" stroke="#D4AF37" strokeWidth="2" />
                  <circle cx={Number(x)} cy={Number(y)} r="3.5" fill="#E8C76A" />
                  <text x={Number(x) + 18} y={Number(y) + 5} fill="#B3B3B3" fontSize="12">
                    {String(label)}
                  </text>
                </g>
              ))}
            </svg>
            <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between rounded-xl border border-white/10 bg-black/65 px-5 py-4 backdrop-blur">
              <div className="flex items-center gap-3">
                <PackageCheck className="text-gold" size={22} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.13em] text-pearl">Rota refrigerada</p>
                  <p className="mt-1 text-[0.68rem] text-white/45">Quinta, sexta e sábado</p>
                </div>
              </div>
              <span className="hidden text-xs text-champagne sm:block">Zona Sul • SP</span>
            </div>
          </motion.div>
        </div>
      </section>



      <section id="faq" className="py-24 md:py-28">
        <div className="mx-auto max-w-4xl px-5 md:px-8">
          <SectionTitle eyebrow="Dúvidas frequentes" title="Antes de reservar" />
          <div className="mt-12 divide-y divide-white/10 border-y border-white/10">
            {[
              ["As ostras chegam abertas?", "As porções são preparadas para consumo e a apresentação final pode variar conforme o transporte. As instruções de conservação acompanham o pedido."],
              ["Por que preciso reservar antes?", "Compramos as ostras após a confirmação para reduzir o tempo entre o fornecedor e a sua mesa, preservando frescor e qualidade."],
              ["Quais são os dias de entrega?", "As datas abertas aparecem no formulário. A operação prioriza quintas, sextas e sábados na Zona Sul de São Paulo."],
              ["Posso alterar a data?", "Alterações dependem da etapa de compra do fornecedor. Entre em contato o quanto antes pelo WhatsApp."],
            ].map(([question, answer], index) => (
              <details key={question} className="group py-6">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4">
                  <span className="flex items-center gap-4 font-display text-xl text-pearl md:text-2xl">
                    <span className="text-sm text-gold">0{index + 1}</span>
                    {question}
                  </span>
                  <ChevronDown className="shrink-0 text-gold transition group-open:rotate-180" size={19} />
                </summary>
                <p className="max-w-2xl pb-2 pl-10 pt-4 text-sm leading-7 text-white/50">{answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#020202]">
        <div className="mx-auto grid max-w-[1280px] gap-10 px-5 py-14 md:grid-cols-[1.25fr_.7fr_.7fr_1fr] md:px-8">
          <div>
            <OysterLogo />
            <p className="mt-5 max-w-xs text-xs leading-6 text-white/40">
              Ostras selecionadas sob demanda e entregues com data e hora programada em sua casa ou evento para
              transformar momentos especiais em experiências memoráveis.
            </p>
            <div className="mt-6 flex gap-3">
              {[
                { Icon: Instagram, href: instagramUrl, label: "Instagram", external: true },
                {
                  Icon: Facebook,
                  href: "https://facebook.com/queroostraoficial",
                  label: "Facebook",
                  external: true,
                },
                { Icon: MessageCircle, href: whatsappUrl, label: "WhatsApp", external: true },
                { Icon: Mail, href: "mailto:contato@queroostra.com.br", label: "E-mail", external: false },
              ].map(({ Icon, href, label, external }) => (
                <a
                  key={label}
                  href={href}
                  aria-label={label}
                  target={external ? "_blank" : undefined}
                  rel={external ? "noreferrer" : undefined}
                  className="grid size-10 place-items-center rounded-full border border-white/10 text-white/55 transition hover:border-gold hover:text-gold"
                >
                  <Icon size={17} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <p className="footer-title">Institucional</p>
            <div className="footer-links">
              <Link href="/cardapio">Cardápio</Link>
              <Link href="/blog">Blog</Link>
              <button onClick={() => scrollTo("experiencia")}>Sobre nós</button>
              <button onClick={() => scrollTo("como-funciona")}>Como funciona</button>
              <button onClick={() => scrollTo("faq")}>Perguntas frequentes</button>
            </div>
          </div>

          <div>
            <p className="footer-title">Atendimento</p>
            <div className="footer-links">
              <a href={whatsappUrl}>Fale conosco</a>
              <a href={whatsappUrl}>WhatsApp</a>
              <Link href="/dashboard">Acompanhe seu pedido</Link>
            </div>
          </div>

          <div>
            <p className="footer-title">Pagamento protegido</p>
            <div className="mt-5 flex flex-wrap gap-2">
              {["VISA", "mastercard", "elo", "PIX"].map((brand) => (
                <span key={brand} className="rounded border border-white/10 px-3 py-2 text-xs font-semibold text-white/55">
                  {brand}
                </span>
              ))}
            </div>
            <div className="mt-5 flex gap-3">
              <ShieldCheck className="shrink-0 text-gold" size={21} />
              <p className="text-[0.68rem] leading-5 text-white/40">
                Site protegido e dados tratados com segurança.
              </p>
            </div>
          </div>
        </div>

        <div className="border-t border-white/10">
          <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-3 px-5 py-6 text-[0.64rem] text-white/30 sm:flex-row md:px-8">
            <p>© {new Date().getFullYear()} Quero Ostra. Todos os direitos reservados.</p>
            <div className="flex gap-5">
              <a href="#">Política de privacidade</a>
              <a href="#">Termos de uso</a>
            </div>
          </div>
        </div>
      </footer>

      <a
        href={whatsappUrl}
        className="fixed bottom-20 right-5 z-40 grid size-14 place-items-center rounded-full bg-gold text-ink shadow-[0_12px_40px_rgba(212,175,55,.28)] transition hover:scale-105 lg:bottom-5"
        aria-label="Conversar no WhatsApp"
      >
        <MessageCircle size={23} />
      </a>

      <AnimatePresence>
        {selection.count > 0 && !cartOpen && (
          <motion.button
            initial={{ opacity: 0, scale: 0.85, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 30 }}
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-24 right-5 z-40 hidden place-items-center rounded-full bg-gold p-4 text-ink shadow-[0_12px_45px_rgba(212,175,55,.34)] transition hover:scale-105 lg:grid"
            aria-label={`Abrir carrinho com ${selection.count} itens`}
          >
            <ShoppingCart size={22} />
            <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-ink text-[0.6rem] font-bold text-gold ring-2 ring-gold">
              {selection.count}
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              type="button"
              aria-label="Fechar carrinho"
              onClick={() => setCartOpen(false)}
              className="fixed inset-0 z-[70] cursor-default bg-black/70 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
              className="fixed inset-y-0 right-0 z-[80] flex w-full max-w-[520px] flex-col border-l border-gold/20 bg-[#080808] shadow-[-30px_0_90px_rgba(0,0,0,.55)]"
              aria-label="Carrinho de compras"
            >
              <div className="flex items-center justify-between border-b border-white/10 px-5 py-6 md:px-7">
                <div>
                  <p className="text-[0.62rem] font-semibold uppercase tracking-[0.18em] text-gold">
                    Sua seleção
                  </p>
                  <h2 className="mt-2 font-display text-3xl text-pearl">
                    {selection.count} {selection.count === 1 ? "item" : "itens"} no carrinho
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setCartOpen(false)}
                  className="grid size-11 place-items-center rounded-full border border-white/10 text-white/60 transition hover:border-gold hover:text-gold"
                  aria-label="Fechar carrinho"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-5 py-5 md:px-7">
                {cartItems.length === 0 ? (
                  <div className="grid min-h-64 place-items-center text-center">
                    <div>
                      <ShoppingCart className="mx-auto text-gold" size={34} strokeWidth={1.3} />
                      <p className="mt-4 font-display text-2xl text-pearl">Seu carrinho está vazio</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {cartItems.map((item) => {
                      const ItemIcon = categoryIcons[item.category as keyof typeof categoryIcons] ?? ShoppingBag;

                      return (
                        <article
                          key={item.id}
                          className="rounded-2xl border border-white/10 bg-white/[0.025] p-4"
                        >
                          <div className="flex gap-4">
                            <div className="relative grid size-20 shrink-0 place-items-center overflow-hidden rounded-xl border border-white/10 bg-black/30 text-gold">
                              {item.image ? (
                                <Image
                                  src={item.image}
                                  alt={item.name}
                                  fill
                                  unoptimized={item.image.startsWith("http")}
                                  className={item.category === "ostras" ? "object-cover" : "object-contain p-2"}
                                  sizes="80px"
                                />
                              ) : (
                                <ItemIcon size={25} strokeWidth={1.4} />
                              )}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <h3 className="font-display text-xl leading-tight text-pearl">
                                    {item.name}
                                  </h3>
                                  <p className="mt-1 text-[0.65rem] uppercase tracking-[0.11em] text-white/35">
                                    {item.description}
                                  </p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setQuantity(item.id, 0)}
                                  className="grid size-9 shrink-0 place-items-center rounded-full text-white/35 transition hover:bg-red-500/10 hover:text-red-400"
                                  aria-label={`Remover ${item.name}`}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                              <div className="mt-4 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
                                <div>
                                  <p className="text-[0.58rem] uppercase tracking-[0.12em] text-white/30">
                                    Subtotal
                                  </p>
                                  <p className="mt-1 font-display text-2xl text-champagne">
                                    {money.format(item.price * item.quantity)}
                                  </p>
                                </div>
                                <div className="quantity-stepper">
                                  <button
                                    type="button"
                                    onClick={() => setQuantity(item.id, item.quantity - 1)}
                                    aria-label={`Diminuir quantidade de ${item.name}`}
                                  >
                                    <Minus size={16} />
                                  </button>
                                  <input
                                    type="number"
                                    min="0"
                                    max="20"
                                    value={item.quantity}
                                    onChange={(event) => setQuantity(item.id, Number(event.target.value))}
                                    aria-label={`Quantidade de ${item.name}`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setQuantity(item.id, item.quantity + 1)}
                                    aria-label={`Aumentar quantidade de ${item.name}`}
                                  >
                                    <Plus size={16} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-white/10 bg-[#050505] px-5 py-6 md:px-7">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white/55">Preço total</span>
                  <span className="font-display text-3xl font-semibold text-champagne">
                    {money.format(selection.total)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={finishOrder}
                  disabled={selection.count === 0}
                  className="gold-button mt-5 w-full justify-center disabled:cursor-not-allowed disabled:opacity-35"
                >
                  Finalizar compra
                  <ArrowRight size={17} />
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </main>
  );
}
