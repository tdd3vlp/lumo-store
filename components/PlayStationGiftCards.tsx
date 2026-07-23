"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import GB from "country-flag-icons/react/3x2/GB";
import IN from "country-flag-icons/react/3x2/IN";
import PL from "country-flag-icons/react/3x2/PL";
import TR from "country-flag-icons/react/3x2/TR";
import US from "country-flag-icons/react/3x2/US";
import { formatRubles } from "@/lib/pricing/rates";
import type { Product } from "@/lib/products/types";
import {
  PS_ACCOUNT_PRICE_MINOR,
  PS_ACCOUNT_REGION_ORDER,
} from "@/lib/ps-accounts/config";
import { useStore } from "@/store/useStore";
import RegionGuideModal from "@/components/RegionGuideModal";

// Region presentation (order + label). Only regions we actually stock render —
// the list is derived from the catalog, not hard-coded.
const REGION_ORDER = ["US", "TR", "IN", "PL"];
// `gen` is the genitive form for "аккаунтами <страны>" so the note reads
// grammatically ("аккаунтами Великобритании", not "…Великобритания").
const REGION_META: Record<string, { label: string; gen: string }> = {
  US: { label: "США", gen: "США" },
  UK: { label: "Великобритания", gen: "Великобритании" },
  TR: { label: "Турция", gen: "Турции" },
  IN: { label: "Индия", gen: "Индии" },
  PL: { label: "Польша", gen: "Польши" },
};

// Crisp SVG flags (country-flag-icons) instead of OS emoji. UK maps to GB.
const FLAG: Record<
  string,
  React.ComponentType<{ className?: string; title?: string }>
> = {
  US,
  UK: GB,
  TR,
  IN,
  PL,
};

function RegionFlag({
  region,
  className,
}: {
  region: string;
  className?: string;
}) {
  const Flag = FLAG[region];
  if (!Flag) return null;
  return <Flag className={className} />;
}
const CURRENCY_SYMBOL: Record<string, string> = {
  USD: "$",
  GBP: "£",
  TRY: "₺",
  INR: "₹",
  PLN: "zł",
};

// One card per region — the fan centres on whichever region is selected below.
const REGION_CARD: Record<string, string> = {
  US: "/banners/ps-us.png",
  UK: "/banners/ps-uk.png",
  TR: "/banners/ps-tr.png",
  IN: "/banners/ps-in.png",
  PL: "/banners/ps-pl.png",
};

function amountLabel(amount: number, currency: string): string {
  const sym = CURRENCY_SYMBOL[currency] ?? "";
  const n = amount.toLocaleString("ru-RU");
  return currency === "PLN" ? `${n} ${sym}` : `${sym}${n}`;
}

function ArrowIcon({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-4 w-4"
      aria-hidden="true"
    >
      <path
        d={dir === "prev" ? "M15 6l-6 6 6 6" : "M9 6l6 6-6 6"}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
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
function PlayStationLogo() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M8.98 2.6v17.55l3.92 1.26V6.69c0-.69.3-1.15.79-.99.64.18.76.81.76 1.5v5.88c2.44 1.19 4.36 0 4.36-3.15 0-3.24-1.13-4.68-4.44-5.83-1.3-.45-3.73-1.19-5.39-1.5zM13.64 18.84l6.3-2.28c.71-.26.82-.62.24-.82-.59-.19-1.64-.14-2.36.12l-4.2 1.5v-2.37l.24-.08s1.2-.42 2.91-.62c1.7-.18 3.79.03 5.44.66 1.85.6 2.04 1.47 1.58 2.07-.47.6-1.62 1.04-1.62 1.04l-8.54 3.1v-2.34zM1.8 18.6c-1.9-.55-2.21-1.67-1.35-2.32.8-.59 2.16-1.05 2.16-1.05l5.62-2.01v2.31l-4.04 1.45c-.7.27-.82.63-.24.82.59.2 1.64.15 2.34-.12l1.94-.7v2.07c-.12.03-.26.04-.39.07-1.94.33-4-.2-6.04-.48z" />
    </svg>
  );
}

