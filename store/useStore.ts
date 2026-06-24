"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: number;
  region: StoreRegion;
  title: string;
  price: number | null;
  formattedPrice: string | null;
  image: string;
  quantity: number;
};

export type StoreRegion = "IN" | "TR";

type AddToCartPayload = {
  id: number;
  region?: StoreRegion;
  title: string;
  price: number | null;
  formattedPrice?: string | null;
  image: string;
};

type StoreState = {
  favorites: number[];
  cart: CartItem[];
  search: string;
  selectedBudget: number;

  toggleFavorite: (id: number) => void;
  addToCart: (game: AddToCartPayload) => void;
  decreaseCartItem: (id: number, region?: StoreRegion) => void;
  removeFromCart: (id: number, region?: StoreRegion) => void;
  clearCart: (region?: StoreRegion) => void;
  setSearch: (value: string) => void;
  setSelectedBudget: (budget: number) => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      cart: [],
      search: "",
      selectedBudget: 3000,

      toggleFavorite: (id) => {
        const { favorites } = get();
        const exists = favorites.includes(id);

        set({
          favorites: exists
            ? favorites.filter((favoriteId) => favoriteId !== id)
            : [...favorites, id],
        });
      },

      addToCart: (game) => {
        const { cart } = get();
        const region = game.region ?? "IN";
        const existing = cart.find(
          (item) => item.id === game.id && (item.region ?? "IN") === region,
        );

        if (existing) {
          set({
            cart: cart.map((item) =>
              item.id === game.id && (item.region ?? "IN") === region
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            ),
          });
          return;
        }

        set({
          cart: [
            ...cart,
            {
              id: game.id,
              region,
              title: game.title,
              price: game.price,
              formattedPrice: game.formattedPrice ?? null,
              image: game.image,
              quantity: 1,
            },
          ],
        });
      },

      decreaseCartItem: (id, region = "IN") => {
        const { cart } = get();
        const existing = cart.find(
          (item) => item.id === id && (item.region ?? "IN") === region,
        );

        if (!existing) return;

        if (existing.quantity === 1) {
          set({
            cart: cart.filter(
              (item) => item.id !== id || (item.region ?? "IN") !== region,
            ),
          });
          return;
        }

        set({
          cart: cart.map((item) =>
            item.id === id && (item.region ?? "IN") === region
              ? { ...item, quantity: item.quantity - 1 }
              : item,
          ),
        });
      },

      removeFromCart: (id, region = "IN") => {
        const { cart } = get();

        set({
          cart: cart.filter(
            (item) => item.id !== id || (item.region ?? "IN") !== region,
          ),
        });
      },

      clearCart: (region) =>
        set(({ cart }) => ({
          cart: region
            ? cart.filter((item) => (item.region ?? "IN") !== region)
            : [],
        })),

      setSearch: (value) => set({ search: value }),

      setSelectedBudget: (budget) => set({ selectedBudget: budget }),
    }),
    {
      name: "psn-helper-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        cart: state.cart,
        selectedBudget: state.selectedBudget,
      }),
    },
  ),
);
