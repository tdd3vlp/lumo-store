import { notFound } from "next/navigation";
import GamePageClient from "@/components/GamePageClient";
import { psnDeals } from "@/data/psnDeals";
import { newGames } from "@/data/newGames";
import { preorderGames } from "@/data/preorderGames";
import { getPsnGameById } from "@/lib/psn/storefront";

const staticGames = [...psnDeals, ...newGames, ...preorderGames];

type Props = {
  params: Promise<{ id: string }>;
};

export default async function GamePage({ params }: Props) {
  const { id } = await params;
  const numericId = Number(id);

  if (!Number.isFinite(numericId)) {
    notFound();
  }

  const game =
    (await getPsnGameById(numericId)) ??
    staticGames.find((item) => item.id === numericId);

  if (!game) {
    notFound();
  }

  return <GamePageClient game={game} />;
}
