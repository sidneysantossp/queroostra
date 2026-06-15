import type { Metadata } from "next";
import { MenuPage } from "@/components/menu-page";

export const metadata: Metadata = {
  title: "Produtos | Quero Ostra",
  description: "Experiências com ostras, bebidas e harmonizações selecionadas.",
};

export default function ProductsPage() {
  return <MenuPage />;
}
