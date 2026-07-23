"use client";

import { useState } from "react";
import {
  PS_ACCOUNT_REGION_META,
  PS_ACCOUNT_REGION_ORDER,
} from "@/lib/ps-accounts/config";

const INPUT_CLASS =
  "mt-1 block w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)] outline-none focus:border-[var(--ink)]";

const EMPTY = { region: PS_ACCOUNT_REGION_ORDER[0], email: "", password: "", totp: "", birthdate: "" };

export default function PsAccountsManager({
  initialCounts,
}: {
  initialCounts: Record<string, number>;
}) {
  const [counts, setCounts] = useState(initialCounts);
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setNotice(null);
    try {
      const res = await fetch("/api/admin/ps-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setCounts(d.counts ?? counts);
      setForm((f) => ({ ...EMPTY, region: f.region }));
      setNotice("Аккаунт добавлен в склад.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-8 space-y-8">
      {/* Stock per region */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">Склад аккаунтов</h2>
        <div className="flex flex-wrap gap-2.5">
          {PS_ACCOUNT_REGION_ORDER.map((r) => (
            <span
              key={r}
              className="inline-flex items-center gap-2 rounded-[12px] border border-[var(--line)] bg-[var(--paper-strong)] px-3.5 py-2 text-sm font-semibold text-[var(--ink)]"
            >
              {PS_ACCOUNT_REGION_META[r]?.label ?? r}
              <span className={counts[r] ? "font-extrabold" : "font-extrabold text-[var(--coral)]"}>
                {counts[r] ?? 0}
              </span>
            </span>
          ))}
        </div>
      </section>

      {/* Add form */}
      <section>
        <h2 className="mb-3 text-lg font-bold text-[var(--ink)]">Добавить аккаунт</h2>
        <form
          onSubmit={submit}
          className="grid max-w-xl gap-4 rounded-[18px] border border-[var(--line)] bg-[var(--card-surface)] p-5"
        >
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Регион
            <div className="relative mt-1">
              <select
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                className="block w-full cursor-pointer appearance-none rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 pr-9 text-[var(--ink)] outline-none focus:border-[var(--ink)]"
              >
                {PS_ACCOUNT_REGION_ORDER.map((r) => (
                  <option key={r} value={r}>
                    {PS_ACCOUNT_REGION_META[r]?.label ?? r}
                  </option>
                ))}
              </select>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-muted)]"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Почта
            <input
              type="text"
              autoComplete="off"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Пароль
            <input
              type="text"
              autoComplete="off"
              value={form.password}
              onChange={(e) => set("password", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Коды 2FA
            <textarea
              rows={3}
              value={form.totp}
              onChange={(e) => set("totp", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Дата рождения
            <input
              type="text"
              autoComplete="off"
              placeholder="ДД.ММ.ГГГГ"
              value={form.birthdate}
              onChange={(e) => set("birthdate", e.target.value)}
              className={INPUT_CLASS}
            />
          </label>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="rounded-[12px] bg-[var(--signal)] px-5 py-2.5 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:opacity-50"
            >
              {saving ? "Сохранение…" : "Добавить"}
            </button>
            {notice && <span className="text-sm font-semibold text-[#527000]">{notice}</span>}
          </div>
          <p className="text-xs text-[var(--text-muted)]">
            Данные шифруются и хранятся в БД до выдачи покупателю.
          </p>
        </form>
      </section>
    </div>
  );
}
