"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { MobileNav } from "@/components/mobile-nav";
import { CART_STORAGE_KEY } from "@/components/catalog-data";

export function GlobalMobileNav() {
  const pathname = usePathname() || "";
  const router = useRouter();
  const [cartCount, setCartCount] = useState(0);

  // Hide on admin and api routes
  const isAdmin = pathname.startsWith("/admin");
  const isApi = pathname.startsWith("/api");
  if (isAdmin || isApi) return null;

  // Determine active tab
  let activeTab: "inicio" | "cardapio" | "carrinho" | "conta" = "inicio";
  if (pathname === "/") activeTab = "inicio";
  else if (pathname.startsWith("/cardapio")) activeTab = "cardapio";
  else if (pathname.startsWith("/checkout")) activeTab = "carrinho";
  else if (pathname.startsWith("/dashboard")) activeTab = "conta";
  else activeTab = "inicio"; // fallback

  // Calculate cart count from localStorage
  const updateCartCount = () => {
    try {
      const savedCart = window.localStorage.getItem(CART_STORAGE_KEY);
      if (savedCart) {
        const parsed = JSON.parse(savedCart) as Record<string, number>;
        const count = Object.values(parsed).reduce((sum, qty) => sum + (qty || 0), 0);
        setCartCount(count);
      } else {
        setCartCount(0);
      }
    } catch {
      setCartCount(0);
    }
  };

  useEffect(() => {
    updateCartCount();

    // Listen to custom event when cart changes locally
    window.addEventListener("cart-updated", updateCartCount);
    // Listen to storage event (updates from other tabs/pages)
    window.addEventListener("storage", updateCartCount);

    return () => {
      window.removeEventListener("cart-updated", updateCartCount);
      window.removeEventListener("storage", updateCartCount);
    };
  }, []);

  const handleCartClick = () => {
    // If on home or cardapio page, open the local drawer
    if (pathname === "/" || pathname === "/cardapio") {
      window.dispatchEvent(new Event("open-cart-drawer"));
    } else {
      // Otherwise redirect to cardapio and open cart drawer
      router.push("/cardapio?cart=open");
    }
  };

  return (
    <>
      {/* Apply mobile-only global padding bottom wrapper for non-admin pages */}
      <style jsx global>{`
        body {
          padding-bottom: 5rem;
        }
        @media (min-width: 1024px) {
          body {
            padding-bottom: 0;
          }
        }
      `}</style>
      <MobileNav activeTab={activeTab} cartCount={cartCount} onCartClick={handleCartClick} />
    </>
  );
}
