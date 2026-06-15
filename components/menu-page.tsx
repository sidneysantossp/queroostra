"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Beer,
  Check,
  CupSoda,
  GlassWater,
  Minus,
  Plus,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  Wine,
  X,
  type LucideIcon,
} from "lucide-react";
import {
  beverageCategories,
  CART_STORAGE_KEY,
  cartProducts,
  oysterExperiences,
} from "@/components/catalog-data";
import type { CartProduct } from "@/components/catalog-data";
import type { ProductRecord } from "@/lib/domain";
import { OysterLogo } from "@/components/oyster-logo";
import { SectionTitle } from "@/components/section-title";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const categoryIcons: Record<string, LucideIcon> = {
  aguas: GlassWater,
  refrigerantes: CupSoda,
  cervejas: Beer,
  vinhos: Wine,
};

function QuantityControl({
  id,
  name,
  quantity,
  onChange,
}: {
  id: string;
  name: string;
  quantity: number;
  onChange: (id: string, quantity: number) => void;
}) {
  return (
    <div className="quantity-stepper">
      <button
        type="button"
        onClick={() => onChange(id, quantity - 1)}
        aria-label={`Diminuir quantidade de ${name}`}
      >
        <Minus size={16} />
      </button>
      <input
        type="number"
        min="0"
        max="20"
        value={quantity}
        onChange={(event) => onChange(id, Number(event.target.value))}
        aria-label={`Quantidade de ${name}`}
      />
      <button
        type="button"
        onClick={() => onChange(id, quantity + 1)}
        aria-label={`Aumentar quantidade de ${name}`}
      >
        <Plus size={16} />
      </button>
    </div>
  );
}

