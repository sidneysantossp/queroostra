"use client";

import { CART_STORAGE_KEY } from "@/components/catalog-data";

export async function syncLocalCart() {
  const raw = window.localStorage.getItem(CART_STORAGE_KEY);
  if (!raw) return;
  const quantities = JSON.parse(raw) as Record<string, number>;
  const items = Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([id, quantity]) => ({ id, quantity }));
  if (items.length === 0) return;

  await fetch("/api/cart/sync", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ items }),
  });
}
