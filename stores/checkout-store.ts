"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type {
  CheckoutCartItem,
  CreatedOrder,
  CustomerData,
  DeliveryAddress,
  PaymentMethod,
} from "@/lib/domain";

type CheckoutState = {
  cart: CheckoutCartItem[];
  selectedDates: string[];
  deliveryWindow: string;
  customer: Partial<CustomerData>;
  address: Partial<DeliveryAddress>;
  paymentMethod: PaymentMethod;
  notes: string;
  currentStep: number;
  lastOrder?: CreatedOrder;
  setCart: (cart: CheckoutCartItem[]) => void;
  setDates: (dates: string[]) => void;
  setDeliveryWindow: (window: string) => void;
  setCustomer: (customer: Partial<CustomerData>) => void;
  setAddress: (address: Partial<DeliveryAddress>) => void;
  setPaymentMethod: (method: PaymentMethod) => void;
  setNotes: (notes: string) => void;
  setCurrentStep: (step: number) => void;
  setLastOrder: (order: CreatedOrder) => void;
  resetCheckout: () => void;
};

export const useCheckoutStore = create<CheckoutState>()(
  persist(
    (set) => ({
      cart: [],
      selectedDates: [],
      deliveryWindow: "",
      customer: {},
      address: {},
      paymentMethod: "PIX",
      notes: "",
      currentStep: 1,
      setCart: (cart) => set({ cart }),
      setDates: (selectedDates) => set({ selectedDates }),
      setDeliveryWindow: (deliveryWindow) => set({ deliveryWindow }),
      setCustomer: (customer) => set({ customer }),
      setAddress: (address) => set({ address }),
      setPaymentMethod: (paymentMethod) => set({ paymentMethod }),
      setNotes: (notes) => set({ notes }),
      setCurrentStep: (currentStep) => set({ currentStep }),
      setLastOrder: (lastOrder) => set({ lastOrder }),
      resetCheckout: () =>
        set({
          selectedDates: [],
          deliveryWindow: "",
          notes: "",
          currentStep: 1,
        }),
    }),
    {
      name: "quero-ostra-checkout",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        cart: state.cart,
        selectedDates: state.selectedDates,
        deliveryWindow: state.deliveryWindow,
        customer: state.customer,
        address: state.address,
        paymentMethod: state.paymentMethod,
        notes: state.notes,
        currentStep: state.currentStep,
        lastOrder: state.lastOrder,
      }),
    },
  ),
);
