import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";

export const metadata: Metadata = {
  title: "Cardápio Quero Ostra | Ostras Frescas e Gratinadas em SP",
  description:
    "Confira nosso cardápio! Ostras premium frescas, baby e gratinadas a partir de R$ 69,90. Reserve até as 18h para entrega programada na Zona Sul de SP.",
  openGraph: {
    siteName: "Quero Ostra",
    type: "website",
    url: "https://queroostra.com.br/cardapio",
    title: "🦪 Cardápio Quero Ostra | Experiências Premium a partir de R$ 69,90",
    description: "Confira nosso menu completo de ostras selecionadas, frescas e gratinadas na Zona Sul de SP. Faça sua reserva programada!",
    images: [
      {
        url: "https://queroostra.com.br/images/hero-oysters.png",
        width: 1200,
        height: 630,
        alt: "Experiência de ostras frescas e gratinadas Quero Ostra",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "🦪 Cardápio Quero Ostra | Experiências Premium",
    description: "Ostras selecionadas frescas e gratinadas com entrega na Zona Sul de SP.",
    images: ["https://queroostra.com.br/images/hero-oysters.png"],
  },
};

export default function CardapioPage() {
  return <MenuPage />;
}
