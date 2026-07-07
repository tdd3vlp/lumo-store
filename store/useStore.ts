"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CartItem = {
  id: number;
  gameId: number;
  region: StoreRegion;
  title: string;
  edition?: string;
  price: number | null;
  originalPrice?: number | null;
  formattedPrice: string | null;
  image: string;
  quantity: number;
};

export type StoreRegion = "TR";

// A cart line is keyed by (game, edition). This id encodes both so different
// editions of the same game stay distinct lines, while every entry point that
// adds the *same* game+edition collapses onto one line. editionIndex 0 is the
// default/standard edition used by all quick-add surfaces (cards, favorites,
// "fits the remainder" suggestions); the game page passes the selected edition's
// index. Read `gameId` (not `id`) to answer "is this game already in the cart".
export function editionCartId(gameId: number, editionIndex = 0): number {
  return gameId * 100 + editionIndex + 1;
}

type AddToCartPayload = {
  id: number;
  gameId?: number;
  region?: StoreRegion;
  title: string;
  edition?: string;
  price: number | null;
  originalPrice?: number | null;
  formattedPrice?: string | null;
  image: string;
};

type StoreState = {
  favorites: number[];
  cart: CartItem[];
  search: string;
  selectedBudgets: Record<StoreRegion, number>;
  selectedRegion: StoreRegion;

  toggleFavorite: (id: number) => void;
  addToCart: (game: AddToCartPayload) => void;
  decreaseCartItem: (id: number, region?: StoreRegion) => void;
  removeFromCart: (id: number, region?: StoreRegion) => void;
  clearCart: (region?: StoreRegion) => void;
  setSearch: (value: string) => void;
  setSelectedBudget: (budget: number) => void;
  setSelectedRegion: (region: StoreRegion) => void;
};

export const useStore = create<StoreState>()(
  persist(
    (set, get) => ({
      favorites: [],
      cart: [],
      search: "",
      selectedBudgets: { TR: 1000 },
      selectedRegion: "TR",

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
        const region = game.region ?? "TR";
        const existing = cart.find(
          (item) => item.id === game.id && (item.region ?? "TR") === region,
        );

        if (existing) {
          set({
            cart: cart.map((item) =>
              item.id === game.id && (item.region ?? "TR") === region
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
              gameId: game.gameId ?? game.id,
              region,
              title: game.title,
              edition: game.edition,
              price: game.price,
              originalPrice: game.originalPrice ?? null,
              formattedPrice: game.formattedPrice ?? null,
              image: game.image,
              quantity: 1,
            },
          ],
        });
      },

      decreaseCartItem: (id, region = "TR") => {
        const { cart } = get();
        const existing = cart.find(
          (item) => item.id === id && (item.region ?? "TR") === region,
        );

        if (!existing) return;

        if (existing.quantity === 1) {
          set({
            cart: cart.filter(
              (item) => item.id !== id || (item.region ?? "TR") !== region,
            ),
          });
          return;
        }

        set({
          cart: cart.map((item) =>
            item.id === id && (item.region ?? "TR") === region
              ? { ...item, quantity: item.quantity - 1 }
              : item,
          ),
        });
      },

      removeFromCart: (id, region = "TR") => {
        const { cart } = get();

        set({
          cart: cart.filter(
            (item) => item.id !== id || (item.region ?? "TR") !== region,
          ),
        });
      },

      clearCart: (region) =>
        set(({ cart }) => ({
          cart: region
            ? cart.filter((item) => (item.region ?? "TR") !== region)
            : [],
        })),

      setSearch: (value) => set({ search: value }),

      setSelectedBudget: (budget) =>
        set(({ selectedBudgets, selectedRegion }) => ({
          selectedBudgets: { ...selectedBudgets, [selectedRegion]: budget },
        })),

      setSelectedRegion: (region) => set({ selectedRegion: region }),
    }),
    {
      name: "lumo-store",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        favorites: state.favorites,
        cart: state.cart,
        selectedBudgets: state.selectedBudgets,
        selectedRegion: state.selectedRegion,
      }),
    },
  ),
);
