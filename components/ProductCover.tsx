import Image from "next/image";
import { productTypeLabel } from "@/lib/products/labels";

// Fills its (position: relative) parent. Shows the curated cover image when
// present; otherwise renders a templated fallback in the Lumo card style —
// dark body, lime amount with glow, cream footer with the brand + region. It
// intentionally does NOT try to reproduce brand product artwork (Apple card
// collages, logos, etc.) — those live in the real cover PNGs under public/covers.

const CURRENCY_SHORT: Record<string, string> = {
  TRY: "TL",
  USD: "$",
  EUR: "€",
  RUB: "₽",
  GBP: "£",
  UAH: "₴",
  KZT: "₸",
};

const REGION_LABEL: Record<string, string> = {
  TR: "Турция",
  US: "США",
  USA: "США",
  IN: "Индия",
  GLOBAL: "Глобальный",
  EU: "Европа",
};

export default function ProductCover({
  image,
  productType,
  amountMajor,
  currency,
  region,
  sizes,
  priority = false,
}: {
  image: string;
  productType: string;
  amountMajor: number;
  currency: string;
  region?: string;
  sizes?: string;
  priority?: boolean;
}) {
  if (image) {
    return (
      <Image
        src={image}
        alt=""
        fill
        sizes={sizes ?? "300px"}
        priority={priority}
        className="object-cover"
      />
    );
  }

  const currencyShort = CURRENCY_SHORT[currency] ?? currency;
  const regionLabel = region ? REGION_LABEL[region] : undefined;

  return (
    <div
      className="absolute inset-0 flex flex-col justify-between overflow-hidden bg-[radial-gradient(120%_90%_at_50%_20%,#26232e_0%,#141219_55%,#0d0c11_100%)]"
      style={{ containerType: "inline-size" }}
    >
      {/* hanger tab */}
      <div className="flex justify-center pt-3">
        <span className="h-2.5 w-14 rounded-full bg-white/15" />
      </div>

      {/* amount with lime glow */}
      <div className="flex flex-1 items-center justify-center px-3">
        <span
          className="font-[family-name:var(--font-unbounded)] font-black leading-none text-[var(--signal)]"
          style={{
            fontSize: "clamp(2.4rem, 22cqw, 4rem)",
            textShadow: "0 0 42px rgba(216,255,62,0.45)",
          }}
        >
          {amountMajor.toLocaleString("ru-RU")}
          <span className="align-super text-[0.42em] font-extrabold">
            {currencyShort}
          </span>
        </span>
      </div>

      {/* cream footer with brand + region */}
      <div className="bg-[var(--paper)] px-3.5 py-2.5">
        <p className="truncate text-[13px] font-extrabold uppercase tracking-[0.04em] text-[var(--ink)] md:text-sm">
          {productTypeLabel(productType)}
        </p>
        <p className="truncate text-[10px] font-semibold text-[var(--text-muted)]">
          Подарочная карта{regionLabel ? ` · ${regionLabel}` : ""}
        </p>
      </div>
    </div>
  );
}
