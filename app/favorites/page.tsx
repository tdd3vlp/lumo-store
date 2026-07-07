"use client";

import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";
import { games } from "@/data/mockGames";
import { useRegionRate } from "@/lib/pricing/context";
import { formatPriceAsRubles } from "@/lib/pricing/rates";
import { editionCartId, useStore } from "@/store/useStore";

export default function FavoritesPage() {
  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const addToCart = useStore((state) => state.addToCart);
  const cart = useStore((state) => state.cart);
  const tryRate = useRegionRate("TR");

  const favoriteGames = games.filter((game) => favorites.includes(game.id));

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-sm text-[#7d6d99]">
          <Link href="/" className="hover:text-[#7c4dff]">
            Главная страница
          </Link>
          <span>/</span>
          <span className="text-[#4b3a70]">Избранное</span>
        </nav>

        {/* Title */}
        <h1 className="mb-6 text-2xl font-black text-[#2a1f44] md:text-4xl">
          Избранное
        </h1>

        {/* Empty */}
        {favoriteGames.length === 0 ? (
          <div className="rounded-3xl border border-white/60 bg-white/80 p-8 text-[#6b5a8f] shadow">
            У тебя пока нет избранных игр
          </div>
        ) : (
          <div className="space-y-4">
            {favoriteGames.map((game) => {
              const isInCart = cart.some(
                (item) => (item.gameId ?? item.id) === game.id,
              );

              return (
                <div
                  key={game.id}
                  className="flex gap-4 rounded-3xl border border-white/60 bg-white/80 p-4 shadow"
                >
                  {/* Cover */}
                  <Image
                    src={game.image}
                    alt={game.title}
                    width={100}
                    height={140}
                    className="h-[140px] w-[100px] rounded-2xl object-cover"
                  />

                  {/* Content */}
                  <div className="flex flex-1 flex-col justify-between">
                    <div>
                      <h3 className="text-lg font-bold text-[#2a1f44]">
                        {game.title}
                      </h3>

                      <div className="mt-2 text-base font-bold text-[#7c4dff]">
                        {game.price != null ? formatPriceAsRubles(game.price, tryRate) : "Цена при выходе"}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="mt-4 flex flex-wrap gap-3">
                      {/* Remove from favorites */}
                      <button
                        onClick={() => toggleFavorite(game.id)}
                        className="group flex h-[52px] w-[52px] items-center justify-center rounded-2xl border border-white/60 shadow-sm transition-all duration-200 bg-[#f3edff] text-[#7c4dff]"
                        aria-label="Удалить из избранного"
                      >
                        <svg
                          viewBox="0 0 24 24"
                          fill="currentColor"
                          className="h-5 w-5"
                        >
                          <path d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z" />
                        </svg>
                      </button>

                      {/* Add / Go to cart */}
                      {isInCart ? (
                        <Link
                          href="/cart"
                          className="flex items-center justify-center rounded-2xl bg-[#f3edff] px-4 py-2 text-sm font-semibold text-[#7c4dff]"
                        >
                          Перейти в корзину
                        </Link>
                      ) : (
                        <button
                          onClick={() =>
                            addToCart({
                              id: editionCartId(game.id),
                              gameId: game.id,
                              title: game.title,
                              price: game.price,
                              image: game.image,
                            })
                          }
                          className="rounded-2xl bg-[linear-gradient(135deg,#8f5cff,#c084fc)] px-4 py-2 text-sm font-semibold text-white shadow"
                        >
                          Добавить в корзину
                        </button>
                      )}

                      {/* Open game */}
                      <Link
                        href={`/game/${game.id}`}
                        className="ml-auto text-sm text-[#7c4dff]"
                      >
                        Открыть →
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </>
  );
}
