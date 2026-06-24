"use client";

import Image from "next/image";
import { useStore } from "@/store/useStore";

const DENOMINATIONS = [
  1000, 2000, 3000, 4000, 5000, 7000, 8000, 9000, 12000,
];

const LABEL_INDEXES = [0, 2, 4, 6, 8];

type CoverGame = {
  id: number;
  title: string;
  image: string;
};

type Props = {
  coverGames: CoverGame[];
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

function ArrowDownIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M12 4v15" strokeLinecap="round" />
      <path
        d="m6.5 13.5 5.5 5.5 5.5-5.5"
        strokeLinecap="round"
        strokeLinejoin="round"
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

export default function BudgetHero({ coverGames }: Props) {
  const selectedBudget = useStore((state) => state.selectedBudget);
  const setSelectedBudget = useStore((state) => state.setSelectedBudget);

  const sliderIndex = DENOMINATIONS.reduce((nearestIndex, amount, index) => {
    const nearestDifference = Math.abs(
      DENOMINATIONS[nearestIndex] - selectedBudget,
    );
    const currentDifference = Math.abs(amount - selectedBudget);
    return currentDifference < nearestDifference ? index : nearestIndex;
  }, 0);
  const trackPercent = (sliderIndex / (DENOMINATIONS.length - 1)) * 100;

  const scrollToBudgetGames = () => {
    document
      .getElementById("budget-games")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <section className="px-0 pt-0 md:px-6 md:pt-5 lg:px-8">
      <div className="lumo-hero relative mx-auto max-w-7xl overflow-hidden bg-[var(--ink)] text-white md:rounded-[24px]">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div className="absolute -left-24 top-[-110px] h-72 w-72 rounded-full bg-[var(--signal)]/[0.05] blur-3xl" />
        </div>

        <div className="relative grid min-h-[570px] gap-8 px-4 pb-7 pt-9 sm:px-6 md:min-h-[520px] md:grid-cols-[minmax(0,0.92fr)_minmax(420px,1.08fr)] md:px-10 md:pb-9 md:pt-11 lg:min-h-[590px] lg:grid-cols-[minmax(420px,0.9fr)_minmax(560px,1.1fr)] lg:px-14 lg:pb-11 lg:pt-12">
          <div className="relative z-20 flex flex-col">
            <div className="relative max-w-[700px]">
              <h1 className="font-[family-name:var(--font-unbounded)] text-[clamp(2.45rem,5.1vw,5rem)] font-extrabold leading-[0.92] tracking-[-0.055em] text-[var(--paper-strong)]">
                ИГРЫ ПОД
                <br />
                ТВОЙ БЮДЖЕТ
              </h1>
            </div>

            <div className="relative z-20 mt-10 max-w-[520px] rounded-[18px] border border-white/20 bg-[linear-gradient(145deg,rgba(255,255,255,0.09),rgba(255,255,255,0.025))] p-4 shadow-[0_18px_55px_rgba(0,0,0,0.32)] sm:mt-12 sm:p-5 md:mt-14 lg:mt-16 lg:p-6">
              <div className="mb-5 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-white/78">
                    Номинал:
                  </p>
                  <output
                    htmlFor="hero-budget-slider"
                    className="mt-2 block font-[family-name:var(--font-unbounded)] text-[clamp(2.4rem,6vw,4.1rem)] font-bold leading-none tracking-[-0.05em] text-white"
                  >
                    ₹ {selectedBudget.toLocaleString("en-IN")}
                  </output>
                </div>
                <SparkIcon className="mt-1 h-6 w-6 text-[var(--signal)]" />
              </div>

              <input
                id="hero-budget-slider"
                type="range"
                min={0}
                max={DENOMINATIONS.length - 1}
                step={1}
                value={sliderIndex}
                onChange={(event) =>
                  setSelectedBudget(DENOMINATIONS[Number(event.target.value)])
                }
                aria-label="Желаемый баланс"
                aria-valuetext={`₹${selectedBudget.toLocaleString("en-IN")}`}
                className="budget-slider w-full"
                style={{
                  background: `linear-gradient(to right, var(--signal) 0%, var(--signal) ${trackPercent}%, rgba(255,255,255,0.18) ${trackPercent}%, rgba(255,255,255,0.18) 100%)`,
                }}
              />

              <div
                className="mt-2.5 flex justify-between text-[10px] font-medium text-white/38 sm:text-[11px]"
                aria-hidden="true"
              >
                {LABEL_INDEXES.map((index) => (
                  <span key={DENOMINATIONS[index]}>
                    {DENOMINATIONS[index] >= 10000
                      ? `${DENOMINATIONS[index] / 1000}K`
                      : DENOMINATIONS[index].toLocaleString("en-IN")}
                  </span>
                ))}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-[1.18fr_0.82fr]">
                <button
                  type="button"
                  className="flex min-h-14 items-center justify-center gap-2.5 rounded-xl border border-[var(--signal)] bg-[var(--signal)] px-4 text-sm font-extrabold text-[var(--ink)] transition hover:-translate-y-0.5 hover:bg-[var(--signal-strong)] active:translate-y-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[15px]"
                >
                  <GiftCardIcon />
                  Купить карту на ₹{selectedBudget.toLocaleString("en-IN")}
                </button>

                <button
                  type="button"
                  onClick={scrollToBudgetGames}
                  className="flex min-h-14 items-center justify-center gap-2 rounded-xl border border-white/28 bg-white/[0.06] px-4 text-sm font-bold text-white transition hover:border-white/45 hover:bg-white/[0.11] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white sm:text-[15px]"
                >
                  Подобрать
                  <ArrowDownIcon />
                </button>
              </div>
            </div>
          </div>

          <div className="relative z-10 min-h-[250px] md:min-h-0">
            <div className="absolute inset-x-[-6px] top-[-10px] h-[250px] sm:inset-x-[6%] md:inset-x-0 md:top-6 md:h-[330px] lg:top-3 lg:h-[390px]">
              {coverGames.slice(0, 4).map((game, index) => {
                const positions = [
                  "left-[1%] top-[48px] z-[1] w-[27%] -rotate-[5deg]",
                  "left-[25%] top-[10px] z-[4] w-[31%] -rotate-[1.5deg]",
                  "right-[20%] top-[34px] z-[3] w-[29%] rotate-[3deg]",
                  "right-[-1%] top-[62px] z-[2] w-[27%] rotate-[6deg]",
                ];

                return (
                  <div
                    key={game.id}
                    className={`hero-cover absolute aspect-[2/3] overflow-hidden rounded-[14px] border-2 bg-[var(--ink-soft)] ${
                      index === 1 ? "border-[var(--signal)]" : "border-white/22"
                    } ${positions[index]}`}
                  >
                    <Image
                      src={game.image}
                      alt={game.title}
                      fill
                      sizes="(max-width: 767px) 28vw, 16vw"
                      className="object-cover"
                      priority={index < 2}
                    />
                    <div className="absolute inset-0 ring-1 ring-inset ring-white/10" />
                  </div>
                );
              })}
            </div>

            <div
              data-budget-status-anchor
              className="absolute inset-x-0 bottom-0 h-[76px]"
              aria-hidden="true"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
