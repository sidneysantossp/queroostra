import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { GlobalMobileNav } from "@/components/global-mobile-nav";
import "./globals.css";

export async function generateMetadata(): Promise<Metadata> {
  const admin = createAdminClient();
  const { data } = admin
    ? await admin
        .from("site_content")
        .select("content_value")
        .eq("content_key", "home")
        .eq("published", true)
        .maybeSingle()
    : { data: null };
  const content = data?.content_value as
    | {
        seoTitle?: string;
        seoDescription?: string;
        heroImage?: string;
      }
    | undefined;
  const title =
    content?.seoTitle ?? "Quero Ostra | Ostras frescas com entrega programada";
  const description =
    content?.seoDescription ??
    "Reserve ostras frescas selecionadas, escolha a data e receba uma experiência gastronômica premium na Zona Sul de São Paulo.";
  return {
    metadataBase: new URL(
      process.env.NEXT_PUBLIC_SITE_URL ?? "https://queroostra.com.br",
    ),
    title,
    description,
    keywords: [
      "ostras frescas",
      "ostras São Paulo",
      "entrega de ostras",
      "frutos do mar premium",
      "Zona Sul de São Paulo",
    ],
    openGraph: {
      title,
      description,
      siteName: "Quero Ostra",
      locale: "pt_BR",
      type: "website",
      images: [content?.heroImage ?? "/images/hero-oysters.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <head>
        <meta
          name="google-site-verification"
          content="CU-BjqNCEUFVmWz-0y-ssyaygtEdGn2IyNdfBFgPlZ8"
        />
        <meta name="theme-color" content="#090909" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "LocalBusiness",
              name: "Quero Ostra",
              description:
                "Ostras frescas selecionadas com entrega programada na Zona Sul de São Paulo.",
              url: "https://queroostra.com.br",
              image: "https://queroostra.com.br/images/hero-oysters.png",
              telephone: "+5511999999999",
              address: {
                "@type": "PostalAddress",
                addressLocality: "São Paulo",
                addressRegion: "SP",
                addressCountry: "BR",
              },
              areaServed: {
                "@type": "Place",
                name: "Zona Sul de São Paulo",
              },
              priceRange: "$$",
              sameAs: ["https://instagram.com/queroostra"],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "Quero Ostra",
              url: "https://queroostra.com.br",
              potentialAction: {
                "@type": "SearchAction",
                target: "https://queroostra.com.br/produtos?q={search_term_string}",
                "query-input": "required name=search_term_string",
              },
            }),
          }}
        />
      </head>
      <body>
        {children}
        <GlobalMobileNav />
      </body>
    </html>
  );
}
