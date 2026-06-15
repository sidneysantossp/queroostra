import { getAddon, getProduct } from "@/lib/catalog";
import type { CheckoutCartItem, OrderTotals, PricedOrderItem } from "@/lib/domain";
import type { SupabaseClient } from "@supabase/supabase-js";

const roundMoney = (value: number) => Math.round(value * 100) / 100;

export function priceCart(
  cart: CheckoutCartItem[],
  dateCount: number,
  deliveryFeePerDate = 18,
  discount = 0,
): { items: PricedOrderItem[]; totals: OrderTotals } {
  const multiplier = Math.max(1, dateCount);

  const items = cart.map((cartItem) => {
    const product = getProduct(cartItem.id);
    if (!product) {
      throw new Error(`Produto indisponível: ${cartItem.id}`);
    }
    if (cartItem.quantity < 1 || cartItem.quantity > product.stock) {
      throw new Error(`Quantidade indisponível para ${product.name}`);
    }

    const itemAddons = (cartItem.addonIds ?? []).map((addonId) => {
      const addon = getAddon(addonId);
      if (!addon) throw new Error(`Adicional indisponível: ${addonId}`);
      if (addon.productIds.length > 0 && !addon.productIds.includes(product.id)) {
        throw new Error(`${addon.name} não está disponível para ${product.name}`);
      }
      return { id: addon.id, name: addon.name, unitPrice: addon.price };
    });

    const unitPrice = product.promotionalPrice ?? product.price;
    const addonsTotal = itemAddons.reduce((total, addon) => total + addon.unitPrice, 0);
    const subtotal = roundMoney((unitPrice + addonsTotal) * cartItem.quantity);

    return {
      id: product.id,
      name: product.name,
      description: product.shortDescription,
      image: product.image,
      quantity: cartItem.quantity,
      unitPrice,
      addons: itemAddons,
      subtotal,
    };
  });

  const singleDateSubtotal = items.reduce((total, item) => total + item.subtotal, 0);
  const itemsSubtotal = roundMoney(singleDateSubtotal * multiplier);
  const deliveryFees = roundMoney(deliveryFeePerDate * multiplier);
  const total = roundMoney(Math.max(0, itemsSubtotal + deliveryFees - discount));

  return {
    items,
    totals: {
      itemsSubtotal,
      deliveryFeePerDate,
      deliveryFees,
      discount,
      dateMultiplier: multiplier,
      total,
    },
  };
}

export async function priceCartFromDatabase(
  supabase: SupabaseClient,
  cart: CheckoutCartItem[],
  dateCount: number,
  deliveryFeePerDate: number,
  discount = 0,
): Promise<{ items: PricedOrderItem[]; totals: OrderTotals }> {
  const productKeys = cart.map((item) => item.id);
  const addonKeys = [...new Set(cart.flatMap((item) => item.addonIds ?? []))];
  const [
    { data: productRows, error: productError },
    { data: addonRows, error: addonError },
    { data: linkRows, error: linkError },
  ] =
    await Promise.all([
      supabase
        .from("products")
        .select("id, external_key, title, short_description, price, promotional_price, stock, active, product_images(storage_path, is_primary)")
        .in("external_key", productKeys),
      addonKeys.length > 0
        ? supabase
            .from("product_addons")
            .select("id, external_key, name, price, stock, active, global")
            .in("external_key", addonKeys)
        : Promise.resolve({ data: [], error: null }),
      addonKeys.length > 0
        ? supabase
            .from("product_addon_links")
            .select("product_id, addon_id")
        : Promise.resolve({ data: [], error: null }),
    ]);
  if (productError || addonError || linkError) {
    throw new Error("Não foi possível validar o catálogo.");
  }

  const productMap = new Map((productRows ?? []).map((row) => [row.external_key, row]));
  const addonMap = new Map((addonRows ?? []).map((row) => [row.external_key, row]));
  const items = cart.map((cartItem) => {
    const product = productMap.get(cartItem.id);
    if (!product?.active) throw new Error(`Produto indisponível: ${cartItem.id}`);
    if (cartItem.quantity < 1 || cartItem.quantity > product.stock) {
      throw new Error(`Quantidade indisponível para ${product.title}`);
    }
    const itemAddons = (cartItem.addonIds ?? []).map((addonId) => {
      const addon = addonMap.get(addonId);
      if (!addon?.active || addon.stock < cartItem.quantity) {
        throw new Error(`Adicional indisponível: ${addonId}`);
      }
      const linked = (linkRows ?? []).some(
        (link) =>
          link.product_id === product.id && link.addon_id === addon.id,
      );
      if (!addon.global && !linked) {
        throw new Error(`${addon.name} não está disponível para ${product.title}`);
      }
      return { id: addonId, name: addon.name, unitPrice: Number(addon.price) };
    });
    const unitPrice = Number(product.promotional_price ?? product.price);
    const addonTotal = itemAddons.reduce((total, addon) => total + addon.unitPrice, 0);
    const images = Array.isArray(product.product_images)
      ? product.product_images as { storage_path: string; is_primary: boolean }[]
      : [];
    return {
      id: cartItem.id,
      name: product.title,
      description: product.short_description ?? "",
      image: images.find((image) => image.is_primary)?.storage_path,
      quantity: cartItem.quantity,
      unitPrice,
      addons: itemAddons,
      subtotal: roundMoney((unitPrice + addonTotal) * cartItem.quantity),
    };
  });

  const multiplier = Math.max(1, dateCount);
  const singleDateSubtotal = items.reduce((total, item) => total + item.subtotal, 0);
  const itemsSubtotal = roundMoney(singleDateSubtotal * multiplier);
  const deliveryFees = roundMoney(deliveryFeePerDate * multiplier);
  return {
    items,
    totals: {
      itemsSubtotal,
      deliveryFeePerDate,
      deliveryFees,
      discount,
      dateMultiplier: multiplier,
      total: roundMoney(Math.max(0, itemsSubtotal + deliveryFees - discount)),
    },
  };
}
