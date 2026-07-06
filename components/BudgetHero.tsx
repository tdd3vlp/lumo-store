"use client";

import Image from "next/image";
import { useMemo } from "react";
import { REGION_CONFIG } from "@/lib/gift-cards/regions";
import { useStore, type StoreRegion } from "@/store/useStore";

type CoverGame = {
  id: number;
  title: string;
  image: string;
};

type Props = {
  coverGames: Record<StoreRegion, CoverGame[]>;
};

function SparkIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <path
        d="M16 1.5c.9 9.2 5.3 13.6 14.5 14.5-9.2.9-13.6 5.3-14.5 14.5C15.1 21.3 10.7 16.9 1.5 16 10.7 15.1 15.1 10.7 16 1.5Z"
        fill="currentColor"
      />
    </svg>
  );
}

function GiftCardIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 10h18M8 15h4" strokeLinecap="round" />
    </svg>
  );
}

function formatDenomLabel(amount: number): string {
  if (amount >= 1000 && amount % 1000 === 0) return `${amount / 1000}K`;
  if (amount >= 1000) return `${amount / 1000}K`;
  return String(amount);
}

export default function BudgetHero({ coverGames }: Props) {
  const selectedRegion = useStore((state) => state.selectedRegion);
  const selectedBudgets = useStore((state) => state.selectedBudgets);
  const setSelectedBudget = useStore((state) => state.setSelectedBudget);

  const config = REGION_CONFIG[selectedRegion];
  const denominations = config.denominations;
  const selectedBudget = selectedBudgets[selectedRegion];
  const activeCoverGames = coverGames[selectedRegion] ?? [];

  const sliderIndex = useMemo(
    () =>
      denominations.reduce((nearestIndex, amount, index) => {
        const nearestDifference = Math.abs(
          denominations[nearestIndex] - selectedBudget,
        );
        const currentDifference = Math.abs(amount - selectedBudget);
        return currentDifference < nearestDifference ? index : nearestIndex;
      }, 0),
    [denominations, selectedBudget],
  );

  const trackPercent =
    denominations.length > 1
      ? (sliderIndex / (denominations.length - 1)) * 100
      : 0;

  // 5 evenly-spaced label indexes
  const labelIndexes = useMemo(
    () =>
      [0, 1, 2, 3, 4].map((i) =>
        Math.round((i * (denominations.length - 1)) / 4),
      ),
    [denominations.length],
  );

  const formattedBudget = `${config.currencySymbol}${selectedBudget.toLocaleString(config.locale)}`;

  return (
    <section className="px-0 pt-0 md:px-6 md:pt-5 lg:px-8">
      <div className="lumo-hero relative mx-auto max-w-7xl overflow-hidden bg-[var(--ink)] text-white md:rounded-[24px]">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -left-24 top-[-110px] h-72 w-72 rounded-full bg-[var(--signal)]/[0.05] blur-3xl" />
        </div>

        <div className="relative px-4 pb-7 pt-9 sm:px-6 md:px-10 md:pb-8 md:pt-10 lg:px-14 lg:pb-9 lg:pt-11">
          <h1 className="relative z-20 font-[family-name:var(--font-unbounded)] text-[clamp(2.35rem,5.4vw,4.9rem)] font-extrabold leading-[0.92] tracking-[-0.055em] text-[var(--paper-strong)]">
            ИГРЫ ПОД ТВОЙ БЮДЖЕТ
          </h1>

          <div className="relative z-20 mt-8 grid gap-8 md:min-h-[330px] md:grid-cols-[minmax(340px,0.82fr)_minmax(420px,1.18fr)] md:items-center lg:mt-9 lg:min-h-[365px] lg:grid-cols-[minmax(390px,0.78fr)_minmax(620px,1.22fr)]">
            <div className="max-w-[520px] rounded-[18px] border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)] sm:p-5 lg:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/78">
                    Номинал карты:
                  </p>
                  <output
                    htmlFor="hero-budget-slider"
                    className="mt-2 block font-[family-name:var(--font-unbounded)] text-[clamp(2.4rem,6vw,4.1rem)] font-bold leading-none tracking-[-0.05em] text-white"
                  >
                    {formattedBudget}
                  </output>
                </div>
                <SparkIcon className="mt-1 h-6 w-6 text-[var(--signal)]" />
              </div>

              <input
                id="hero-budget-slider"
                type="range"
                min={0}
                max={denominations.length - 1}
                step={1}
                value={sliderIndex}
                onChange={(event) =>
                  setSelectedBudget(denominations[Number(event.target.value)])
                }
                aria-label="Желаемый баланс"
                aria-valuetext={formattedBudget}
                className="budget-slider w-full"
                style={{
                  background: `linear-gradient(to right, var(--signal) 0%, var(--signal) ${trackPercent}%, rgba(255,255,255,0.18) ${trackPercent}%, rgba(255,255,255,0.18) 100%)`,
                }}
              />

              <div
                className="mt-2.5 flex justify-between text-[10px] font-medium text-white/38 sm:text-[11px]"
                aria-hidden="true"
              >
                {labelIndexes.map((index) => (
                  <span key={denominations[index]}>
                    {config.currencySymbol}{formatDenomLabel(denominations[index])}
                  </span>
                ))}
              </div>

              <div className="mt-5">
                <button
                  type="button"
                  className="flex w-full min-h-14 items-center justify-center gap-2.5 rounded-xl border border-[var(--signal)] bg-[var(--signal)] px-4 text-sm font-extrabold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-strong)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[15px]"
                >
                  <GiftCardIcon />
                  Купить карту на {formattedBudget}
                </button>
              </div>
            </div>

            <div className="relative z-10 min-h-[250px] md:min-h-[330px] lg:min-h-[390px]">
              <div className="absolute inset-x-[-6px] top-[-34px] h-[250px] sm:inset-x-[6%] sm:top-[-28px] md:inset-x-0 md:top-[-30px] md:h-[330px] lg:top-[-44px] lg:h-[390px]">
                {activeCoverGames.slice(0, 4).map((game, index) => {
                  const positions = [
                    "left-[-1%] top-[52px] z-[1] w-[32%] -rotate-[5deg]",
                    "left-[21%] top-[12px] z-[4] w-[36%] -rotate-[1.5deg]",
                    "right-[15%] top-[38px] z-[3] w-[34%] rotate-[3deg]",
                    "right-[-3%] top-[68px] z-[2] w-[32%] rotate-[6deg]",
                  ];

                  return (
                    <div
                      key={game.id}
                      className={`hero-cover absolute aspect-square overflow-hidden rounded-[14px] border-2 bg-[var(--ink-soft)] ${
                        index === 1 ? "border-[var(--signal)]" : "border-white/22"
                      } ${positions[index]}`}
                    >
                      <Image
                        src={game.image}
                        alt={game.title}
                        fill
                        sizes="(max-width: 767px) 33vw, 19vw"
                        className="object-cover"
                        priority={index < 2}
                      />
                      <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
