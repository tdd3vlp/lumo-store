"use client";

import { useState } from "react";

const INPUT =
  "mt-1 block w-full rounded-[12px] border border-[var(--line-strong)] bg-white px-3.5 py-2.5 text-[var(--ink)] outline-none transition focus:border-[var(--ink)]";

const EMPTY = { name: "", contact: "", message: "", company: "" };

export default function SupportForm() {
  const [form, setForm] = useState(EMPTY);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setSent(true);
      setForm(EMPTY);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6">
        <p className="text-lg font-bold text-[var(--ink)]">
          Сообщение отправлено
        </p>
        <p className="mt-2 text-sm leading-6 text-[var(--text-muted)]">
          Мы ответим на указанный контакт в рабочее время (с 10:00 до 22:00
          МСК).
        </p>
        <button
          type="button"
          onClick={() => setSent(false)}
          className="mt-4 inline-flex rounded-full border border-[var(--line-strong)] px-5 py-2.5 text-sm font-bold text-[var(--ink)] transition hover:border-[var(--ink)]"
        >
          Написать ещё
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={submit}
      className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-strong)] p-6"
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-semibold text-[var(--ink)]">Имя</span>
          <input
            type="text"
            value={form.name}
            onChange={(e) => set("name", e.target.value)}
            placeholder="Как к вам обращаться"
            className={INPUT}
          />
        </label>
        <label className="block text-sm">
          <span className="font-semibold text-[var(--ink)]">
            Контакт для ответа <span className="text-[var(--coral)]">*</span>
          </span>
          <input
            type="text"
            required
            value={form.contact}
            onChange={(e) => set("contact", e.target.value)}
            placeholder="Почта или @телеграм"
            className={INPUT}
          />
        </label>
      </div>

      <label className="mt-4 block text-sm">
        <span className="font-semibold text-[var(--ink)]">
          Сообщение <span className="text-[var(--coral)]">*</span>
        </span>
        <textarea
          required
          rows={5}
          value={form.message}
          onChange={(e) => set("message", e.target.value)}
          placeholder="Детально опишите проблему или ваш вопрос"
          className={`${INPUT} resize-y`}
        />
      </label>

      {/* Honeypot — hidden from users, catches bots. */}
      <input
        type="text"
        tabIndex={-1}
        autoComplete="off"
        value={form.company}
        onChange={(e) => set("company", e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      {error && (
        <p className="mt-4 rounded-[12px] border border-[var(--coral)]/40 bg-[var(--coral)]/10 px-4 py-3 text-sm font-semibold text-[var(--coral)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={sending}
        className="mt-5 inline-flex items-center justify-center rounded-full bg-[var(--ink)] px-7 py-3 text-sm font-extrabold text-white transition hover:bg-[var(--ink)]/90 disabled:opacity-50"
      >
        {sending ? "Отправляю…" : "Написать в поддержку"}
      </button>
    </form>
  );
}
