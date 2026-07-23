"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

/**
 * Search box for the games catalog. Writes the query to the URL (`?q=`) so the
 * server component re-renders the filtered, paginated list. Debounced, and drops
 * the page number on every new query so results start at page 1.
 */
export default function GamesSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  const [value, setValue] = useState(initialQuery);
  // Skip the first run so mounting doesn't re-navigate to the same URL.
  const mounted = useRef(false);

  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    const id = setTimeout(() => {
      const q = value.trim();
      router.replace(q ? `/catalog/games?q=${encodeURIComponent(q)}` : "/catalog/games");
    }, 300);
    return () => clearTimeout(id);
  }, [value, router]);

  return (
    <div className="relative w-full max-w-md">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.9"
        className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[var(--text-muted)]"
        aria-hidden="true"
      >
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-3.5-3.5" strokeLinecap="round" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Поиск по названию игры"
        aria-label="Поиск по каталогу игр"
        className="w-full rounded-full border border-[var(--line-strong)] bg-[var(--paper-strong)] py-3 pl-12 pr-4 text-sm font-semibold text-[var(--ink)] outline-none transition focus:border-[var(--ink)]"
      />
    </div>
  );
}
