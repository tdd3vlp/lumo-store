"use client";

import Image from "next/image";
import { useMemo } from "react";
import { games } from "@/data/mockGames";
import { useStore } from "@/store/useStore";

const GIFT_CARD_AMOUNTS = [
  1000, 2000, 3000, 4000, 5000, 7000, 8000, 9000, 12000,
];

function getSuggestedCard(total: number) {
  const card = GIFT_CARD_AMOUNTS.find((amount) => amount >= total);

  if (card) {
    return {
      card,
      remainder: card - total,
      exceeds: false,
    };
  }

  return {
    card: 12000,
    remainder: 0,
    exceeds: true,
  };
}

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function CartSidebar() {
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);

  const total = useMemo(() => {
    return Math.round(
      cart.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0),
    );
  }, [cart]);

  const totalUnits = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const cartIds = useMemo(() => new Set(cart.map((item) => item.id)), [cart]);

  const { card, remainder, exceeds } = useMemo(
    () => getSuggestedCard(total),
    [total],
  );

  const recommendations = useMemo(() => {
    if (exceeds || remainder < 1000) return [];

    return games
      .filter((game) => game.price <= remainder && !cartIds.has(game.id))
      .sort((a, b) => b.price - a.price)
      .slice(0, 4);
  }, [remainder, exceeds, cartIds]);

  return (
    <aside className="glass-card sticky top-24 rounded-[28px] p-5">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-sm font-medium text-[#8f5cff]">Твой выбор</p>
          <h3 className="text-xl font-bold text-[#2a1f44]">Почти готово</h3>
        </div>

        {cart.length > 0 && (
          <button
            type="button"
            onClick={() => clearCart()}
            className="rounded-xl border border-white/70 bg-white/80 px-3 py-2 text-sm font-medium text-[#6b5a8f] transition hover:bg-white"
          >
            Очистить
          </button>
        )}
      </div>

      {cart.length === 0 ? (
        <div className="rounded-2xl bg-white/70 p-5 text-sm leading-6 text-[#7d6d99]">
          Собери несколько игр — мы подберём для тебя удобный вариант покупки.
        </div>
      ) : (
        <>
          <div className="mb-5 space-y-3">
            {cart.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-white/75 p-3 shadow-sm"
              >
                <div className="mb-3 flex items-center gap-3">
                  <Image
                    src={item.image}
                    alt={item.title}
                    width={96}
                    height={64}
                    className="h-16 w-24 rounded-xl object-cover"
                  />

                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-semibold text-[#2a1f44]">
                      {item.title}
                    </p>
                    <p className="mt-1 text-sm text-[#8f5cff]">
                      {item.price != null ? formatINR(item.price) : "Цена недоступна"}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeFromCart(item.id)}
                    className="rounded-xl bg-[#f7f2ff] px-3 py-2 text-sm text-[#7d6d99] transition hover:bg-[#efe7ff]"
                  >
                    ✕
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => decreaseCartItem(item.id)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-lg font-semibold text-[#6c5c90] shadow-sm transition hover:bg-white"
                  >
                    −
                  </button>

                  <div className="flex-1 rounded-2xl bg-[#f7f2ff] px-4 py-2.5 text-center text-sm font-semibold text-[#6b5a8f]">
                    {item.quantity} шт.
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      addToCart({
                        id: item.id,
                        title: item.title,
                        price: item.price,
                        image: item.image,
                      })
                    }
                    className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[#d9ccff] bg-[#f7f2ff] text-lg font-semibold text-[#7c4dff] shadow-sm transition hover:bg-[#efe7ff]"
                  >
                    +
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-[24px] bg-[linear-gradient(180deg,rgba(143,92,255,0.10),rgba(255,255,255,0.80))] p-4">
            <div className="mb-3 flex items-center justify-between text-sm text-[#6a5a8d]">
              <span>Выбрано позиций</span>
              <span className="font-semibold text-[#2a1f44]">
                {cart.length}
              </span>
            </div>

            <div className="mb-3 flex items-center justify-between text-sm text-[#6a5a8d]">
              <span>Всего игр</span>
              <span className="font-semibold text-[#2a1f44]">{totalUnits}</span>
            </div>

            <div className="mb-3 flex items-center justify-between text-sm text-[#6a5a8d]">
              <span>Общая сумма</span>
              <span className="font-semibold text-[#2a1f44]">
                {formatINR(total)}
              </span>
            </div>

            {!exceeds && (
              <>
                <div className="mb-3 flex items-center justify-between text-sm text-[#6a5a8d]">
                  <span>Подходящий вариант</span>
                  <span className="font-semibold text-[#2a1f44]">
                    {formatINR(card)}
                  </span>
                </div>

                <div className="mb-4 flex items-center justify-between text-sm text-[#6a5a8d]">
                  <span>Останется после покупки</span>
                  <span className="font-semibold text-[#8f5cff]">
                    {formatINR(remainder)}
                  </span>
                </div>
              </>
            )}

            {exceeds && (
              <div className="mb-4 rounded-xl bg-[#fff1f2] p-3 text-sm text-[#b45309]">
                Сумма превышает максимальный номинал. Попробуй убрать одну игру.
              </div>
            )}

            <button
              type="button"
              className="w-full rounded-2xl bg-[linear-gradient(135deg,#8f5cff,#c084fc)] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_22px_rgba(143,92,255,0.22)] transition hover:translate-y-[-1px]"
            >
              Продолжить
            </button>
          </div>

          {!exceeds && recommendations.length > 0 && (
            <div className="mt-5 rounded-[24px] bg-white/70 p-4 shadow-sm">
              <div className="mb-1 text-sm font-medium text-[#8f5cff]">
                На остаток можно взять
              </div>
              <h4 className="mb-4 text-base font-bold text-[#2a1f44]">
                Ещё игры в пределах {formatINR(remainder)}
              </h4>

              <div className="space-y-3">
                {recommendations.map((game) => (
                  <div
                    key={game.id}
                    className="flex items-center gap-3 rounded-2xl bg-white/80 p-3"
                  >
                    <Image
                      src={game.image}
                      alt={game.title}
                      width={80}
                      height={56}
                      className="h-14 w-20 rounded-xl object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-semibold text-[#2a1f44]">
                        {game.title}
                      </p>
                      <p className="mt-1 text-sm text-[#8f5cff]">
                        {formatINR(game.price)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        addToCart({
                          id: game.id,
                          title: game.title,
                          price: game.price,
                          image: game.image,
                        })
                      }
                      className="rounded-xl bg-[#f3edff] px-3 py-2 text-sm font-semibold text-[#7c4dff] transition hover:bg-[#eadfff]"
                    >
                      +
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </aside>
  );
}