export function MenuPage() {
  const router = useRouter();
  const [liveProducts, setLiveProducts] = useState<ProductRecord[]>([]);
  const liveMap = useMemo(
    () => new Map(liveProducts.map((product) => [product.externalKey ?? product.id, product])),
    [liveProducts],
  );
  const displayExperiences = useMemo(() => {
    const known = oysterExperiences.map((product) => {
      const live = liveMap.get(product.id);
      return live
        ? {
            ...product,
            name: live.name,
            size: live.shortDescription,
            details: live.includedItems,
            price: live.promotionalPrice ?? live.price,
            image: live.image ?? product.image,
          }
        : product;
    });
    const knownIds = new Set(known.map((product) => product.id));
    return [
      ...known,
      ...liveProducts
        .filter((product) => product.type !== "beverage" && !knownIds.has(product.externalKey ?? product.id))
        .map((product) => ({
          id: product.externalKey ?? product.id,
          name: product.name,
          size: product.shortDescription,
          details: product.includedItems,
          price: product.promotionalPrice ?? product.price,
          image: product.image ?? "/images/hero-oysters.png",
          tag: product.featured ? "Destaque" : undefined,
        })),
    ];
  }, [liveMap, liveProducts]);
  const displayBeverageCategories = useMemo(
    () =>
      beverageCategories.map((category) => ({
        ...category,
        products: category.products.map((product) => {
          const live = liveMap.get(product.id);
          return live
            ? {
                ...product,
                name: live.name,
                description: live.shortDescription,
                price: live.promotionalPrice ?? live.price,
              }
            : product;
        }),
      })),
    [liveMap],
  );
  const displayCartProducts = useMemo<CartProduct[]>(
    () => [
      ...displayExperiences.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.size,
        price: product.price,
        category: "ostras",
        image: product.image,
      })),
      ...displayBeverageCategories.flatMap((category) =>
        category.products.map((product) => ({ ...product, category: category.id })),
      ),
    ],
    [displayBeverageCategories, displayExperiences],
  );
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(cartProducts.map((item) => [item.id, 0])),
  );
  const [cartOpen, setCartOpen] = useState(false);
  const [cartReady, setCartReady] = useState(false);

  const cartItems = useMemo(() => {
    return displayCartProducts
      .filter((item) => (quantities[item.id] ?? 0) > 0)
      .map((item) => ({
        ...item,
        quantity: quantities[item.id] ?? 0,
      }));
  }, [displayCartProducts, quantities]);

  useEffect(() => {
    void fetch("/api/catalog")
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { products?: ProductRecord[] } | null) => {
        if (data?.products) setLiveProducts(data.products);
      });
  }, []);

  useEffect(() => {
    setQuantities((current) => ({
      ...Object.fromEntries(displayCartProducts.map((item) => [item.id, 0])),
      ...current,
    }));
  }, [displayCartProducts]);

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
        setQuantities((current) => ({ ...current, ...parsed }));
      }
    } catch {
      window.localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setCartReady(true);
    }
  }, []);

  useEffect(() => {
    if (!cartReady) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(quantities));
  }, [cartReady, quantities]);

  useEffect(() => {
    document.body.style.overflow = cartOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [cartOpen]);

  function setQuantity(id: string, quantity: number) {
    const nextQuantity = Math.min(20, Math.max(0, Math.round(quantity) || 0));
    const shouldOpenCart = (quantities[id] ?? 0) === 0 && nextQuantity > 0;
    setQuantities((current) => ({ ...current, [id]: nextQuantity }));
    if (shouldOpenCart) setCartOpen(true);
  }

  function finishOrder() {
    if (selection.count === 0) return;
    setCartOpen(false);
    router.push("/checkout");
  }

  return (
    <main className="min-h-screen overflow-hidden bg-ink text-pearl">
      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-ink/90 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-[1320px] items-center justify-between gap-3 px-5 md:px-8">
          <Link href="/" aria-label="Voltar para a página inicial" className="shrink-0">
            <span className="sm:hidden">
              <OysterLogo compact />
            </span>
            <span className="hidden sm:block">
              <OysterLogo />
            </span>
          </Link>

          <nav className="hidden items-center gap-8 lg:flex">
            {[
              ["Experiências", "ostras"],
              ["Bebidas", "bebidas"],
              ["Vinhos", "vinhos"],
            ].map(([label, id]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-[0.69rem] font-semibold uppercase tracking-[0.16em] text-white/65 transition hover:text-champagne"
              >
                {label}
              </a>
            ))}
          </nav>

          <Link
            href="/#reserva"
            className="inline-flex shrink-0 items-center gap-2 rounded-full border border-gold/70 px-3 py-3 text-[0.6rem] font-semibold uppercase tracking-[0.12em] text-champagne transition hover:bg-gold hover:text-ink sm:px-4 md:px-5 md:text-[0.68rem]"
          >
            <span className="sm:hidden">Reserva</span>
            <span className="hidden sm:inline">Fazer reserva</span>
            <ArrowRight size={15} />
          </Link>
        </div>
      </header>

      <section className="relative overflow-hidden border-b border-white/10 pt-20">
        <div className="absolute inset-0">
          <Image
            src="/images/hero-oysters.png"
            alt=""
            fill
            priority
            className="object-cover opacity-35"
            sizes="100vw"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(90deg,#050505_8%,rgba(5,5,5,.88)_48%,rgba(5,5,5,.65)_100%)]" />
        <div className="relative mx-auto max-w-[1320px] px-5 py-24 md:px-8 md:py-32">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold transition hover:text-champagne"
          >
            <ArrowLeft size={16} />
            Voltar ao início
          </Link>
          <p className="mt-12 text-xs font-semibold uppercase tracking-[0.28em] text-gold">
            Experiências e acompanhamentos
          </p>
          <h1 className="mt-5 max-w-4xl font-display text-[3.25rem] font-semibold leading-[0.9] text-pearl sm:text-6xl md:text-8xl">
            Cardápio Quero Ostra
          </h1>
          <p className="mt-7 max-w-2xl text-base leading-8 text-white/60 md:text-lg">
            Escolha suas ostras e encontre bebidas para acompanhar cada momento, dos
            clássicos gelados às harmonizações com vinho.
          </p>
          <div className="mt-10 flex flex-wrap gap-3">
            {["Ostras", "Águas", "Refrigerantes", "Cervejas", "Vinhos"].map((label) => (
              <span
                key={label}
                className="rounded-full border border-gold/25 bg-black/35 px-4 py-2 text-xs uppercase tracking-[0.13em] text-white/60"
              >
                {label}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="ostras" className="relative py-24 md:py-32">
        <div className="absolute inset-0 luxury-grid opacity-35" />
        <div className="relative mx-auto max-w-[1320px] px-5 md:px-8">
          <SectionTitle
            eyebrow="Frescor do mar"
            title="Experiências com ostras"
            description="As mesmas experiências da nossa vitrine, reunidas no cardápio para facilitar sua escolha."
          />

          <div className="mt-14 grid gap-7 lg:grid-cols-2">
            {displayExperiences.map((product) => {
              const quantity = quantities[product.id] ?? 0;
              const subtotal = product.price * quantity;

              return (
                <article
                  key={product.id}
                  className={`product-card group h-full ${product.tag ? "featured-card" : ""}`}
                >
                  {product.tag && (
                    <span className="absolute left-1/2 top-0 z-20 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold-gradient px-5 py-2 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-ink shadow-lg">
                      {product.tag}
                    </span>
                  )}
                  <div className="product-card-media relative aspect-[16/9] overflow-hidden">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      unoptimized={product.image.startsWith("http")}
                      className="object-cover transition duration-700 group-hover:scale-105"
                      sizes="(max-width: 1023px) 100vw, 50vw"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#090909] via-transparent to-transparent" />
                  </div>
                  <div className="p-7 md:p-9">
                    <p className="text-[0.65rem] font-semibold uppercase tracking-[0.2em] text-gold">
                      Tipo de experiência
                    </p>
                    <h2 className="mt-3 font-display text-4xl text-pearl">{product.name}</h2>

                    <ul className="mt-7 grid gap-3 border-y border-white/10 py-6 sm:grid-cols-2">
                      {[product.size, ...product.details].map((detail) => (
                        <li key={detail} className="flex items-center gap-2 text-sm text-white/55">
                          <Check size={15} className="text-gold" />
                          {detail}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-7 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                      <div>
                        <p className="text-[0.63rem] uppercase tracking-[0.16em] text-white/40">
                          {quantity > 0 ? `${quantity} ${quantity === 1 ? "porção" : "porções"}` : "Por porção"}
                        </p>
                        <p className="mt-1 font-display text-4xl font-semibold text-champagne">
                          {money.format(quantity > 0 ? subtotal : product.price)}
                        </p>
                      </div>
                      <div className="flex flex-col items-start gap-2 sm:items-end">
                        <span className="text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/40">
                          Quantidade
                        </span>
                        <QuantityControl
                          id={product.id}
                          name={product.name}
                          quantity={quantity}
                          onChange={setQuantity}
                        />
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section id="bebidas" className="border-y border-white/10 bg-charcoal py-24 md:py-32">
        <div className="mx-auto max-w-[1320px] px-5 md:px-8">
          <SectionTitle
            eyebrow="Para acompanhar"
            title="Bebidas e harmonizações"
            description="Opções geladas e vinhos selecionados para completar a mesa."
          />

          <div className="mt-16 space-y-16">
            {displayBeverageCategories.map((category) => {
              const CategoryIcon = categoryIcons[category.id] ?? GlassWater;

              return (
                <section key={category.id} id={category.id} className="scroll-mt-28">
                  <div className="flex flex-col justify-between gap-5 border-b border-white/10 pb-7 md:flex-row md:items-end">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
                        {category.eyebrow}
                      </p>
                      <h2 className="mt-3 font-display text-4xl text-pearl md:text-5xl">
                        {category.name}
                      </h2>
                      <p className="mt-3 max-w-2xl text-sm leading-7 text-white/45">
                        {category.description}
                      </p>
                    </div>
                    <div className="grid size-14 shrink-0 place-items-center rounded-full border border-gold/35 text-gold">
                      <CategoryIcon size={25} strokeWidth={1.4} />
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                    {category.products.map((product) => {
                      const quantity = quantities[product.id] ?? 0;
                      const subtotal = product.price * quantity;

                      return (
                        <article
                          key={product.id}
                          className="rounded-2xl border border-white/10 bg-[#080808] p-6 transition hover:border-gold/40"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-display text-2xl text-pearl">{product.name}</h3>
                              <p className="mt-2 text-xs uppercase tracking-[0.12em] text-white/35">
                                {product.description}
                              </p>
                            </div>
                            <CategoryIcon className="shrink-0 text-gold" size={21} strokeWidth={1.4} />
                          </div>

                          <div className="mt-7 flex flex-col items-start justify-between gap-5 border-t border-white/10 pt-6 sm:flex-row sm:items-end">
                            <div>
                              <p className="text-[0.6rem] uppercase tracking-[0.14em] text-white/35">
                                {quantity > 0 ? "Subtotal" : "Unidade"}
                              </p>
                              <p className="mt-1 font-display text-3xl text-champagne">
                                {money.format(quantity > 0 ? subtotal : product.price)}
                              </p>
                            </div>
                            <QuantityControl
                              id={product.id}
                              name={product.name}
                              quantity={quantity}
                              onChange={setQuantity}
                            />
                          </div>
                        </article>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="mx-auto max-w-[1100px] px-5 md:px-8">
          <div className="flex flex-col items-center justify-between gap-7 rounded-2xl border border-gold/25 bg-gold/[0.04] p-7 md:flex-row md:p-10">
            <div className="flex items-center gap-5">
              <div className="grid size-14 shrink-0 place-items-center rounded-full border border-gold/35 text-gold">
                <ShoppingBag size={24} strokeWidth={1.4} />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-white/40">
                  Seleção estimada
                </p>
                <h2 className="mt-2 font-display text-3xl text-pearl">
                  {selection.count > 0
                    ? `${selection.count} ${selection.count === 1 ? "item" : "itens"} • ${money.format(selection.total)}`
                    : "Escolha seus acompanhamentos"}
                </h2>
                <p className="mt-2 text-sm text-white/45">
                  A disponibilidade e o valor final serão confirmados na reserva.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              disabled={selection.count === 0}
              className="gold-button shrink-0 disabled:cursor-not-allowed disabled:opacity-35"
            >
              Ver carrinho
              <ShoppingCart size={17} />
            </button>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-[#020202]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-start justify-between gap-8 px-5 py-12 md:flex-row md:items-center md:px-8">
          <div>
            <OysterLogo />
            <p className="mt-4 text-xs text-white/35">
              Ostras frescas, bebidas geladas e harmonizações para sua mesa.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="outline-button">
              <ArrowLeft size={16} />
              Página inicial
            </Link>
            <Link href="/#reserva" className="gold-button">
              Fazer reserva
              <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </footer>

      <AnimatePresence>
        {selection.count > 0 && (
          <motion.button
            initial={{ opacity: 0, scale: 0.75, x: 20 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.75, x: 20 }}
            type="button"
            onClick={() => setCartOpen(true)}
            className="fixed bottom-6 right-5 z-[55] grid size-16 place-items-center rounded-full bg-gold-gradient text-ink shadow-[0_18px_55px_rgba(212,175,55,.28)] transition hover:scale-105 md:bottom-8 md:right-8"
            aria-label={`Abrir carrinho com ${selection.count} itens`}
          >
            <ShoppingCart size={25} strokeWidth={1.8} />
            <span className="absolute -right-1 -top-1 grid min-h-6 min-w-6 place-items-center rounded-full border-2 border-ink bg-pearl px-1 text-[0.65rem] font-bold text-ink">
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
                      const ItemIcon = categoryIcons[item.category] ?? ShoppingBag;

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
                                  className="object-cover"
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
                                <QuantityControl
                                  id={item.id}
                                  name={item.name}
                                  quantity={item.quantity}
                                  onChange={setQuantity}
                                />
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
