"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStore } from "@/store/useStore";

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function BagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M6.5 8.5h11l-1 10.5a2 2 0 0 1-2 1.5h-5a2 2 0 0 1-2-1.5L6.5 8.5Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M9 9V7.5a3 3 0 0 1 6 0V9"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path
        d="M12 12a3.75 3.75 0 1 0 0-7.5A3.75 3.75 0 0 0 12 12Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19.5a7 7 0 0 1 14 0"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M4 7h16" strokeLinecap="round" />
      <path d="M4 12h16" strokeLinecap="round" />
      <path d="M4 17h16" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export default function Header() {
  const favorites = useStore((state) => state.favorites);
  const cart = useStore((state) => state.cart);
  const search = useStore((state) => state.search);
  const setSearch = useStore((state) => state.setSearch);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );

  const hasFavorites = favorites.length > 0;

  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isMobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 border-b border-white/40 bg-white/55 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-4 md:gap-4 md:px-6 lg:px-8">
          <Link href="/" className="inline-block group">
            <h1 className="text-xl font-black tracking-tight text-[#2a1f44] md:text-2xl">
              <span className="text-[#7c4dff] transition group-hover:brightness-110">
                L
              </span>
              umo
            </h1>
          </Link>

          <div className="flex-1">
            <div className="flex items-center gap-3 rounded-2xl border border-[rgba(125,81,255,0.12)] bg-white/80 px-4 py-3 shadow-[0_10px_24px_rgba(143,92,255,0.08)]">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                className="h-5 w-5 shrink-0 text-[#8b7aa8]"
                aria-hidden="true"
              >
                <circle cx="11" cy="11" r="6.5" />
                <path d="M16 16l4 4" strokeLinecap="round" />
              </svg>

              <input
                type="text"
                placeholder="Найти игру"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-[#2a1f44] outline-none md:text-base"
              />
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            <Link
              href="/favorites"
              className={`flex items-center gap-2 rounded-2xl border border-white/60 px-4 py-2.5 text-sm font-medium shadow-sm transition ${
                hasFavorites
                  ? "bg-[#f3edff] text-[#7c4dff]"
                  : "bg-white/70 text-[#4b3a70]"
              }`}
            >
              <HeartIcon />
              <span>{favorites.length}</span>
            </Link>

            <Link
              href="/cart"
              className="flex items-center gap-2 rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-medium text-[#4b3a70] shadow-sm transition"
            >
              <BagIcon />
              <span>{cartCount}</span>
            </Link>

            <button
              type="button"
              className="flex items-center justify-center rounded-2xl border border-white/60 bg-white/70 px-4 py-2.5 text-sm font-medium text-[#4b3a70] shadow-sm transition"
            >
              <UserIcon />
            </button>
          </div>

          <button
            type="button"
            onClick={() => setIsMobileMenuOpen(true)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-[#4b3a70] shadow-sm transition md:hidden"
            aria-label="Открыть меню"
          >
            <MenuIcon />
          </button>
        </div>
      </header>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-[#2a1f44]/20 backdrop-blur-sm"
            onClick={() => setIsMobileMenuOpen(false)}
          />

          <aside className="absolute right-0 top-0 flex h-full w-[88%] max-w-sm flex-col border-l border-white/60 bg-[rgba(250,246,255,0.92)] p-4 shadow-[0_20px_60px_rgba(74,42,120,0.16)] backdrop-blur-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-[#2a1f44]">Меню</h2>
                <p className="mt-1 text-sm text-[#7d6d99]">
                  Быстрый доступ к важному
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(false)}
                className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/60 bg-white/80 text-[#4b3a70] shadow-sm"
                aria-label="Закрыть меню"
              >
                <CloseIcon />
              </button>
            </div>

            <div className="mb-5 rounded-3xl bg-[linear-gradient(135deg,rgba(143,92,255,0.12),rgba(255,255,255,0.75))] p-4">
              <Link
                href="/"
                className="mb-1 block text-sm font-semibold text-[#2a1f44]"
              >
                Lumo
              </Link>
              <p className="text-sm leading-6 text-[#6b5a8f]">
                Игры, которые идеально ложатся в твой баланс
              </p>
            </div>

            <div className="space-y-3">
              <Link
                href="/favorites"
                className="flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-left text-[#4b3a70] shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <span
                    className={
                      hasFavorites ? "text-[#7c4dff]" : "text-[#6c5c90]"
                    }
                  >
                    <HeartIcon />
                  </span>
                  <span className="text-sm font-medium">Избранное</span>
                </span>
                <span className="rounded-full bg-[#f3edff] px-2.5 py-1 text-xs font-semibold text-[#7c4dff]">
                  {favorites.length}
                </span>
              </Link>

              <Link
                href="/cart"
                className="flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-left text-[#4b3a70] shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="text-[#6c5c90]">
                    <BagIcon />
                  </span>
                  <span className="text-sm font-medium">Корзина</span>
                </span>
                <span className="rounded-full bg-[#f3edff] px-2.5 py-1 text-xs font-semibold text-[#7c4dff]">
                  {cartCount}
                </span>
              </Link>

              <button
                type="button"
                className="flex w-full items-center justify-between rounded-2xl border border-white/60 bg-white/80 px-4 py-3 text-left text-[#4b3a70] shadow-sm"
              >
                <span className="flex items-center gap-3">
                  <span className="text-[#6c5c90]">
                    <UserIcon />
                  </span>
                  <span className="text-sm font-medium">Профиль</span>
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
