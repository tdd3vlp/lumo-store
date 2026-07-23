import { auth } from "@/auth";
import GamesManager from "@/components/admin/GamesManager";
import Header from "@/components/Header";
import { isAdminEmail } from "@/lib/auth/admin";
import { listDbGames } from "@/lib/games/store";

export const dynamic = "force-dynamic";

function AccessDenied() {
  return (
    <div className="mt-8 rounded-[18px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-6">
      <h2 className="text-xl font-bold text-[var(--ink)]">Нет доступа</h2>
      <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
        Эта страница доступна только администраторам.
      </p>
    </div>
  );
}

export default async function AdminGamesPage() {
  const session = await auth();
  const isAdmin = isAdminEmail(session?.user?.email);
  const games = isAdmin ? await listDbGames() : [];

  return (
    <>
      <Header />
      <main className="mx-auto max-w-5xl px-4 pb-36 pt-6 md:px-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Администрирование
        </p>
        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          Игры и предзаказы
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-muted)]">
          Вставьте ссылку на игру в PlayStation Store — цены по регионам, обложка и издания
          подтянутся автоматически. Проверьте стоимость в рублях и добавьте игру в блок на главной.
        </p>

        {isAdmin ? <GamesManager initialGames={games} /> : <AccessDenied />}
      </main>
    </>
  );
}
