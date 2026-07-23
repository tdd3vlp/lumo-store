"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FaTelegram } from "react-icons/fa6";
import AuthModal from "@/components/AuthModal";
import { formatRubles } from "@/lib/pricing/rates";
import type { PricedDenomination } from "@/lib/products/telegram-stars-quote";
import {
  formatStars,
  isValidTelegramUsername,
  normalizeTelegramUsername,
} from "@/lib/products/telegram-stars";

type CheckResult = { valid: boolean; exists: boolean | null; error: string | null };

function ArrowRightIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function SpinnerIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4 animate-spin" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2.5" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="h-4 w-4" aria-hidden="true">
      <path d="M5 13l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 21.4 6.1 20.5l1.2-6.5L2.5 9.4l6.6-.9L12 2.5Z" />
    </svg>
  );
}

const FIELD_CLASS =
  "mt-1.5 w-full rounded-[14px] border border-white/15 bg-white/[0.06] px-4 py-3 text-white outline-none transition placeholder:text-white/35 focus:border-[var(--signal)]";
const LABEL_CLASS = "text-xs font-bold uppercase tracking-wide text-white/50";

export default function TelegramStars({
  denominations,
  authed,
}: {
  denominations: PricedDenomination[];
  authed: boolean;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [stars, setStars] = useState<number | null>(null);
  const [result, setResult] = useState<{ key: string; data: CheckResult } | null>(null);
  const [authOpen, setAuthOpen] = useState(false);

  const normalized = normalizeTelegramUsername(username);
  const formatValid = isValidTelegramUsername(username);
  const selected = denominations.find((d) => d.stars === stars) ?? null;

  // Live existence check against t.me (debounced), tagged with its request key
  // so a stale answer is ignored. Only runs once the format is valid.
  useEffect(() => {
    if (!formatValid) return;
    const key = normalized;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/telegram/check-username", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: normalized }),
          signal: controller.signal,
        });
        const data = (await res.json()) as CheckResult;
        setResult({ key, data });
      } catch {
        if (controller.signal.aborted) return;
        setResult({ key, data: { valid: true, exists: null, error: null } });
      }
    }, 500);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [normalized, formatValid]);

  const shown = formatValid && result?.key === normalized ? result.data : null;
  const status: "idle" | "invalid" | "checking" | "found" | "not_found" | "unknown" =
    username.trim() === ""
      ? "idle"
      : !formatValid
        ? "invalid"
        : shown
          ? shown.exists === true
            ? "found"
            : shown.exists === false
              ? "not_found"
              : "unknown"
          : "checking";

  // Existence is advisory (best-effort), so a valid format + a chosen package is
  // enough to proceed — NS.gifts validates the recipient at fulfilment.
  const ready = formatValid && selected != null;

  function submit() {
    if (!ready || !selected) return;
    // Purchases require a signed-in profile so the order lands in the buyer's
    // history and we can track it. Not signed in → open login instead.
    if (!authed) {
      setAuthOpen(true);
      return;
    }
    const params = new URLSearchParams({ username: normalized, stars: String(selected.stars) });
    router.push(`/telegram/checkout?${params.toString()}`);
  }

  return (
    <div>
      <div
        className="relative overflow-hidden rounded-[28px] px-6 py-8 text-white md:px-10"
        style={{ background: "linear-gradient(135deg, #2f3aa8 0%, #4b2ea8 55%, #7b3fbf 100%)" }}
      >
        <div className="relative grid items-center gap-6 md:grid-cols-[1.5fr_1fr] md:gap-8">
          {/* Left: header + form */}
          <div>
            <p className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.2em] text-white/70">
              <FaTelegram className="h-4 w-4" />
              Telegram
            </p>
            <h1 className="mt-2 font-[family-name:var(--font-unbounded)] text-4xl font-bold leading-[1.02] tracking-[-0.04em] md:text-5xl">
              Telegram Stars
            </h1>
            <p className="mt-3 max-w-md text-sm leading-6 text-white/70 md:text-base">
              Введите username получателя и выберите пакет — звёзды придут на его аккаунт.
            </p>

            {/* Recipient username */}
            <div className="mt-6 max-w-sm">
              <label htmlFor="tg-username" className={LABEL_CLASS}>
                Username получателя
              </label>
              <input
                id="tg-username"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="@username"
                className={FIELD_CLASS}
              />
              <div className="mt-2 min-h-5 text-sm" aria-live="polite">
                {status === "invalid" && (
                  <span className="text-white/50">Латиница, цифры и «_», 5–32 символа.</span>
                )}
                {status === "checking" && (
                  <span className="inline-flex items-center gap-2 text-white/60">
                    <SpinnerIcon /> Проверяем аккаунт…
                  </span>
                )}
                {status === "found" && (
                  <span className="inline-flex items-center gap-2 font-semibold text-[var(--signal)]">
                    <CheckIcon /> Аккаунт найден
                  </span>
                )}
                {status === "not_found" && (
                  <span className="text-amber-300">
                    Не нашли такой аккаунт — проверьте username.
                  </span>
                )}
              </div>
            </div>

            {/* Star packages */}
            <div className="mt-4">
              <p className={LABEL_CLASS}>Количество звёзд</p>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
                {denominations.map((d) => {
                  const active = stars === d.stars;
                  return (
                    <button
                      key={d.stars}
                      type="button"
                      onClick={() => setStars(d.stars)}
                      aria-pressed={active}
                      className={`flex flex-col items-center gap-0.5 rounded-[14px] border px-3 py-2.5 transition ${
                        active
                          ? "border-transparent bg-[var(--signal)] text-[var(--ink)]"
                          : "border-white/15 bg-white/[0.06] text-white hover:border-white/40"
                      }`}
                    >
                      <span className="inline-flex items-center gap-1 text-sm font-bold">
                        <StarIcon className={`h-3.5 w-3.5 ${active ? "text-[var(--ink)]" : "text-amber-300"}`} />
                        {formatStars(d.stars)}
                      </span>
                      <span className={`text-xs font-semibold ${active ? "text-[var(--ink)]/70" : "text-white/50"}`}>
                        {formatRubles(d.priceMinor)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className={LABEL_CLASS}>Итого к оплате</p>
                <p className="font-[family-name:var(--font-unbounded)] text-2xl font-bold tracking-[-0.03em] text-white">
                  {selected ? formatRubles(selected.priceMinor) : "—"}
                </p>
              </div>

              <button
                type="button"
                onClick={submit}
                disabled={!ready}
                className="inline-flex items-center justify-center gap-2 rounded-full bg-[var(--signal-strong)] px-6 py-3.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal)] disabled:cursor-not-allowed disabled:bg-white/10 disabled:text-white/40"
              >
                {authed ? "Купить" : "Войти для покупки"}
                <ArrowRightIcon />
              </button>
            </div>

            {!authed && (
              <p className="mt-3 text-xs text-white/60">
                Покупка доступна после входа в профиль — так у вас сохранится история заказов.
              </p>
            )}
          </div>

          {/* Right: big cover, lifted with a glow — mirrors the Steam block. */}
          <div className="relative hidden items-center justify-center md:flex">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-1/2 h-[300px] w-[300px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--signal)] opacity-20 blur-[90px]"
            />
            <div
              className="relative -my-4 h-[340px] w-[255px]"
              style={{ transform: "rotate(-6deg)", filter: "drop-shadow(0 22px 44px rgba(0,0,0,0.5))" }}
            >
              <Image src="/banners/telegram-stars.png" alt="Telegram Stars" fill sizes="255px" className="object-contain" priority />
            </div>
          </div>
        </div>
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} />
    </div>
  );
}
