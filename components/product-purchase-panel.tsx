"use client";

import { ArrowRight, Check, Minus, Plus, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { CART_STORAGE_KEY } from "@/components/catalog-data";

const money = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ProductPurchasePanel({
  productId,
  productName,
  price,
  stock,
}: {
  productId: string;
  productName: string;
  price: number;
  stock: number;
}) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const maximum = Math.max(1, Math.min(20, stock));

  function changeQuantity(value: number) {
    setQuantity(Math.min(maximum, Math.max(1, Math.round(value) || 1)));
    setAdded(false);
  }

  function addToCart() {
    let cart: Record<string, number> = {};
    try {
      cart = JSON.parse(window.localStorage.getItem(CART_STORAGE_KEY) ?? "{}");
    } catch {
      cart = {};
    }
    cart[productId] = Math.min(20, (cart[productId] ?? 0) + quantity);
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    window.dispatchEvent(new Event("cart-updated"));
    setAdded(true);
  }

  return (
    <div className="rounded-2xl border border-gold/25 bg-gold/[0.04] p-5 md:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-white/40">
            Valor da unidade
          </p>
          <p className="mt-2 font-display text-4xl text-champagne md:text-5xl">
            {money.format(price)}
          </p>
        </div>
        <div>
          <p className="mb-2 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-white/40">
            Quantidade
          </p>
          <div className="quantity-stepper">
            <button type="button" onClick={() => changeQuantity(quantity - 1)} aria-label={`Diminuir quantidade de ${productName}`}>
              <Minus size={16} />
            </button>
            <input
              type="number"
              min="1"
              max={maximum}
              value={quantity}
              onChange={(event) => changeQuantity(Number(event.target.value))}
              aria-label={`Quantidade de ${productName}`}
            />
            <button type="button" onClick={() => changeQuantity(quantity + 1)} aria-label={`Aumentar quantidade de ${productName}`}>
              <Plus size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-end justify-between border-t border-white/10 pt-5">
        <span className="text-sm text-white/45">Subtotal</span>
        <strong className="font-display text-3xl text-pearl">{money.format(price * quantity)}</strong>
      </div>

      <button type="button" onClick={addToCart} disabled={stock < 1} className="gold-button mt-5 w-full justify-center disabled:opacity-40">
        <ShoppingBag size={17} />
        {stock < 1 ? "Produto indisponível" : "Adicionar ao carrinho"}
      </button>

      {added && (
        <div className="mt-4 rounded-xl border border-emerald-400/20 bg-emerald-400/[0.06] p-4">
          <p className="flex items-center gap-2 text-sm text-emerald-200">
            <Check size={16} /> Produto adicionado ao carrinho.
          </p>
          <div className="mt-3 flex flex-wrap gap-3">
            <Link href="/cardapio?cart=open" className="text-xs font-semibold uppercase tracking-[0.12em] text-champagne">
              Ver carrinho
            </Link>
            <Link href="/checkout" className="inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em] text-champagne">
              Ir ao checkout <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      )}

      <p className="mt-4 text-center text-[0.68rem] leading-5 text-white/35">
        Pagamento seguro, 5% de desconto no PIX e frete grátis a partir de 24 ostras.
      </p>
    </div>
  );
}
