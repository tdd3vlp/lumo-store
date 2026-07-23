"use client";

import Image from "next/image";
import { useState } from "react";
import { formatRubles } from "@/lib/pricing/rates";
import type { Game } from "@/lib/games/catalog";
import type { PricedGame } from "@/lib/games/pricing";

const INPUT_CLASS =
  "block w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2.5 text-[var(--ink)] outline-none focus:border-[var(--ink)]";

type Preview = { game: Game; priced: PricedGame };

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "long", year: "numeric" }).format(d);
}

export default function GamesManager({ initialGames }: { initialGames: Game[] }) {
  const [games, setGames] = useState<Game[]>(initialGames);
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<Preview | null>(null);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resyncing, setResyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function check() {
    setChecking(true);
    setError(null);
    setNotice(null);
    setPreview(null);
    try {
      const res = await fetch("/api/admin/games/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setPreview(d as Preview);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setChecking(false);
    }
  }

  async function add() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/games", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setGames(d.games ?? games);
      setPreview(null);
      setUrl("");
      setNotice("Игра добавлена в блок на главной.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function remove(slug: string) {
    setError(null);
    setNotice(null);
    try {
      const res = await fetch(`/api/admin/games?slug=${encodeURIComponent(slug)}`, {
        method: "DELETE",
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setGames(d.games ?? games);
      setNotice("Игра удалена.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    }
  }

  async function resync() {
    setResyncing(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/games/resync", { method: "POST" });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setGames(d.games ?? games);
      const failed = Array.isArray(d.failed) && d.failed.length ? ` Не удалось: ${d.failed.join(", ")}.` : "";
      setNotice(
        `Обновлены ${d.updated} самых давних игр из ${d.total}. Остальные обновятся автоматически (и при повторном нажатии).${failed}`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setResyncing(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Add by URL */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">Добавить игру по ссылке</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://store.playstation.com/en-tr/product/…"
            className={INPUT_CLASS}
          />
          <button
            type="button"
            onClick={check}
            disabled={checking || !url.trim()}
            className="inline-flex shrink-0 items-center justify-center rounded-full bg-[var(--ink)] px-6 py-2.5 text-sm font-extrabold text-white transition hover:bg-[var(--ink)]/90 disabled:opacity-50"
          >
            {checking ? "Проверяю…" : "Проверить стоимость"}
          </button>
        </div>
        <p className="mt-2 text-xs leading-5 text-[var(--text-muted)]">
          Подойдёт любая ссылка на товар или концепт игры — цены снимаются по регионам US, TR,
          PL, UK и IN.
        </p>
      </section>

      {error && (
        <p className="rounded-[12px] border border-[var(--coral)]/40 bg-[var(--coral)]/10 px-4 py-3 text-sm font-semibold text-[var(--coral)]">
          {error}
        </p>
      )}
      {notice && (
        <p className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-strong)] px-4 py-3 text-sm font-semibold text-[var(--ink)]">
          {notice}
        </p>
      )}

      {/* Preview */}
      {preview && (
        <section className="rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5">
          <div className="flex flex-col gap-4 sm:flex-row">
            <div className="relative aspect-[16/9] w-full shrink-0 overflow-hidden rounded-[14px] bg-black/10 sm:w-64">
              <Image src={preview.game.cover} alt={preview.game.title} fill sizes="256px" className="object-cover" />
            </div>
            <div className="min-w-0">
              <h3 className="font-[family-name:var(--font-unbounded)] text-xl font-bold text-[var(--ink)]">
                {preview.game.title}
              </h3>
              <p className="mt-1 text-sm text-[var(--text-muted)]">
                {preview.game.platform} · выходит {formatDate(preview.game.releaseDate)} · slug:{" "}
                <code>{preview.game.slug}</code>
              </p>
              <button
                type="button"
                onClick={add}
                disabled={saving}
                className="mt-4 inline-flex items-center justify-center rounded-full bg-[var(--signal-strong)] px-6 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] disabled:opacity-50"
              >
                {saving ? "Добавляю…" : "Добавить в блок"}
              </button>
            </div>
          </div>

          {/* Prices per edition/region */}
          <div className="mt-5 space-y-5">
            {preview.priced.editions.map((ed) => (
              <div key={ed.name}>
                <p className="mb-2 text-sm font-bold text-[var(--ink)]">{ed.name}</p>
                {ed.regions.length === 0 ? (
                  <p className="text-sm text-[var(--text-muted)]">
                    Нет подходящих номиналов карт — цена не рассчитана.
                  </p>
                ) : (
                  <div className="overflow-hidden rounded-[12px] border border-[var(--line)]">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-[var(--paper-strong)] text-left text-xs uppercase tracking-wide text-[var(--text-muted)]">
                          <th className="px-3 py-2 font-bold">Регион</th>
                          <th className="px-3 py-2 font-bold">В магазине</th>
                          <th className="px-3 py-2 font-bold">Цена в рублях</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ed.regions.map((r) => (
                          <tr
                            key={r.region}
                            className={`border-t border-[var(--line)] ${r.best ? "bg-[var(--signal)]/15" : ""}`}
                          >
                            <td className="px-3 py-2 font-semibold text-[var(--ink)]">
                              {r.regionLabel}
                              {r.best && (
                                <span className="ml-2 rounded-[6px] bg-[var(--signal)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--ink)]">
                                  лучшая
                                </span>
                              )}
                            </td>
                            <td className="px-3 py-2 text-[var(--text-muted)]">{r.localPriceLabel}</td>
                            <td className="px-3 py-2 font-bold text-[var(--ink)]">
                              {formatRubles(r.rubleMinor)}
                              {r.savingsPct > 0 && (
                                <span className="ml-2 text-xs font-semibold text-[var(--text-muted)]">
                                  −{r.savingsPct}%
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Existing games */}
      <section>
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-bold text-[var(--ink)]">
            Добавленные игры{games.length > 0 ? ` (${games.length})` : ""}
          </h2>
          {games.length > 0 && (
            <button
              type="button"
              onClick={resync}
              disabled={resyncing}
              className="inline-flex items-center rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)] disabled:opacity-50"
            >
              {resyncing ? "Обновляю…" : "Обновить давние (6)"}
            </button>
          )}
        </div>
        <p className="mb-3 text-xs leading-5 text-[var(--text-muted)]">
          Обновляются 6 самых давно проверенных игр за раз, с паузами между
          запросами — чтобы не перегружать PlayStation Store. Остальные обновляются
          автоматически по расписанию.
        </p>
        {games.length === 0 ? (
          <p className="text-sm text-[var(--text-muted)]">
            Пока нет игр, добавленных через админку. На главной показываются встроенные игры.
          </p>
        ) : (
          <ul className="space-y-2.5">
            {games.map((g) => (
              <li
                key={g.slug}
                className="flex items-center gap-3 rounded-[14px] border border-[var(--line)] bg-[var(--paper-strong)] p-2.5"
              >
                <div className="relative h-12 w-20 shrink-0 overflow-hidden rounded-[8px] bg-black/10">
                  <Image src={g.cover} alt="" fill sizes="80px" className="object-cover" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-[var(--ink)]">{g.title}</p>
                  <p className="text-xs text-[var(--text-muted)]">
                    {formatDate(g.releaseDate)} · {g.editions.length} изд.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(g.slug)}
                  className="shrink-0 rounded-full border border-[var(--line-strong)] px-4 py-2 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--coral)] hover:text-[var(--coral)]"
                >
                  Удалить
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
