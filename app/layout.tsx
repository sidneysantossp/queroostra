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
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <GlobalMobileNav />
      </body>
    </html>
  );
}
