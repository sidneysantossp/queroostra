import type { Metadata } from "next";
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  Check,
  Clock3,
  PackageCheck,
  ShieldCheck,
  Sparkles,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OysterLogo } from "@/components/oyster-logo";
import { ProductMediaGallery } from "@/components/product-media-gallery";
import { ProductPurchasePanel } from "@/components/product-purchase-panel";
import { products } from "@/lib/catalog";
import type { ProductMedia, ProductRecord } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://queroostra.com.br";
export const revalidate = 300;

const categoryLabels: Record<ProductRecord["type"], string> = {
  fresh: "Ostras frescas",
  gratinated: "Ostras gratinadas",
  beverage: "Bebidas para harmonização",
};

const typeContent: Record<ProductRecord["type"], {
  introduction: string;
  idealFor: string[];
  serving: string;
  conservation: string;
}> = {
  fresh: {
    introduction:
      "Uma experiência preparada sob demanda para preservar frescor, apresentação e qualidade até o momento de servir.",
    idealFor: ["Encontros em casa", "Celebrações intimistas", "Happy hour", "Eventos especiais"],
    serving:
      "Sirva bem gelado, mantenha o produto refrigerado até o consumo e organize a mesa pouco antes da chegada dos convidados.",
    conservation:
      "Mantenha refrigerado e siga as orientações enviadas com o pedido. Por se tratar de alimento fresco, recomendamos o consumo na data programada.",
  },
  gratinated: {
    introduction:
      "Uma seleção preparada para quem busca o sabor das ostras com acabamento gratinado e apresentação marcante.",
    idealFor: ["Jantares especiais", "Recepções", "Brunches", "Experiências gastronômicas"],
    serving:
      "Siga as instruções de finalização e sirva logo após o preparo para preservar textura, aroma e temperatura.",
    conservation:
      "Mantenha refrigerado até a etapa de finalização. As orientações específicas acompanham o pedido.",
  },
  beverage: {
    introduction:
      "Uma opção selecionada para complementar a experiência à mesa e harmonizar com o cardápio Quero Ostra.",
    idealFor: ["Harmonização", "Brindes", "Recepções", "Acompanhamento da refeição"],
    serving:
      "Sirva na temperatura indicada para a categoria e combine com as experiências disponíveis no cardápio.",
    conservation:
      "Armazene conforme as recomendações do fabricante e mantenha protegido de calor e luz direta.",
  },
};

async function getProductBySlug(slug: string): Promise<ProductRecord | undefined> {
  const admin = createAdminClient();
  if (!admin) return products.find((product) => product.slug === slug);
  const { data } = await admin
    .from("products")
    .select("*, product_images(storage_path, is_primary), product_categories(name)")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();
  if (!data) return products.find((product) => product.slug === slug);

  const primaryImage = data.product_images?.find(
    (image: { is_primary: boolean }) => image.is_primary,
  );
  let imageUrl: string | undefined;
  if (primaryImage?.storage_path) {
    if (primaryImage.storage_path.startsWith("http")) {
      imageUrl = primaryImage.storage_path;
    } else {
      imageUrl = admin.storage.from("products").getPublicUrl(primaryImage.storage_path).data.publicUrl;
    }
  }
  const category = Array.isArray(data.product_categories)
    ? data.product_categories[0]
    : data.product_categories;

  return {
    id: data.external_key ?? data.id,
    externalKey: data.external_key ?? undefined,
    slug: data.slug,
    name: data.title,
    shortDescription: data.short_description ?? "",
    fullDescription: data.full_description ?? "",
    type: data.product_type,
    category: data.category_id ?? "",
    categoryName: category?.name,
    price: Number(data.price),
    promotionalPrice: data.promotional_price === null ? undefined : Number(data.promotional_price),
    stock: data.stock,
    active: data.active,
    featured: data.featured,
    image: imageUrl,
    media: (data.product_images ?? [])
      .filter((media: { is_primary: boolean }) => !media.is_primary)
      .sort((a: { display_order: number }, b: { display_order: number }) => a.display_order - b.display_order)
      .map((media: { id: string; storage_path: string; media_type?: "image" | "video"; mime_type?: string; poster_path?: string; alt_text?: string; display_order: number }): ProductMedia => ({
        id: media.id,
        url: media.storage_path.startsWith("http")
          ? media.storage_path
          : admin.storage.from("products").getPublicUrl(media.storage_path).data.publicUrl,
        type: media.media_type ?? "image",
        mimeType: media.mime_type ?? undefined,
        posterUrl: media.poster_path
          ? media.poster_path.startsWith("http")
            ? media.poster_path
            : admin.storage.from("products").getPublicUrl(media.poster_path).data.publicUrl
          : undefined,
        alt: media.alt_text ?? undefined,
        displayOrder: media.display_order,
      })),
    includedItems: data.included_items ?? [],
    preparationHours: data.preparation_hours,
    approximateVolume: data.approximate_volume ?? undefined,
    displayOrder: data.display_order,
    seoTitle: data.seo_title ?? undefined,
    seoDescription: data.seo_description ?? undefined,
  };
}

