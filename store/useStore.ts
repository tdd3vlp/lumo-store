"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: number;
  title: string;
  price: number;
  image: string;
  quantity: number;
};

type AddToCartPayload = {
  id: number;
  title: string;
  price: number;
  image: string;
};

type StoreState = {
  favorites: number[];
  cart: CartItem[];
  search: string;

  toggleFavorite: (id: number) => void;
  addToCart: (game: AddToCartPayload) => void;
  decreaseCartItem: (id: number) => void;
  removeFromCart: (id: number) => void;
  clearCart: () => void;
  setSearch: (value: string) => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      cart: [],
      search: "",

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
        const existing = cart.find((item) => item.id === game.id);

        if (existing) {
          set({
            cart: cart.map((item) =>
              item.id === game.id
                ? { ...item, quantity: item.quantity + 1 }
                : item,
            ),
          });
          return;
        }

        set({
          cart: [...cart, { ...game, quantity: 1 }],
        });
      },

      decreaseCartItem: (id) => {
        const { cart } = get();
        const existing = cart.find((item) => item.id === id);

        if (!existing) return;

        if (existing.quantity === 1) {
          set({
            cart: cart.filter((item) => item.id !== id),
          });
          return;
        }

        set({
          cart: cart.map((item) =>
            item.id === id ? { ...item, quantity: item.quantity - 1 } : item,
          ),
        });
      },

      removeFromCart: (id) => {
        const { cart } = get();

        set({
          cart: cart.filter((item) => item.id !== id),
        });
      },

      clearCart: () => set({ cart: [] }),

      setSearch: (value) => set({ search: value }),
    }),
    {
      name: "psn-helper-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        cart: state.cart,
      }),
    },
  ),
);
