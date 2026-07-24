"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ComponentType, useMemo, useState } from "react";
import EU from "country-flag-icons/react/3x2/EU";
import TR from "country-flag-icons/react/3x2/TR";
import US from "country-flag-icons/react/3x2/US";
import ZA from "country-flag-icons/react/3x2/ZA";
import { FaXbox } from "react-icons/fa6";
import { formatRubles } from "@/lib/pricing/rates";
import type { XboxProduct } from "@/lib/products/xbox-catalog-quote";
import { XBOX_REGIONS, xboxAmountLabel } from "@/lib/products/xbox-catalog";
import { useStore } from "@/store/useStore";

const REGION_ORDER = ["US", "TR", "EU", "ZA"];
const REGION_META = new Map(XBOX_REGIONS.map((r) => [r.region, r]));
const FLAG: Record<string, ComponentType<{ className?: string }>> = {
  US,
  TR,
  EU,
  ZA,
};

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M13 2 4.5 13.5H11l-1 8.5 8.5-11.5H12l1-8.5Z" />
    </svg>
  );
}
function CheckBadgeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm4.7 7.7-5.4 5.4a1 1 0 0 1-1.4 0l-2.6-2.6a1 1 0 1 1 1.4-1.4l1.9 1.9 4.7-4.7a1 1 0 1 1 1.4 1.4Z" />
    </svg>
  );
}
function InfoIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" strokeLinecap="round" />
      <circle cx="12" cy="7.75" r="1" fill="currentColor" stroke="none" />
    </svg>
  );
}
function CartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-4 w-4"
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

function RegionFlag({
  region,
  className,
}: {
  region: string;
  className?: string;
}) {
  const Flag = FLAG[region];
  return Flag ? <Flag className={className} /> : null;
}

export default function XboxCatalog({ products }: { products: XboxProduct[] }) {
  const router = useRouter();
  const addToCart = useStore((state) => state.addToCart);

  const regions = useMemo(() => {
    const present = new Set(products.map((p) => p.region));
    return [
      ...REGION_ORDER.filter((r) => present.has(r)),
      ...[...present].filter((r) => !REGION_ORDER.includes(r)),
    ];
  }, [products]);

  const [region, setRegion] = useState(() => regions[0] ?? "US");
  const active = regions.includes(region) ? region : (regions[0] ?? "US");

  const amounts = useMemo(
    () =>
      products
        .filter((p) => p.region === active)
        .sort((a, b) => a.amountMajor - b.amountMajor),
    [products, active],
  );

  const [amountId, setAmountId] = useState<string | null>(null);
  const selected =
    amounts.find((p) => p.denominationId === amountId) ?? amounts[0] ?? null;

  function pickRegion(r: string) {
    setRegion(r);
    setAmountId(null);
  }

  function cartTitle(p: XboxProduct) {
    const meta = REGION_META.get(p.region);
    return `Xbox Gift Card ${xboxAmountLabel(p.amountMajor, p.currency)} (${meta?.label ?? p.region})`;
  }

  function buy(p: XboxProduct, goToCart: boolean) {
    addToCart({
      denominationId: p.denominationId,
      productType: "xbox",
      title: cartTitle(p),
      region: p.region,
      currency: p.currency,
      amountMajor: p.amountMajor,
      priceMinor: p.priceMinor,
      image: "/banners/xbox.png",
    });
    if (goToCart) router.push("/cart");
  }

  const selectedMeta = selected ? REGION_META.get(selected.region) : null;

  return (
    <div>
      {/* Header + generic Xbox card (placeholder, no denomination/country) */}
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <FaXbox className="h-4 w-4" style={{ color: "#107c10" }} />
            Xbox
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-5xl">
            Xbox
            <br />
            Gift Cards
          </h2>
          <p className="mt-4 max-w-sm text-base leading-7 text-[var(--text-muted)]">
            Пополните баланс Xbox для игр, дополнений и подписок. Выберите
            регион и сумму.
          </p>
        </div>

        <div className="relative hidden items-center justify-center lg:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#107c10] opacity-15 blur-[90px]"
          />
          <div
            className="relative h-[300px] w-[225px]"
            style={{
              transform: "rotate(-4deg)",
              filter: "drop-shadow(0 20px 40px rgba(21,19,27,0.28))",
            }}
          >
            <Image
              src="/banners/xbox.png"
              alt="Xbox Gift Card"
              fill
              sizes="225px"
              className="object-contain"
              priority
            />
          </div>
        </div>
      </div>

      {/* 1. Region */}
      <div className="mt-4 md:mt-6">
        <p className="text-sm font-bold text-[var(--ink)]">
          1. Выберите регион
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {regions.map((r) => {
            const meta = REGION_META.get(r);
            const isActive = r === active;
            return (
              <button
                key={r}
                type="button"
                onClick={() => pickRegion(r)}
                aria-pressed={isActive}
                className={`inline-flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--ink)]/40"
                }`}
              >
                <RegionFlag region={r} className="w-5 shrink-0 rounded-[3px]" />
                {meta?.label ?? r}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Amount */}
      <div className="mt-6">
        <p className="text-sm font-bold text-[var(--ink)]">2. Выберите сумму</p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {amounts.map((p) => {
            const isActive = selected?.denominationId === p.denominationId;
            return (
              <button
                key={p.denominationId}
                type="button"
                onClick={() => setAmountId(p.denominationId)}
                aria-pressed={isActive}
                className={`inline-flex min-w-[84px] items-center justify-center rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition ${
                  isActive
                    ? "border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--ink)]/40"
                }`}
              >
                {xboxAmountLabel(p.amountMajor, p.currency)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected product summary */}
      {selected && (
        <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative aspect-[3/4] w-[150px] shrink-0 self-center md:w-[168px] md:self-start">
              <Image
                src="/banners/xbox.png"
                alt=""
                fill
                sizes="168px"
                className="object-contain"
                style={{
                  filter: "drop-shadow(0 12px 22px rgba(21,19,27,0.2))",
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-unbounded)] text-lg font-bold leading-snug text-[var(--ink)]">
                Xbox Gift Card
                <br />
                {xboxAmountLabel(
                  selected.amountMajor,
                  selected.currency,
                )} · {selected.currency} (
                {selectedMeta?.label ?? selected.region})
              </p>
              <div className="mt-3 flex flex-col items-start gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                  <RegionFlag
                    region={selected.region}
                    className="w-4 shrink-0 rounded-[2px]"
                  />
                  {selectedMeta?.label ?? selected.region}
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                  <BoltIcon className="h-3.5 w-3.5 text-[#eab308]" />
                  Цифровой код
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                  <CheckBadgeIcon className="h-3.5 w-3.5 text-[#1e8a4c]" />
                  Мгновенная доставка
                </span>
              </div>
            </div>

            <div className="flex shrink-0 flex-col gap-3 md:w-[220px]">
              <p className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-right">
                {formatRubles(selected.priceMinor)}
              </p>
              <button
                type="button"
                onClick={() => buy(selected, true)}
                className="inline-flex items-center justify-center rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]"
              >
                Купить
              </button>
              <button
                type="button"
                onClick={() => buy(selected, false)}
                className="inline-flex items-center justify-center gap-2 rounded-full border border-[var(--line-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                В корзину
                <CartIcon />
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-t border-[var(--line)] pt-4 text-xs leading-5">
            <span className="inline-flex items-center gap-1.5 text-[var(--text-muted)]">
              <InfoIcon className="h-4 w-4 shrink-0" />
              Работает только с аккаунтами{" "}
              {selectedMeta?.gen ?? selected.region}.
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
