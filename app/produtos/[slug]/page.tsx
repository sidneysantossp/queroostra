import type { Metadata } from "next";
import { ArrowLeft, ArrowRight, Check, Clock3, PackageCheck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { OysterLogo } from "@/components/oyster-logo";
import { products } from "@/lib/catalog";
import type { ProductRecord } from "@/lib/domain";
import { createAdminClient } from "@/lib/supabase/admin";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export const dynamic = "force-dynamic";

const categoryLabels: Record<string, string> = {
  fresh: "Ostras Frescas",
  gratinated: "Ostras Gratinadas",
  beverage: "Bebidas para Harmonização",
};

async function getProductBySlug(slug: string): Promise<ProductRecord | undefined> {
  const admin = createAdminClient();
  if (!admin) return products.find((product) => product.slug === slug);
  const { data } = await admin
    .from("products")
    .select("*, product_images(storage_path, is_primary)")
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
      const { data: urlData } = admin.storage.from("products").getPublicUrl(primaryImage.storage_path);
      imageUrl = urlData.publicUrl;
    }
  }

  return {
    id: data.external_key ?? data.id,
    externalKey: data.external_key ?? undefined,
    slug: data.slug,
    name: data.title,
    shortDescription: data.short_description ?? "",
    fullDescription: data.full_description ?? "",
    type: data.product_type,
    category: data.category_id ?? "",
    price: Number(data.price),
    promotionalPrice:
      data.promotional_price === null ? undefined : Number(data.promotional_price),
    stock: data.stock,
    active: data.active,
    featured: data.featured,
    image: imageUrl,
    includedItems: data.included_items ?? [],
    preparationHours: data.preparation_hours,
    approximateVolume: data.approximate_volume ?? undefined,
    displayOrder: data.display_order,
  };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) return {};

  const category = categoryLabels[product.type] ?? "Acompanhamentos";
  const title = `${product.name} - ${category} | Quero Ostra SP`;
  const description =
    product.fullDescription ||
    product.shortDescription ||
    `${product.name} ${category} com entrega programada na Zona Sul de São Paulo.`;
  const imageUrl = product.image ?? "https://queroostra.com.br/images/hero-oysters.png";

  return {
    title,
    description,
    openGraph: {
      siteName: "Quero Ostra",
      type: "website",
      url: `https://queroostra.com.br/produtos/${product.slug}`,
      title,
      description,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: `${product.name} - Quero Ostra`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [imageUrl],
    },
  };
}

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const category = categoryLabels[product.type] ?? "Acompanhamentos";
  const imageUrl = product.image ?? "/images/hero-oysters.png";
  const absoluteImageUrl = imageUrl.startsWith("http")
    ? imageUrl
    : `https://queroostra.com.br${imageUrl}`;

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.fullDescription || product.shortDescription,
    image: [absoluteImageUrl],
    brand: { "@type": "Brand", name: "Quero Ostra" },
    category,
    offers: {
      "@type": "Offer",
      url: `https://queroostra.com.br/produtos/${product.slug}`,
      priceCurrency: "BRL",
      price: (product.promotionalPrice ?? product.price).toFixed(2),
      itemCondition: "https://schema.org/NewCondition",
      availability:
        product.stock > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      shippingDetails: {
        "@type": "OfferShippingDetails",
        shippingDestination: {
          "@type": "DefinedRegion",
          addressRegion: "SP",
          addressLocality: "São Paulo",
        },
      },
      seller: {
        "@type": "Organization",
        name: "Quero Ostra",
      },
    },
  };

  return (
    <main className="min-h-screen bg-ink text-pearl">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(productJsonLd) }}
      />
      <header className="border-b border-white/10">
        <div className="mx-auto flex h-20 max-w-[1280px] items-center justify-between px-5 md:px-8">
          <Link href="/"><OysterLogo /></Link>
          <Link href="/produtos" className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            <ArrowLeft size={16} /> Produtos
          </Link>
        </div>
      </header>

      <section className="mx-auto grid max-w-[1280px] gap-8 px-5 py-12 md:px-8 lg:grid-cols-2 lg:py-20">
        <div className="relative min-h-[420px] overflow-hidden rounded-2xl border border-gold/20 lg:min-h-[650px]">
          <Image
            src={imageUrl}
            alt={product.name}
            fill
            priority
            unoptimized={imageUrl.startsWith("http")}
            className={product.type === "beverage" ? "object-contain p-6" : "object-cover"}
            sizes="(max-width: 1023px) 100vw, 50vw"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
        </div>

        <div className="flex flex-col justify-center lg:pl-8">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-gold">
            {category}
          </p>
          <h1 className="mt-4 font-display text-5xl leading-none md:text-7xl">{product.name}</h1>
          <p className="mt-6 text-base leading-8 text-white/55">{product.fullDescription}</p>

          {product.includedItems.length > 0 && (
            <ul className="mt-8 grid gap-3 border-y border-white/10 py-7 sm:grid-cols-2">
              {product.includedItems.map((item) => (
                <li key={item} className="flex items-center gap-2 text-sm text-white/55">
                  <Check size={16} className="text-gold" /> {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-white/10 p-4">
              <Clock3 className="text-gold" size={20} />
              <p className="mt-3 text-[0.6rem] uppercase tracking-[0.13em] text-white/30">Preparo mínimo</p>
              <p className="mt-2 font-display text-2xl">{product.preparationHours} horas</p>
            </div>
            <div className="rounded-xl border border-white/10 p-4">
              <PackageCheck className="text-gold" size={20} />
              <p className="mt-3 text-[0.6rem] uppercase tracking-[0.13em] text-white/30">Apresentação</p>
              <p className="mt-2 font-display text-2xl">{product.approximateVolume ?? "Unidade"}</p>
            </div>
          </div>

          <div className="mt-9 flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <p className="text-[0.62rem] uppercase tracking-[0.14em] text-white/35">A partir de</p>
              <p className="mt-1 font-display text-5xl text-champagne">{money.format(product.price)}</p>
            </div>
            <Link href="/cardapio" className="gold-button">
              Adicionar ao pedido <ArrowRight size={17} />
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
