import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";

export const metadata: Metadata = {
  title: "Cardápio Quero Ostra | Ostras Frescas e Gratinadas em SP",
  description:
    "Confira nosso cardápio! Ostras premium frescas, baby e gratinadas a partir de R$ 69,90. Reserve até as 18h para entrega programada na Zona Sul de SP.",
};

export default function CardapioPage() {
  return <MenuPage />;
}
