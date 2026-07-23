import Link from "next/link";
import Header from "@/components/Header";
import PsAccountsBuy from "@/components/PsAccountsBuy";
import { availablePsAccountCounts } from "@/lib/ps-accounts/store";

export const dynamic = "force-dynamic";

export default async function PsAccountsPage() {
  const available = await availablePsAccountCounts();

  return (
    <>
      <Header />
      <main className="mx-auto max-w-7xl px-4 pb-36 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>Аккаунты PlayStation</span>
        </nav>

        <PsAccountsBuy available={available} />
      </main>
    </>
  );
}
