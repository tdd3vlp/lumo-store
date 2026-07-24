import Link from "next/link";
import Header from "@/components/Header";

// A section's body is a list of blocks: a string renders as a paragraph, an
// array of strings renders as a bulleted list.
export type LegalSection = { heading: string; body: Array<string | string[]> };

export default function LegalDoc({
  title,
  updated,
  intro,
  sections,
}: {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}) {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-4 pb-24 pt-6 md:px-6 lg:px-8">
        <nav
          aria-label="Хлебные крошки"
          className="mb-5 flex items-center gap-2 text-sm text-[var(--text-muted)]"
        >
          <Link href="/" className="font-semibold transition hover:text-[var(--ink)]">
            Главная
          </Link>
          <span aria-hidden="true">/</span>
          <span>{title}</span>
        </nav>

        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.045em] text-[var(--ink)] md:text-4xl">
          {title}
        </h1>
        <p className="mt-3 text-sm text-[var(--text-muted)]">Обновлено {updated}</p>
        {intro && (
          <p className="mt-4 text-base leading-7 text-[var(--text-muted)]">{intro}</p>
        )}

        <div className="mt-10 space-y-9">
          {sections.map((s, i) => (
            <section key={s.heading}>
              <h2 className="text-lg font-bold text-[var(--ink)] md:text-xl">
                {i + 1}. {s.heading}
              </h2>
              <div className="mt-3 space-y-3">
                {s.body.map((block, j) =>
                  Array.isArray(block) ? (
                    <ul key={j} className="space-y-2">
                      {block.map((item, k) => (
                        <li key={k} className="flex gap-2.5 text-sm leading-7 text-[var(--text-muted)]">
                          <span
                            aria-hidden="true"
                            className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--signal-strong)]"
                          />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p key={j} className="text-sm leading-7 text-[var(--text-muted)]">
                      {block}
                    </p>
                  ),
                )}
              </div>
            </section>
          ))}
        </div>
      </main>
    </>
  );
}
