"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// Retained purely as the key type for region-scoped FX/pricing helpers
// (lib/pricing/context.tsx, lib/gift-cards/regions.ts). The storefront no
// longer exposes a global region switcher — region is per-product metadata now.
export type StoreRegion = "TR";

export type CartItem = {
  // A cart line is one gift-card denomination (already a distinct SKU), so the
  // denomination id is the whole key; quantity handles repeats.
  denominationId: string;
  productType: string;
  title: string;
  region: string;
  currency: string;
  amountMajor: number;
  // Sale price the customer pays, in ruble minor units (kopecks). Null when a
  // denomination has no configured retail price yet.
  priceMinor: number | null;
  image: string;
  quantity: number;
};

type AddToCartPayload = Omit<CartItem, "quantity">;

type StoreState = {
  favorites: string[]; // denominationId[]
  cart: CartItem[];
  search: string;
  // Desired account balance in ruble minor units (kopecks) — drives the budget
  // hero on the home page.
  selectedBudget: number;

  toggleFavorite: (denominationId: string) => void;
  addToCart: (item: AddToCartPayload) => void;
  decreaseCartItem: (denominationId: string) => void;
  removeFromCart: (denominationId: string) => void;
  clearCart: () => void;
  setSearch: (value: string) => void;
  setSelectedBudget: (budget: number) => void;
};

const DEFAULT_BUDGET_MINOR = 300000; // 3 000 ₽

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      cart: [],
      search: "",
      selectedBudget: DEFAULT_BUDGET_MINOR,

      toggleFavorite: (denominationId) => {
        const { favorites } = get();
        const exists = favorites.includes(denominationId);

        set({
          favorites: exists
            ? favorites.filter((id) => id !== denominationId)
            : [...favorites, denominationId],
        });
      },

      addToCart: (item) => {
        const { cart } = get();
        const existing = cart.find(
          (line) => line.denominationId === item.denominationId,
        );

        if (existing) {
          set({
            cart: cart.map((line) =>
              line.denominationId === item.denominationId
                ? { ...line, quantity: line.quantity + 1 }
                : line,
            ),
          });
          return;
        }

        set({ cart: [...cart, { ...item, quantity: 1 }] });
      },

      decreaseCartItem: (denominationId) => {
        const { cart } = get();
        const existing = cart.find(
          (line) => line.denominationId === denominationId,
        );

        if (!existing) return;

        if (existing.quantity === 1) {
          set({
            cart: cart.filter((line) => line.denominationId !== denominationId),
          });
          return;
        }

        set({
          cart: cart.map((line) =>
            line.denominationId === denominationId
              ? { ...line, quantity: line.quantity - 1 }
              : line,
          ),
        });
      },

      removeFromCart: (denominationId) =>
        set(({ cart }) => ({
          cart: cart.filter((line) => line.denominationId !== denominationId),
        })),

      clearCart: () => set({ cart: [] }),

      setSearch: (value) => set({ search: value }),

      setSelectedBudget: (budget) => set({ selectedBudget: budget }),
    }),
    {
      name: "lumo-store",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      // v1 (and earlier) stored game-id-keyed carts/favorites (numeric IDs)
      // that are meaningless against the denomination-id product model. Hard
      // reset on upgrade rather than leave corrupt shapes feeding the new
      // selectors — nothing was purchasable before, so there is nothing to lose.
      migrate: (persisted, version) => {
        if (version < 2) {
          return {
            favorites: [],
            cart: [],
            selectedBudget: DEFAULT_BUDGET_MINOR,
          } as Partial<StoreState>;
        }
        return persisted as Partial<StoreState>;
      },
      partialize: (state) => ({
        favorites: state.favorites,
        cart: state.cart,
        selectedBudget: state.selectedBudget,
      }),
    },
  ),
);