async function getRelatedProducts(product: ProductRecord) {
  const admin = createAdminClient();
  if (!admin) {
    return products.filter((item) => item.active && item.type === product.type && item.slug !== product.slug).slice(0, 3);
  }
  const { data } = await admin
    .from("products")
    .select("external_key, slug, title, short_description, product_type, price, promotional_price, stock, active, product_images(storage_path, is_primary)")
    .eq("active", true)
    .eq("product_type", product.type)
    .neq("slug", product.slug)
    .order("display_order")
    .limit(3);

  return (data ?? []).map((row) => {
    const primaryImage = row.product_images?.find((image: { is_primary: boolean }) => image.is_primary);
    const image = primaryImage?.storage_path
      ? primaryImage.storage_path.startsWith("http")
        ? primaryImage.storage_path
        : admin.storage.from("products").getPublicUrl(primaryImage.storage_path).data.publicUrl
      : undefined;
    return {
      id: row.external_key,
      slug: row.slug,
      name: row.title,
      shortDescription: row.short_description ?? "",
      type: row.product_type,
      price: Number(row.promotional_price ?? row.price),
      stock: row.stock,
      image,
    };
  });
}

export async function generateStaticParams() {
  const admin = createAdminClient();
  if (!admin) return products.map((product) => ({ slug: product.slug }));
  const { data } = await admin.from("products").select("slug").eq("active", true);
  return (data ?? []).map((product) => ({ slug: product.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const category = categoryLabels[product.type];
  const title = product.seoTitle || `${product.name}: ${category} com entrega programada | Quero Ostra`;
  const description = product.seoDescription || `${product.shortDescription} Conheça detalhes, apresentação, itens inclusos e reserve com entrega programada em São Paulo.`;
  const canonical = `${SITE_URL}/produtos/${product.slug}`;
  const imageUrl = product.image ?? `${SITE_URL}/images/hero-oysters.png`;

  return {
    title,
    description,
    alternates: { canonical },
    keywords: [
      product.name,
      category,
      "Quero Ostra",
      "ostras em São Paulo",
      "entrega programada de ostras",
      "experiência gastronômica",
    ],
    robots: { index: true, follow: true },
    openGraph: {
      siteName: "Quero Ostra",
      type: "website",
      url: canonical,
      title,
      description,
      locale: "pt_BR",
      images: [{ url: imageUrl, width: 1200, height: 630, alt: `${product.name} da Quero Ostra` }],
    },
    twitter: { card: "summary_large_image", title, description, images: [imageUrl] },
  };
}

export default async function ProductDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const relatedProducts = await getRelatedProducts(product);
  const category = categoryLabels[product.type];
  const content = typeContent[product.type];
  const imageUrl = product.image ?? "/images/hero-oysters.png";
  const galleryCover: ProductMedia = {
    url: imageUrl,
    type: "image",
    alt: `${product.name} - ${product.shortDescription}`,
    displayOrder: 0,
  };
  const absoluteImageUrl = imageUrl.startsWith("http") ? imageUrl : `${SITE_URL}${imageUrl}`;
  const price = product.promotionalPrice ?? product.price;
  const canonical = `${SITE_URL}/produtos/${product.slug}`;
  const faq = [
    {
      question: `O que acompanha ${product.name}?`,
      answer: product.includedItems.length > 0
        ? `A experiência inclui ${product.includedItems.join(", ")}. Consulte a descrição para conferir a composição atual.`
        : "A unidade corresponde à apresentação descrita nesta página e pode ser combinada com outros itens do cardápio.",
    },
    {
      question: "Como funciona a entrega?",
      answer: "A entrega é programada por data e janela de horário disponível no checkout. A cobertura é confirmada pelo CEP.",
    },
    {
      question: "Qual é a antecedência necessária?",
      answer: product.preparationHours > 0
        ? `O preparo exige antecedência mínima de ${product.preparationHours} horas, sujeita à disponibilidade da agenda.`
        : "A disponibilidade é confirmada durante a seleção da data no checkout.",
    },
    {
      question: "Existe desconto no pagamento?",
      answer: "Pagamentos via PIX recebem 5% de desconto. Cupons ativos também podem ser aplicados no checkout conforme suas regras.",
    },
  ];

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${canonical}#product`,
    name: product.name,
    description: product.fullDescription || product.shortDescription,
    image: [absoluteImageUrl, ...(product.media ?? []).filter((item) => item.type === "image").map((item) => item.url)],
    sku: product.externalKey ?? product.id,
    brand: { "@type": "Brand", name: "Quero Ostra" },
    category,
    offers: {
      "@type": "Offer",
      url: canonical,
      priceCurrency: "BRL",
      price: price.toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability: product.stock > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: "Quero Ostra", url: SITE_URL },
    },
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Cardápio", item: `${SITE_URL}/cardapio` },
      { "@type": "ListItem", position: 3, name: product.name, item: canonical },
    ],
  };
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <main className="min-h-screen bg-ink text-pearl">
      {[productJsonLd, breadcrumbJsonLd, faqJsonLd].map((data, index) => (
        <script key={index} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
      ))}

      <header className="border-b border-white/10 bg-[#050505]">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Link href="/" aria-label="Quero Ostra"><OysterLogo /></Link>
          <nav className="flex items-center gap-5">
            <Link href="/cardapio" className="hidden text-xs font-semibold uppercase tracking-[0.14em] text-white/55 transition hover:text-gold sm:block">Cardápio</Link>
            <Link href="/cardapio?cart=open" className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">Carrinho</Link>
          </nav>
        </div>
      </header>

      <div className="mx-auto max-w-[1280px] px-5 pt-7 md:px-8">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-[0.68rem] uppercase tracking-[0.12em] text-white/35">
          <Link href="/" className="hover:text-gold">Início</Link><span>/</span>
          <Link href="/cardapio" className="hover:text-gold">Cardápio</Link><span>/</span>
          <span className="text-white/65">{product.name}</span>
        </nav>
      </div>

      <section className="mx-auto grid max-w-[1280px] gap-10 px-5 py-10 md:px-8 lg:grid-cols-[.95fr_1.05fr] lg:py-16">
        <div className="lg:sticky lg:top-6 lg:self-start">
          <ProductMediaGallery productName={product.name} cover={galleryCover} media={product.media ?? []} />
        </div>

        <article className="flex flex-col justify-center lg:pl-4">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">{category}</p>
          <h1 className="mt-4 font-display text-5xl leading-[0.95] md:text-7xl">{product.name}</h1>
          <p className="mt-5 text-lg leading-8 text-white/65">{product.shortDescription}</p>
          <p className="mt-5 text-sm leading-7 text-white/45">{product.fullDescription || content.introduction}</p>

          {product.includedItems.length > 0 && (
            <div className="mt-7 border-y border-white/10 py-6">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.15em] text-white/35">O que acompanha</p>
              <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                {product.includedItems.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-white/60"><Check size={16} className="text-gold" /> {item}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">
              <Clock3 className="text-gold" size={20} />
              <p className="mt-3 text-[0.6rem] uppercase tracking-[0.13em] text-white/30">Antecedência</p>
              <p className="mt-2 font-display text-2xl">{product.preparationHours > 0 ? `${product.preparationHours} horas` : "Sob consulta"}</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <PackageCheck className="text-gold" size={20} />
              <p className="mt-3 text-[0.6rem] uppercase tracking-[0.13em] text-white/30">Apresentação</p>
              <p className="mt-2 font-display text-2xl">{product.approximateVolume ?? "Unidade"}</p>
            </div>
          </div>

          <div className="mt-7">
            <ProductPurchasePanel productId={product.externalKey ?? product.id} productName={product.name} price={price} stock={product.stock} />
          </div>
        </article>
      </section>

      <section className="border-y border-white/10 bg-charcoal">
        <div className="mx-auto max-w-[1100px] px-5 py-20 md:px-8 md:py-28">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold">Experiência Quero Ostra</p>
          <h2 className="mt-4 max-w-3xl font-display text-4xl leading-tight md:text-6xl">
            Detalhes pensados para servir bem do pedido à mesa
          </h2>
          <p className="mt-6 max-w-3xl text-base leading-8 text-white/50">{content.introduction}</p>

          <div className="mt-12 grid gap-5 md:grid-cols-3">
            {[
              { icon: CalendarClock, title: "Entrega programada", text: "Escolha a data e a janela disponível. A cobertura e o valor do frete são confirmados pelo CEP." },
              { icon: ShieldCheck, title: "Compra segura", text: "O pedido é recalculado no servidor antes da cobrança e pode receber desconto no PIX ou cupom válido." },
              { icon: Truck, title: "Preparado sob demanda", text: "A operação organiza o pedido para a data escolhida, reduzindo estoque parado e preservando a experiência." },
            ].map(({ icon: Icon, title, text }) => (
              <div key={title} className="rounded-2xl border border-white/10 bg-black/20 p-6">
                <Icon className="text-gold" size={24} />
                <h3 className="mt-5 font-display text-2xl">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-white/45">{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-[1100px] gap-10 px-5 py-20 md:px-8 md:py-28 lg:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Como aproveitar</p>
          <h2 className="mt-4 font-display text-4xl md:text-5xl">Ocasiões e forma de servir</h2>
          <p className="mt-5 text-sm leading-7 text-white/50">{content.serving}</p>
          <ul className="mt-7 grid gap-3 sm:grid-cols-2">
            {content.idealFor.map((occasion) => (
              <li key={occasion} className="flex items-center gap-3 rounded-xl border border-white/10 p-4 text-sm text-white/60">
                <Sparkles size={16} className="text-gold" /> {occasion}
              </li>
            ))}
          </ul>
        </div>
        <aside className="rounded-2xl border border-gold/20 bg-gold/[0.04] p-7">
          <PackageCheck className="text-gold" size={27} />
          <h2 className="mt-5 font-display text-3xl">Conservação e consumo</h2>
          <p className="mt-4 text-sm leading-7 text-white/50">{content.conservation}</p>
          <p className="mt-5 text-xs leading-6 text-white/35">
            As informações desta página descrevem a experiência comercial. Instruções específicas de conservação e finalização acompanham o pedido quando aplicáveis.
          </p>
        </aside>
      </section>

      <section className="border-y border-white/10 bg-[#050505]">
        <div className="mx-auto max-w-[900px] px-5 py-20 md:px-8 md:py-24">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-gold">Dúvidas frequentes</p>
          <h2 className="mt-4 text-center font-display text-4xl md:text-5xl">Antes de reservar</h2>
          <div className="mt-10 divide-y divide-white/10 border-y border-white/10">
            {faq.map((item) => (
              <details key={item.question} className="group py-5">
                <summary className="cursor-pointer list-none font-display text-xl text-pearl md:text-2xl">{item.question}</summary>
                <p className="max-w-3xl pt-4 text-sm leading-7 text-white/50">{item.answer}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-[1280px] px-5 py-20 md:px-8 md:py-28">
          <div className="flex items-end justify-between gap-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Continue explorando</p>
              <h2 className="mt-3 font-display text-4xl md:text-5xl">Produtos relacionados</h2>
            </div>
            <Link href="/cardapio" className="hidden items-center gap-2 text-xs uppercase tracking-[0.12em] text-champagne sm:inline-flex">Ver cardápio <ArrowRight size={15} /></Link>
          </div>
          <div className="mt-9 grid gap-5 md:grid-cols-3">
            {relatedProducts.map((item) => (
              <Link key={item.slug} href={`/produtos/${item.slug}`} className="group overflow-hidden rounded-2xl border border-white/10 bg-[#080808] transition hover:border-gold/40">
                <div className="relative aspect-[4/3] bg-black">
                  {item.image && <Image src={item.image} alt={item.name} fill unoptimized={item.image.startsWith("http")} className="object-contain p-4 transition duration-500 group-hover:scale-105" sizes="(max-width: 767px) 100vw, 33vw" />}
                </div>
                <div className="p-5">
                  <p className="text-[0.6rem] uppercase tracking-[0.14em] text-gold">{categoryLabels[item.type as ProductRecord["type"]]}</p>
                  <h3 className="mt-2 font-display text-2xl">{item.name}</h3>
                  <p className="mt-3 text-sm leading-6 text-white/40">{item.shortDescription}</p>
                  <span className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.12em] text-champagne">Ver detalhes <ArrowRight size={14} /></span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      <footer className="border-t border-white/10 bg-black">
        <div className="mx-auto flex max-w-[1280px] flex-col justify-between gap-6 px-5 py-10 md:flex-row md:items-center md:px-8">
          <OysterLogo />
          <Link href="/cardapio" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold"><ArrowLeft size={15} /> Voltar ao cardápio</Link>
        </div>
      </footer>
    </main>
  );
}
