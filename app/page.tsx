import Header from "@/components/Header";
import TrustStrip from "@/components/TrustStrip";

export const dynamic = "force-dynamic";

export default function Home() {
  return (
    <main className="min-h-screen pb-28 md:pb-32">
      <Header />

      <section className="mx-auto max-w-7xl px-4 pt-8 md:px-6 lg:px-8">
        <div className="overflow-hidden rounded-[28px] bg-[var(--ink)] px-6 py-14 text-white md:px-12 md:py-20">
          <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-[var(--signal)]">
            Lumo Store
          </p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.05] tracking-[-0.04em] md:text-6xl">
            Карты и пополнения
            <br />
            для игр и сервисов
          </h1>
          <p className="mt-5 max-w-xl text-base leading-7 text-white/60 md:text-lg">
            Steam, PlayStation, App Store и другие — коды с моментальной
            доставкой на почту. Каталог скоро появится здесь.
          </p>
        </div>
      </section>

      <div className="mt-10">
        <TrustStrip />
      </div>
    </main>
  );
}