export default function PlayStationGiftCards({
  products,
  variant = "full",
}: {
  products: Product[];
  variant?: "full" | "teaser";
}) {
  const router = useRouter();
  const addToCart = useStore((state) => state.addToCart);

  function cartTitle(p: Product) {
    const region = REGION_META[p.region]?.label ?? p.region;
    return `PlayStation Store Card ${amountLabel(p.amountMajor, p.currency)} · ${p.currency} (${region})`;
  }

  function cartItem(p: Product) {
    return {
      denominationId: p.denominationId,
      productType: p.productType,
      title: cartTitle(p),
      region: p.region,
      currency: p.currency,
      amountMajor: p.amountMajor,
      priceMinor: p.salePriceMinor,
      image: p.image,
    };
  }

  // Upsell: a PlayStation account of the same region as the selected card.
  function addAccount(region: string) {
    addToCart({
      denominationId: `ps-account-${region.toLowerCase()}`,
      productType: "ps-account",
      title: `Аккаунт PlayStation (${REGION_META[region]?.label ?? region})`,
      region,
      currency: "",
      amountMajor: 1,
      priceMinor: PS_ACCOUNT_PRICE_MINOR,
      image: "/banners/ps-accounts.png",
    });
  }

  const regions = useMemo(() => {
    const present = new Set(products.map((p) => p.region));
    return REGION_ORDER.filter((r) => present.has(r));
  }, [products]);

  const [region, setRegion] = useState(() => regions[0] ?? "US");

  const amounts = useMemo(
    () =>
      products
        .filter((p) => p.region === region)
        .sort((a, b) => a.amountMajor - b.amountMajor),
    [products, region],
  );

  const [guideOpen, setGuideOpen] = useState(false);
  const [amountId, setAmountId] = useState<string | null>(null);
  const selected =
    amounts.find((p) => p.denominationId === amountId) ?? amounts[0] ?? null;

  function pickRegion(r: string) {
    setRegion(r);
    setAmountId(null);
  }

  const activeIdx = Math.max(0, regions.indexOf(region));
  function stepRegion(delta: number) {
    const n = regions.length;
    if (n === 0) return;
    pickRegion(regions[(((activeIdx + delta) % n) + n) % n]);
  }

  return (
    <div>
      {/* Header + region card carousel (centres on the selected region) */}
      <div className="grid items-start gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <PlayStationLogo />
            PlayStation
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-5xl">
            PlayStation
            <br />
            Gift Cards
          </h2>
          <p className="mt-4 max-w-sm text-base leading-7 text-[var(--text-muted)]">
            Пополните кошелёк PSN. Выберите регион и сумму, которые вам
            подходят.
          </p>
          {variant === "teaser" && (
            <Link
              href="/catalog/playstation"
              className="mt-6 flex w-full max-w-sm items-center justify-center rounded-full bg-[var(--signal-strong)] px-8 py-4 text-base font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]"
            >
              Купить
            </Link>
          )}
        </div>

        {/* Clip the region-card fan to the viewport on small screens — the
            perspective stage below can't reliably clip its 3D-transformed cards,
            so the edge cards would push the page wider. */}
        <div className="relative overflow-x-clip xl:overflow-x-visible">
          <div className="absolute right-0 top-0 z-20 flex gap-2">
            <button
              type="button"
              onClick={() => stepRegion(-1)}
              aria-label="Предыдущий регион"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]/60 transition hover:text-[var(--ink)]"
            >
              <ArrowIcon dir="prev" />
            </button>
            <button
              type="button"
              onClick={() => stepRegion(1)}
              aria-label="Следующий регион"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)]/60 transition hover:text-[var(--ink)]"
            >
              <ArrowIcon dir="next" />
            </button>
          </div>
          <div
            className="relative mx-auto h-[264px] w-full max-w-[540px] md:h-[330px]"
            style={{ perspective: 1400 }}
          >
            {regions.map((r, i) => {
              const n = regions.length;
              let off = (((i - activeIdx) % n) + n) % n;
              if (off > Math.floor(n / 2)) off -= n;
              const abs = Math.abs(off);
              if (abs > 2) return null;
              const isCenter = off === 0;
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => pickRegion(r)}
                  aria-label={REGION_META[r]?.label ?? r}
                  tabIndex={isCenter ? 0 : -1}
                  className="absolute left-1/2 top-1/2 aspect-[3/4] w-[198px] transition-transform duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] md:w-[248px]"
                  style={{
                    transform: `translate(-50%, -50%) translateX(${off * 120}px) rotateY(${off === 0 ? 0 : off > 0 ? -28 : 28}deg) scale(${isCenter ? 1 : Math.max(0.72, 0.88 - (abs - 1) * 0.08)})`,
                    zIndex: 10 - abs,
                    filter: "drop-shadow(0 14px 24px rgba(21,19,27,0.22))",
                  }}
                >
                  <Image
                    src={REGION_CARD[r] ?? "/banners/playstation.png"}
                    alt=""
                    fill
                    sizes="248px"
                    className="object-contain"
                  />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {variant === "full" && (
        <>
      {/* 1. Region */}
      <div className="mt-4 md:mt-6">
        <p className="text-sm font-bold text-[var(--ink)]">
          1. Выберите регион
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {regions.map((r) => {
            const label = REGION_META[r]?.label ?? r;
            const active = r === region;
            return (
              <button
                key={r}
                type="button"
                onClick={() => pickRegion(r)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--ink)]/40"
                }`}
              >
                <RegionFlag region={r} className="w-5 shrink-0 rounded-[3px]" />
                {label}
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
            const active = selected?.denominationId === p.denominationId;
            return (
              <button
                key={p.denominationId}
                type="button"
                onClick={() => setAmountId(p.denominationId)}
                aria-pressed={active}
                className={`inline-flex min-w-[84px] items-center justify-center rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--ink)]/40"
                }`}
              >
                {amountLabel(p.amountMajor, p.currency)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected product summary */}
      {selected && (
        <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center">
            <div className="relative aspect-[3/4] w-[170px] shrink-0 self-center md:w-[190px] md:self-start">
              <Image
                src={
                  REGION_CARD[selected.region] ??
                  selected.image ??
                  "/banners/playstation.png"
                }
                alt=""
                fill
                sizes="190px"
                className="object-contain"
                style={{
                  filter: "drop-shadow(0 12px 22px rgba(21,19,27,0.2))",
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-[family-name:var(--font-unbounded)] text-lg font-bold leading-snug text-[var(--ink)]">
                PlayStation Store Card
                <br />
                {amountLabel(selected.amountMajor, selected.currency)} ·{" "}
                {selected.currency} (
                {REGION_META[selected.region]?.label ?? selected.region})
              </p>
              <div className="mt-3 flex flex-col items-start gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                  <RegionFlag
                    region={selected.region}
                    className="w-4 shrink-0 rounded-[2px]"
                  />
                  {REGION_META[selected.region]?.label ?? selected.region}
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
                {selected.salePriceMinor != null
                  ? formatRubles(selected.salePriceMinor)
                  : "Цена уточняется"}
              </p>
              <button
                type="button"
                onClick={() => {
                  addToCart(cartItem(selected));
                  router.push("/cart");
                }}
                className="inline-flex items-center justify-center rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]"
              >
                Купить
              </button>
              <button
                type="button"
                onClick={() => addToCart(cartItem(selected))}
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
              {REGION_META[selected.region]?.gen ?? selected.region}.
            </span>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="inline-flex items-center gap-1 font-semibold text-[var(--sky)] transition hover:underline"
            >
              Как проверить регион?
              <ArrowIcon dir="next" />
            </button>
          </div>
        </div>
      )}

      {selected && PS_ACCOUNT_REGION_ORDER.includes(selected.region) && (
        <div className="mt-4 flex flex-col gap-3 rounded-[20px] border border-[var(--line)] bg-[var(--card-surface)] p-4 sm:flex-row sm:items-center sm:justify-between md:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] bg-[#0070d1] text-white">
              <PlayStationLogo />
            </span>
            <div className="min-w-0">
              <p className="font-bold text-[var(--ink)]">
                Нет аккаунта {REGION_META[selected.region]?.label ?? selected.region}?
              </p>
              <p className="mt-0.5 text-sm text-[var(--text-muted)]">
                Новый аккаунт — {formatRubles(PS_ACCOUNT_PRICE_MINOR)}. Почту и пароль можно
                менять, доступ только у вас.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => addAccount(selected.region)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-[var(--ink)] px-6 py-3.5 text-sm font-extrabold text-white transition hover:opacity-90"
          >
            В корзину
            <CartIcon />
          </button>
        </div>
      )}
        </>
      )}

      <RegionGuideModal open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
