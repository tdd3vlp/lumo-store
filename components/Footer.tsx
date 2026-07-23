import Link from "next/link";

const MAIN_LINKS = [
  { label: "О компании", href: "/about" },
  { label: "Контакты", href: "/contacts" },
  { label: "Поддержка", href: "/support" },
];

const LEGAL_LINKS = [
  { label: "Пользовательское соглашение", href: "/terms" },
  { label: "Политика конфиденциальности", href: "/privacy" },
];

export default function Footer() {
  return (
    <footer className="border-t border-[var(--line)] bg-[var(--paper-strong)]">
      <div className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-12 lg:px-8">
        <div className="flex flex-col gap-8 md:flex-row md:items-start md:justify-between">
          <div>
            <Link href="/" className="inline-flex items-center gap-1.5">
              <span className="font-[family-name:var(--font-unbounded)] text-xl font-black tracking-tight text-[var(--ink)]">
                LUMO
              </span>
              <span className="h-1.5 w-1.5 rounded-full bg-[var(--signal-strong)]" aria-hidden="true" />
            </Link>

            <nav className="mt-6 flex flex-wrap gap-x-7 gap-y-3">
              {MAIN_LINKS.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-base font-bold text-[var(--ink)] transition hover:text-[var(--ink)]/60"
                >
                  {l.label}
                </Link>
              ))}
            </nav>
          </div>

        </div>

        <div className="mt-8 flex flex-col gap-3 border-t border-[var(--line)] pt-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="text-sm text-[var(--text-muted)] transition hover:text-[var(--ink)]"
              >
                {l.label}
              </Link>
            ))}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            © {new Date().getFullYear()} Lumo Store
          </p>
        </div>
      </div>
    </footer>
  );
}
