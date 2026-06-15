import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";

export const metadata: Metadata = {
  title: "Cardápio | Quero Ostra",
  description:
    "Conheça as experiências com ostras, bebidas geladas e vinhos selecionados da Quero Ostra.",
};

export default function CardapioPage() {
  return <MenuPage />;
}
