"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { REGION_CONFIG } from "@/lib/gift-cards/regions";
import { useStore, type StoreRegion } from "@/store/useStore";

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className={`h-4 w-4 ${className ?? ""}`}
      aria-hidden="true"
    >
      <circle cx="11" cy="11" r="6.5" />
      <path d="M16 16l4 4" strokeLinecap="round" />
    </svg>
  );
}

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

function CartIcon() {
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
        d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M4.5 21a7.5 7.5 0 0 1 15 0"
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

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState<StoreRegion>("TR");

  const cartCount = useMemo(
    () => cart.reduce((sum, item) => sum + item.quantity, 0),
    [cart],
  );
  const favCount = favorites.length;

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileMenuOpen]);

  return (
    <>
      <header className="sticky top-0 z-50 bg-[var(--ink)] border-b border-[var(--line-inverse)]">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 md:gap-4 md:px-6 lg:px-8">
          {/* Wordmark */}
          <Link href="/" className="flex items-center gap-1.5 shrink-0 group">
            <span className="font-[family-name:var(--font-unbounded)] text-xl font-black text-white tracking-tight leading-none">
              LUMO
            </span>
            <span
              className="h-1.5 w-1.5 rounded-full bg-[var(--signal)] transition group-hover:scale-125"
              aria-hidden="true"
            />
          </Link>

          {/* Search – desktop */}
          <div className="hidden md:flex flex-1 items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--ink-soft)] border border-[var(--line-inverse)] focus-within:border-white/30 transition">
            <SearchIcon className="text-[var(--text-muted)] shrink-0" />
            <input
              type="search"
              placeholder="Найти игру или дополнение"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
            />
          </div>

          {/* Region – desktop */}
          <div
            className="hidden md:flex items-center gap-1 rounded-xl border border-[var(--line-inverse)] bg-[var(--ink-soft)] p-1"
            role="group"
            aria-label="Выбор региона"
          >
            {(["TR", "IN"] as const).map((region) => {
              const active = selectedRegion === region;

              return (
                <button
                  key={region}
                  type="button"
                  onClick={() => setSelectedRegion(region)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-[var(--signal)] ${
                    active
                      ? "bg-[var(--signal)] text-[var(--ink)]"
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  }`}
                  aria-pressed={active}
                >
                  {REGION_CONFIG[region].name}
                </button>
              );
            })}
          </div>

          {/* Profile – desktop */}
          <Link
            href="/profile"
            className="hidden md:flex items-center justify-center h-10 w-10 rounded-xl border border-[var(--line-inverse)] text-white/80 transition hover:text-white hover:border-white/40 focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
            aria-label="Профиль"
          >
            <UserIcon />
          </Link>

          {/* Favorites – desktop */}
          <Link
            href="/favorites"
            className="hidden md:flex relative items-center justify-center h-10 w-10 rounded-xl border border-[var(--line-inverse)] text-white/80 transition hover:text-white hover:border-white/40 focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
            aria-label={`Избранное${favCount > 0 ? `, ${favCount} игр` : ""}`}
          >
            <HeartIcon />
            {favCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-[var(--signal)] text-[var(--ink)] text-[9px] font-black flex items-center justify-center leading-none">
                {favCount}
              </span>
            )}
          </Link>

          {/* Cart – desktop */}
          <Link
            href="/cart"
            className="hidden md:flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--line-inverse)] text-white/80 text-sm font-medium transition hover:text-white hover:border-white/40 focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
            aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
          >
            <CartIcon />
            <span>Корзина</span>
            {cartCount > 0 && (
              <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--ink)] text-xs font-black leading-none">
                {cartCount}
              </span>
            )}
          </Link>

          {/* Mobile icons */}
          <div className="flex items-center gap-2 md:hidden ml-auto">
            <button
              type="button"
              onClick={() => setMobileSearchOpen((v) => !v)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-inverse)] text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
              aria-label="Поиск"
              aria-expanded={mobileSearchOpen}
            >
              <SearchIcon />
            </button>

            <button
              type="button"
              onClick={() =>
                setSelectedRegion((region) => (region === "TR" ? "IN" : "TR"))
              }
              className="flex h-10 min-w-14 items-center justify-center rounded-xl border border-[var(--line-inverse)] px-2 text-xs font-black text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
              aria-label={`Выбор региона: ${REGION_CONFIG[selectedRegion].name}`}
            >
              {selectedRegion}
            </button>

            <Link
              href="/profile"
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-inverse)] text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
              aria-label="Профиль"
            >
              <UserIcon />
            </Link>

            <Link
              href="/cart"
              className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-inverse)] text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
              aria-label={`Корзина${cartCount > 0 ? `, ${cartCount} товаров` : ""}`}
            >
              <CartIcon />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 h-4 min-w-4 px-0.5 rounded-full bg-[var(--signal)] text-[var(--ink)] text-[9px] font-black flex items-center justify-center leading-none">
                  {cartCount}
                </span>
              )}
            </Link>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl border border-[var(--line-inverse)] text-white/80 transition hover:text-white focus-visible:outline-2 focus-visible:outline-[var(--signal)]"
              aria-label="Открыть меню"
              aria-expanded={mobileMenuOpen}
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        {/* Mobile search bar */}
        {mobileSearchOpen && (
          <div className="md:hidden px-4 pb-3 border-t border-[var(--line-inverse)]">
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--ink-soft)] border border-[var(--line-inverse)] mt-2">
              <SearchIcon className="text-[var(--text-muted)] shrink-0" />
              <input
                type="search"
                placeholder="Поиск игр и карт"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-[var(--text-muted)]"
                autoFocus
              />
            </div>
          </div>
        )}
      </header>

      {/* Mobile menu drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <button
            type="button"
            aria-label="Закрыть меню"
            className="absolute inset-0 bg-[var(--ink)]/60"
            onClick={() => setMobileMenuOpen(false)}
          />
          <aside className="absolute right-0 top-0 flex h-full w-[85%] max-w-xs flex-col bg-[var(--ink-soft)] border-l border-[var(--line-inverse)]">
            <div className="flex items-center justify-between px-4 py-4 border-b border-[var(--line-inverse)]">
              <span className="font-[family-name:var(--font-unbounded)] text-lg font-black text-white tracking-tight">
                LUMO
                <span
                  className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--signal)] ml-1.5 mb-0.5"
                  aria-hidden="true"
                />
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--line-inverse)] text-white/80"
                aria-label="Закрыть меню"
              >
                <CloseIcon />
              </button>
            </div>

            <nav className="flex flex-col gap-1 p-4" aria-label="Навигация">
              <div className="mb-2 rounded-xl border border-[var(--line-inverse)] p-1">
                <p className="px-3 pb-2 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-white/45">
                  Выбор региона
                </p>
                <div className="grid grid-cols-2 gap-1">
                  {(["TR", "IN"] as const).map((region) => {
                    const active = selectedRegion === region;

                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => setSelectedRegion(region)}
                        className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                          active
                            ? "bg-[var(--signal)] text-[var(--ink)]"
                            : "text-white/75 hover:bg-white/5 hover:text-white"
                        }`}
                        aria-pressed={active}
                      >
                        {REGION_CONFIG[region].name}
                      </button>
                    );
                  })}
                </div>
              </div>
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                <span className="text-sm font-medium">Главная</span>
              </Link>
              <Link
                href="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                <span className="text-sm font-medium">Профиль</span>
              </Link>
              <Link
                href="/favorites"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                <span className="text-sm font-medium">Избранное</span>
                {favCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--ink)] text-xs font-black leading-none">
                    {favCount}
                  </span>
                )}
              </Link>
              <Link
                href="/cart"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center justify-between rounded-xl px-4 py-3 text-white/80 hover:text-white hover:bg-white/5 transition"
              >
                <span className="text-sm font-medium">Корзина</span>
                {cartCount > 0 && (
                  <span className="flex h-5 min-w-5 px-1 items-center justify-center rounded-full bg-[var(--signal)] text-[var(--ink)] text-xs font-black leading-none">
                    {cartCount}
                  </span>
                )}
              </Link>
            </nav>
          </aside>
        </div>
      )}
    </>
  );
}
