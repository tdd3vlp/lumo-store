"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ComponentType, useState } from "react";
import GB from "country-flag-icons/react/3x2/GB";
import IN from "country-flag-icons/react/3x2/IN";
import PL from "country-flag-icons/react/3x2/PL";
import TR from "country-flag-icons/react/3x2/TR";
import US from "country-flag-icons/react/3x2/US";
import { FaPlaystation } from "react-icons/fa6";
import { formatRubles } from "@/lib/pricing/rates";
import {
  PS_ACCOUNT_PRICE_MINOR,
  PS_ACCOUNT_REGION_META,
  PS_ACCOUNT_REGION_ORDER,
} from "@/lib/ps-accounts/config";
import { useStore } from "@/store/useStore";

const FLAG: Record<string, ComponentType<{ className?: string }>> = {
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
  return Flag ? <Flag className={className} /> : null;
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
function KeyIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className={className}
      aria-hidden="true"
    >
      <circle cx="8" cy="15" r="4" />
      <path
        d="M10.8 12.2 20 3m-3 3 2 2m-4-4 2 2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
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

export default function PsAccountsBuy({
  available,
}: {
  available: Record<string, number>;
}) {
  const router = useRouter();
  const addToCart = useStore((state) => state.addToCart);

  const [region, setRegion] = useState(PS_ACCOUNT_REGION_ORDER[0]);
  const meta = PS_ACCOUNT_REGION_META[region];
  const stock = available[region] ?? 0;

  function buy(goToCart: boolean) {
    addToCart({
      denominationId: `ps-account-${region.toLowerCase()}`,
      productType: "ps-account",
      title: `Аккаунт PlayStation (${meta?.label ?? region})`,
      region,
      currency: "",
      amountMajor: 1,
      priceMinor: PS_ACCOUNT_PRICE_MINOR,
      image: "/banners/ps-accounts.png",
    });
    if (goToCart) router.push("/cart");
  }

  return (
    <div>
      {/* Header + generic account card */}
      <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-10">
        <div>
          <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--text-muted)]">
            <FaPlaystation className="h-4 w-4" style={{ color: "#0070d1" }} />
            PlayStation
          </p>
          <h2 className="mt-3 font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-5xl">
            Аккаунты
            <br />
            PlayStation
          </h2>
          <p className="mt-4 max-w-sm text-base leading-7 text-[var(--text-muted)]">
            Новый аккаунт PlayStation нужного региона — чтобы покупать игры и
            карты пополнения этого региона.
          </p>
        </div>

        <div className="relative hidden items-center justify-center lg:flex">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-1/2 h-[280px] w-[280px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#0070d1] opacity-15 blur-[90px]"
          />
          <div
            className="relative h-[300px] w-[225px]"
            style={{
              transform: "rotate(-4deg)",
              filter: "drop-shadow(0 20px 40px rgba(21,19,27,0.28))",
            }}
          >
            <Image
              src="/banners/ps-accounts.png"
              alt="Аккаунты PlayStation"
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
          1. Выберите регион аккаунта
        </p>
        <div className="mt-3 flex flex-wrap gap-2.5">
          {PS_ACCOUNT_REGION_ORDER.map((r) => {
            const active = r === region;
            return (
              <button
                key={r}
                type="button"
                onClick={() => setRegion(r)}
                aria-pressed={active}
                className={`inline-flex items-center gap-2 rounded-[14px] border px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "border-[var(--ink)] bg-[var(--signal)] text-[var(--ink)]"
                    : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--ink)]/40"
                }`}
              >
                <RegionFlag region={r} className="w-5 shrink-0 rounded-[3px]" />
                {PS_ACCOUNT_REGION_META[r]?.label ?? r}
              </button>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <div className="mt-6 rounded-[24px] border border-[var(--line)] bg-[var(--paper-strong)] p-5 md:p-6">
        <div className="flex flex-col gap-6 md:flex-row md:items-center">
          <div className="relative aspect-[3/4] w-[150px] shrink-0 self-center md:w-[168px] md:self-start">
            <Image
              src="/banners/ps-accounts.png"
              alt=""
              fill
              sizes="168px"
              className="object-contain"
              style={{ filter: "drop-shadow(0 12px 22px rgba(21,19,27,0.2))" }}
            />
          </div>

          <div className="min-w-0 flex-1">
            <p className="font-[family-name:var(--font-unbounded)] text-lg font-bold leading-snug text-[var(--ink)]">
              Аккаунт PlayStation
              <br />
              {meta?.label ?? region}
            </p>
            <div className="mt-3 flex flex-col items-start gap-1.5 text-xs font-semibold text-[var(--text-muted)]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                <RegionFlag
                  region={region}
                  className="w-4 shrink-0 rounded-[2px]"
                />
                {meta?.label ?? region}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                <KeyIcon className="h-3.5 w-3.5 text-[#0070d1]" />
                Почта, пароль и 2FA
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--card-surface)] px-3 py-1.5">
                <BoltIcon className="h-3.5 w-3.5 text-[#eab308]" />
                {stock > 0 ? `В наличии: ${stock}` : "Под заказ"}
              </span>
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 md:w-[220px]">
            <p className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-right">
              {formatRubles(PS_ACCOUNT_PRICE_MINOR)}
            </p>
            <button
              type="button"
              onClick={() => buy(true)}
              className="inline-flex items-center justify-center rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)]"
            >
              Купить
            </button>
            <button
              type="button"
              onClick={() => buy(false)}
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
            После оплаты данные аккаунта — почта, пароль, коды 2FA и дата
            рождения — появятся в личном кабинете. На почту придёт подтверждение
            готовности (сами данные письмом не отправляем — так безопаснее).
          </span>
        </div>
      </div>
    </div>
  );
}
