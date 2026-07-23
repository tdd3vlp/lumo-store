import Link from "next/link";
import { notFound } from "next/navigation";
import GameBuyPanel from "@/components/games/GameBuyPanel";
import Header from "@/components/Header";
import PlayStationActivationGuide from "@/components/PlayStationActivationGuide";
import { pricedGames } from "@/lib/games/pricing";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = (await pricedGames()).find((g) => g.slug === slug);
  return { title: game ? `${game.title} — Lumo` : "Игра — Lumo" };
}

export default async function GamePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const game = (await pricedGames()).find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-12 pt-6 md:px-6 md:pb-16 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex flex-wrap items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            href="/catalog/games"
            className="font-semibold transition hover:text-[var(--ink)]"
          >
            Игры PlayStation
          </Link>
          <span aria-hidden="true">/</span>
          <span className="truncate">{game.title}</span>
        </nav>

        <GameBuyPanel game={game} />
        <PlayStationActivationGuide />
      </main>
    </>
  );
}
