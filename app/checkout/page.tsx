import type { Metadata } from "next";
import { CheckoutPage } from "@/components/checkout-page";

export const metadata: Metadata = {
  title: "Checkout | Quero Ostra",
  description: "Finalize seu pedido e agende a entrega da sua experiência Quero Ostra.",
};

export default function CheckoutRoute() {
  return <CheckoutPage />;
}
