import Image from "next/image";
import Link from "next/link";
import Header from "@/components/Header";

export const metadata = { title: "О компании — Lumo" };

// Brand cards arranged as a static fan in the hero banner — same set and order
// as the home-page HeroCarousel, with PlayStation centered.
const FAN = [
  { src: "/banners/steam.png", label: "Steam", off: -2 },
  { src: "/banners/apple.png", label: "App Store", off: -1 },
  { src: "/banners/playstation.png", label: "PlayStation", off: 0 },
  { src: "/banners/xbox.png", label: "Xbox", off: 1 },
  { src: "/banners/nintendo.png", label: "Nintendo eShop", off: 2 },
];

const SERVICES = [
  { src: "/banners/playstation.png", label: "PlayStation Store" },
  { src: "/banners/xbox.png", label: "Xbox" },
  { src: "/banners/steam.png", label: "Steam" },
  { src: "/banners/telegram-stars.png", label: "Telegram Stars" },
  { src: "/banners/apple.png", label: "App Store" },
  { src: "/banners/nintendo.png", label: "Nintendo" },
];

const FEATURES = [
  {
    title: "Моментальная выдача",
    text: "Коды и инструкция приходят на почту сразу после оплаты и доступны в личном кабинете.",
  },
  {
    title: "Выгодные регионы",
    text: "Подбираем номиналы под нужный регион аккаунта и показываем итоговую цену в рублях.",
  },
  {
    title: "Дружелюбная поддержка",
    text: "Поможем выбрать регион, активировать код и разобраться с любым вопросом по заказу.",
  },
  {
    title: "Безопасная оплата",
    text: "Платёж проходит через платёжный сервис — мы не получаем доступ к данным вашей карты.",
  },
];

export default function AboutPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link
            href="/"
            className="font-semibold transition hover:text-[var(--ink)]"
          >
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>О компании</span>
        </nav>

        {/* Hero banner */}
        <section className="relative overflow-hidden rounded-[28px] bg-[var(--ink)] px-6 py-10 text-white md:px-12 md:py-14">
          {/* Decorative PS symbols */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 select-none opacity-[0.06]"
          >
            <span className="absolute left-6 top-8 text-7xl md:text-9xl">
              △
            </span>
            <span className="absolute bottom-6 left-1/3 text-6xl md:text-8xl">
              ○
            </span>
            <span className="absolute right-1/4 top-6 text-6xl md:text-8xl">
              ✕
            </span>
            <span className="absolute bottom-10 right-8 text-7xl md:text-9xl">
              □
            </span>
          </div>

          <div className="relative grid items-center gap-10 md:grid-cols-[1.1fr_1fr]">
            <div>
              <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold leading-[1.05] tracking-[-0.045em] md:text-5xl">
                Играй без ограничений
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-white/70">
                Lumo — пополнение кошельков и покупка цифровых товаров:
                PlayStation Store, Xbox, Steam, Telegram Stars, App Store и
                другие. <br />
                Выбирайте нужный регион и номинал, оплачивайте в рублях и
                получайте коды моментально.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href="/"
                  className="inline-flex items-center rounded-full bg-[var(--signal)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
                >
                  Перейти в каталог
                </Link>
                <Link
                  href="/support"
                  className="inline-flex items-center rounded-full border border-white/25 px-6 py-3.5 text-sm font-extrabold text-white transition hover:border-white/60"
                >
                  Связаться с нами
                </Link>
              </div>
            </div>

            {/* Card fan */}
            <div
              className="relative mx-auto h-[220px] w-full max-w-[420px] md:h-[280px]"
              style={{ perspective: 1400 }}
            >
              {FAN.map(({ src, label, off }) => {
                const abs = Math.abs(off);
                return (
                  <div
                    key={src}
                    className="absolute left-1/2 top-1/2 aspect-[3/4] w-[150px] md:w-[186px]"
                    style={{
                      transform: `translate(-50%, -50%) translateX(${off * 88}px) rotate(${off * 7}deg) scale(${off === 0 ? 1 : Math.max(0.8, 0.9 - (abs - 1) * 0.06)})`,
                      zIndex: 10 - abs,
                      filter: "drop-shadow(0 18px 30px rgba(0,0,0,0.45))",
                    }}
                  >
                    <Image
                      src={src}
                      alt={label}
                      fill
                      sizes="186px"
                      className="object-contain"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* What we sell */}
        <section className="mt-14">
          <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
            Что мы продаём?
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[var(--text-muted)]">
            Карты пополнения и цифровые товары для популярных игровых и
            медиасервисов. Все коды — официальные номиналы соответствующих
            регионов; вы активируете их на своём аккаунте и тратите на любые
            покупки внутри сервиса.
          </p>

          <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
            {SERVICES.map((s) => (
              <div
                key={s.label}
                className="flex items-center gap-3 rounded-2xl border border-[var(--line)] bg-[var(--paper-strong)] p-4"
              >
                <span className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg">
                  <Image
                    src={s.src}
                    alt=""
                    fill
                    sizes="40px"
                    className="object-contain"
                  />
                </span>
                <span className="text-sm font-bold text-[var(--ink)]">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="mt-14">
          <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
            Почему Lumo?
          </h2>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="rounded-2xl border border-[var(--line)] bg-[var(--card-surface)] p-6"
              >
                <p className="text-base font-bold text-[var(--ink)]">
                  {f.title}
                </p>
                <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
                  {f.text}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="mt-14 rounded-[28px] border border-[var(--line)] bg-[var(--paper-strong)] px-6 py-10 text-center md:px-12">
          <h2 className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-3xl">
            Готовы пополнить баланс?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-6 text-[var(--text-muted)]">
            Выберите сервис, регион и номинал — код придёт на почту сразу после
            оплаты.
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex items-center rounded-full bg-[var(--ink)] px-7 py-3.5 text-sm font-extrabold text-white transition hover:bg-[var(--ink)]/90"
          >
            Открыть каталог
          </Link>
        </section>
      </main>
    </>
  );
}
