"use client";

import Link from "next/link";
import { use, useMemo, useState } from "react";
import { notFound } from "next/navigation";
import { Swiper, SwiperSlide } from "swiper/react";
import Header from "@/components/Header";
import { games } from "@/data/mockGames";
import { useStore } from "@/store/useStore";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

function HeartIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg
        viewBox="0 0 24 24"
        className="h-5 w-5"
        fill="currentColor"
        aria-hidden="true"
      >
        <path d="M12 20.5s-7-4.35-7-10.07A4.43 4.43 0 0 1 9.46 6a4.91 4.91 0 0 1 2.54 1.44A4.91 4.91 0 0 1 14.54 6 4.43 4.43 0 0 1 19 10.43C19 16.15 12 20.5 12 20.5Z" />
      </svg>
    );
  }

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

function formatINR(value: number) {
  return `₹${value.toLocaleString("en-IN")}`;
}

export default function GamePage({ params }: PageProps) {
  const { id } = use(params);
  const game = games.find((item) => item.id === Number(id));

  const favorites = useStore((state) => state.favorites);
  const toggleFavorite = useStore((state) => state.toggleFavorite);
  const addToCart = useStore((state) => state.addToCart);

  if (!game) {
    notFound();
  }

  const [selectedEditionId, setSelectedEditionId] = useState(
    game.editions[0].id,
  );

  const selectedEdition = useMemo(
    () =>
      game.editions.find((edition) => edition.id === selectedEditionId) ??
      game.editions[0],
    [game.editions, selectedEditionId],
  );

  const isFavorite = favorites.includes(game.id);

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

          <span className="font-medium text-[#4b3a70]">{game.title}</span>
        </nav>

        <section className="overflow-hidden rounded-[32px] border border-white/60 bg-white/80 shadow-[0_18px_40px_rgba(143,92,255,0.14)]">
          <img
            src={game.image}
            alt={game.title}
            className="h-[260px] w-full object-cover md:h-[420px]"
          />
        </section>

        <section className="mt-6 rounded-[28px] border border-white/60 bg-white/80 p-5 shadow-[0_14px_30px_rgba(120,92,170,0.12)] md:p-6">
          <div className="mb-4">
            <h1 className="text-2xl font-black text-[#2a1f44] md:text-4xl">
              {game.title}
            </h1>

            <div className="mt-3 flex items-end gap-3">
              <span className="text-2xl font-bold text-[#7c4dff]">
                {formatINR(selectedEdition.price)}
              </span>
              <span className="text-base text-[#9b8bb8] line-through">
                {formatINR(selectedEdition.originalPrice)}
              </span>
            </div>
          </div>

          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() =>
                addToCart({
                  id: Number(`${game.id}${selectedEdition.id}`),
                  title: `${game.title} — ${selectedEdition.name}`,
                  price: selectedEdition.price,
                  image: game.image,
                })
              }
              className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-[linear-gradient(135deg,#8f5cff,#c084fc)] px-5 py-4 text-base font-semibold text-white shadow-[0_12px_22px_rgba(143,92,255,0.22)] transition hover:translate-y-[-1px]"
            >
              <BagIcon />
              <span>Добавить в корзину</span>
            </button>

            <button
              type="button"
              onClick={() => toggleFavorite(game.id)}
              className={`group flex h-[56px] w-[56px] items-center justify-center rounded-2xl border border-white/60 shadow-sm transition-all duration-200 ${
                isFavorite
                  ? "bg-[#f3edff] text-[#7c4dff]"
                  : "bg-white/80 text-[#6c5c90] hover:bg-white hover:scale-[1.05]"
              }`}
              aria-label={
                isFavorite ? "Remove from favorites" : "Add to favorites"
              }
            >
              <div
                className={`transition-transform duration-200 ${
                  isFavorite ? "scale-110" : "group-hover:scale-110"
                }`}
              >
                <HeartIcon filled={isFavorite} />
              </div>
            </button>
          </div>

          <div className="mb-6">
            <div className="mb-3 text-sm font-medium text-[#8f5cff]">
              Издание
            </div>

            <div className="flex flex-wrap gap-3">
              {game.editions.map((edition) => {
                const isActive = edition.id === selectedEditionId;

                return (
                  <button
                    key={edition.id}
                    type="button"
                    onClick={() => setSelectedEditionId(edition.id)}
                    className={`rounded-2xl border px-4 py-3 text-left transition ${
                      isActive
                        ? "border-[#bca8ff] bg-[#f3edff] text-[#2a1f44]"
                        : "border-white/60 bg-white/70 text-[#6b5a8f] hover:bg-white"
                    }`}
                  >
                    <div className="text-sm font-semibold">{edition.name}</div>
                    <div className="mt-1 text-sm">
                      {formatINR(edition.price)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <div className="mb-2 text-sm font-medium text-[#8f5cff]">
                Описание
              </div>
              <p className="leading-7 text-[#5d4f7f]">{game.description}</p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl bg-[#f8f4ff] p-4">
                <div className="mb-1 text-sm font-medium text-[#8f5cff]">
                  Платформа
                </div>
                <div className="text-sm font-semibold text-[#2a1f44]">
                  {game.platform}
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8f4ff] p-4">
                <div className="mb-1 text-sm font-medium text-[#8f5cff]">
                  Русский язык
                </div>
                <div className="text-sm font-semibold text-[#2a1f44]">
                  {game.hasRussian ? "Доступен" : "Не поддерживается"}
                </div>
              </div>

              <div className="rounded-2xl bg-[#f8f4ff] p-4">
                <div className="mb-1 text-sm font-medium text-[#8f5cff]">
                  Дата релиза
                </div>
                <div className="text-sm font-semibold text-[#2a1f44]">
                  {game.releaseDate}
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-4 text-lg font-bold text-[#2a1f44]">Скриншоты</div>

          <Swiper
            spaceBetween={16}
            slidesPerView={1.1}
            breakpoints={{
              768: {
                slidesPerView: 2.2,
              },
              1280: {
                slidesPerView: 3,
              },
            }}
          >
            {game.screenshots.map((screenshot, index) => (
              <SwiperSlide key={index}>
                <div className="overflow-hidden rounded-[24px] border border-white/60 bg-white/70 shadow-sm">
                  <img
                    src={screenshot}
                    alt={`${game.title} screenshot ${index + 1}`}
                    className="h-[220px] w-full object-cover"
                  />
                </div>
              </SwiperSlide>
            ))}
          </Swiper>
        </section>
      </main>
    </>
  );
}
