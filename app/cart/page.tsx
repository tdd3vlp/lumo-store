"use client";

import Link from "next/link";
import Header from "@/components/Header";
import { useStore } from "@/store/useStore";

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function CartPage() {
  const cart = useStore((state) => state.cart);
  const addToCart = useStore((state) => state.addToCart);
  const decreaseCartItem = useStore((state) => state.decreaseCartItem);
  const removeFromCart = useStore((state) => state.removeFromCart);
  const clearCart = useStore((state) => state.clearCart);

  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <>
      <Header />

      <main className="mx-auto max-w-7xl px-4 py-6 md:px-6 lg:px-8">
        <nav
          aria-label="Breadcrumb"
          className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[#7d6d99]"
        >
          <Link href="/" className="transition hover:text-[#7c4dff]">
            Главная страница
          </Link>
          <span className="text-[#b6a8d1]">/</span>
          <span className="font-medium text-[#4b3a70]">Корзина</span>
        </nav>

        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-[#2a1f44] md:text-4xl">
              Корзина
            </h1>
            <p className="mt-2 text-[#7d6d99]">
              Проверь выбранные игры и количество.
            </p>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="rounded-2xl border border-white/60 bg-white/80 px-4 py-2.5 text-sm font-medium text-[#4b3a70] shadow-sm"
            >
              Очистить
            </button>
          )}
        </div>

        {cart.length === 0 ? (
          <div className="rounded-[28px] border border-white/60 bg-white/80 p-8 text-[#6b5a8f] shadow-[0_14px_30px_rgba(120,92,170,0.12)]">
            Корзина пока пуста.
          </div>
        ) : (
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-4">
              {cart.map((item) => (
                <div
                  key={item.id}
                  className="rounded-[28px] border border-white/60 bg-white/80 p-4 shadow-[0_14px_30px_rgba(120,92,170,0.12)]"
                >
                  <div className="flex gap-4">
                    <img
                      src={item.image}
                      alt={item.title}
                      className="h-[140px] w-[100px] rounded-2xl object-cover"
                    />

                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-[#2a1f44]">
                        {item.title}
                      </h3>

                      <div className="mt-2 text-base font-bold text-[#7c4dff]">
                        {formatINR(item.price)}
                      </div>

                      <div className="mt-4 flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => decreaseCartItem(item.id)}
                          className="flex h-[44px] w-[44px] items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-xl font-semibold text-[#6c5c90] shadow-sm"
                        >
                          −
                        </button>

                        <div className="flex h-[44px] min-w-[72px] items-center justify-center rounded-2xl bg-[#f3edff] px-4 text-sm font-semibold text-[#7c4dff]">
                          {item.quantity}
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
                          className="flex h-[44px] w-[44px] items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-xl font-semibold text-[#6c5c90] shadow-sm"
                        >
                          +
                        </button>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.id)}
                          className="ml-auto rounded-2xl border border-white/60 bg-white/80 px-4 py-2 text-sm font-medium text-[#4b3a70] shadow-sm"
                        >
                          Удалить
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <aside className="h-fit rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_14px_30px_rgba(120,92,170,0.12)]">
              <h2 className="mb-4 text-xl font-bold text-[#2a1f44]">Итого</h2>

              <div className="mb-3 flex items-center justify-between text-sm text-[#6a5a8d]">
                <span>Позиций</span>
                <span>{cart.length}</span>
              </div>

              <div className="mb-5 flex items-center justify-between text-sm text-[#6a5a8d]">
                <span>Сумма</span>
                <span className="font-semibold text-[#2a1f44]">
                  {formatINR(total)}
                </span>
              </div>

              <button
                type="button"
                className="w-full rounded-2xl bg-[linear-gradient(135deg,#8f5cff,#c084fc)] px-5 py-4 text-base font-semibold text-white shadow-[0_12px_22px_rgba(143,92,255,0.22)]"
              >
                Продолжить
              </button>
            </aside>
          </div>
        )}
      </main>
    </>
  );
}
