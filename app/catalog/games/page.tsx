import Link from "next/link";
import GameCard from "@/components/games/GameCard";
import GamesSearch from "@/components/games/GamesSearch";
import Header from "@/components/Header";
import { pricedGames } from "@/lib/games/pricing";

export const dynamic = "force-dynamic";

export const metadata = { title: "Игры PlayStation — Lumo" };

const PER_PAGE = 9;

function pageHref(page: number, q: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (page > 1) params.set("page", String(page));
  const qs = params.toString();
  return qs ? `/catalog/games?${qs}` : "/catalog/games";
}

export default async function GamesCatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const all = await pricedGames();

  const filtered = q
    ? all.filter((g) => g.title.toLowerCase().includes(q.toLowerCase()))
    : all;

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const page = Math.min(Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1), totalPages);
  const games = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 md:px-6 md:pb-16 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>Игры PlayStation</span>
        </nav>

        <h1 className="font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.02] tracking-[-0.04em] text-[var(--ink)] md:text-5xl">
          Игры и предзаказы
        </h1>
        <p className="mt-4 max-w-xl text-base leading-7 text-[var(--text-muted)]">
          Мы сравниваем цену игры во всех регионах PlayStation Store и подбираем карты
          пополнения, которые покроют покупку дешевле всего. Выберите игру, чтобы увидеть
          сравнение по регионам.
        </p>

        <div className="mt-6">
          <GamesSearch initialQuery={q} />
        </div>

        {games.length === 0 ? (
          <p className="mt-10 rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6 text-sm text-[var(--text-muted)]">
            {q
              ? `По запросу «${q}» ничего не найдено.`
              : "Пока ничего нет — скоро добавим."}
          </p>
        ) : (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {games.map((game) => (
              <GameCard key={game.slug} game={game} />
            ))}
          </div>
        )}

        {totalPages > 1 && (
          <nav
            aria-label="Страницы каталога"
            className="mt-10 flex flex-wrap items-center justify-center gap-2"
          >
            {page > 1 && (
              <Link
                href={pageHref(page - 1, q)}
                rel="prev"
                aria-label="Предыдущая страница"
                className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-4 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                Назад
              </Link>
            )}
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
              <Link
                key={n}
                href={pageHref(n, q)}
                aria-current={n === page ? "page" : undefined}
                className={`inline-flex h-10 min-w-10 items-center justify-center rounded-full px-3 text-sm font-bold transition ${
                  n === page
                    ? "bg-[var(--ink)] text-white"
                    : "border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)]"
                }`}
              >
                {n}
              </Link>
            ))}
            {page < totalPages && (
              <Link
                href={pageHref(page + 1, q)}
                rel="next"
                aria-label="Следующая страница"
                className="inline-flex h-10 items-center rounded-full border border-[var(--line-strong)] px-4 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)]"
              >
                Вперёд
              </Link>
            )}
          </nav>
        )}
      </main>
    </>
  );
}
