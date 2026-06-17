import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";

export const metadata: Metadata = {
  title: "Ostras Frescas e Gratinadas - Experiências Premium | Quero Ostra SP",
  description:
    "Conheça nossas experiências com ostras frescas, gratinadas e bebidas selecionadas para harmonização. Entrega programada na Zona Sul de São Paulo.",
  openGraph: {
    siteName: "Quero Ostra",
    type: "website",
    url: "https://queroostra.com.br/produtos",
    title: "🦪 Ostras Frescas e Gratinadas - Experiências Premium | Quero Ostra SP",
    description:
      "Experiências com ostras frescas, gratinadas e bebidas selecionadas. Entrega programada na Zona Sul de São Paulo.",
    images: [
      {
        url: "https://queroostra.com.br/images/hero-oysters.png",
        width: 1200,
        height: 630,
        alt: "Experiências com ostras frescas Quero Ostra",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "🦪 Ostras Premium | Quero Ostra SP",
    description:
      "Experiências com ostras frescas e gratinadas com entrega programada na Zona Sul de SP.",
    images: ["https://queroostra.com.br/images/hero-oysters.png"],
  },
};

export default function ProductsPage() {
  return <MenuPage />;
}
