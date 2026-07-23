"use client";

import type React from "react";
import { useCallback, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

type AuthModalProps = {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
};

const providers = [
  {
    id: "vk",
    label: "Войти через VK ID",
    className: "border-[#0077ff] bg-[#0077ff] text-white hover:bg-[#0b6fe8]",
    icon: <span className="font-[Arial] text-xl font-black tracking-[-0.08em]">vk</span>,
  },
  {
    id: "yandex",
    label: "Войти через Яндекс ID",
    className: "border-[#232323] bg-[#232323] text-white hover:bg-[#111111]",
    icon: (
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#fc3f1d] font-[Arial] text-lg font-black leading-none text-white">
        Я
      </span>
    ),
  },
];

function CloseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      className="h-5 w-5"
      aria-hidden="true"
    >
      <path d="M6 6l12 12" strokeLinecap="round" />
      <path d="M18 6 6 18" strokeLinecap="round" />
    </svg>
  );
}

export default function AuthModal({
  open,
  onOpenChange,
  trigger,
}: AuthModalProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = open ?? internalOpen;

  const setOpen = useCallback(
    (nextOpen: boolean) => {
      onOpenChange?.(nextOpen);
      if (open === undefined) setInternalOpen(nextOpen);
    },
    [onOpenChange, open],
  );

  useEffect(() => {
    if (!isOpen) return;
    const prevOverflow = document.body.style.overflow;
    const prevPaddingRight = document.body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = prevOverflow;
      document.body.style.paddingRight = prevPaddingRight;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, setOpen]);

  return (
    <>
      {trigger && (
        <button type="button" onClick={() => setOpen(true)} className="contents">
          {trigger}
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center px-4 py-6">
          <button
            type="button"
            aria-label="Закрыть вход"
            className="absolute inset-0 bg-[var(--ink)]/62 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-modal-title"
            className="relative w-full max-w-[640px] rounded-[30px] border border-white/70 bg-[var(--paper-strong)] p-6 shadow-[0_28px_90px_rgba(0,0,0,0.30)] sm:p-8 md:p-10"
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--paper)] text-[var(--text-muted)] transition hover:bg-[var(--signal-soft)] hover:text-[var(--ink)] sm:right-7 sm:top-7 sm:h-14 sm:w-14"
              aria-label="Закрыть"
            >
              <CloseIcon />
            </button>

            <h2
              id="auth-modal-title"
              className="pr-14 text-4xl font-black tracking-[-0.055em] text-[var(--ink)] sm:text-5xl"
            >
              Авторизация
            </h2>
            <p className="mt-5 max-w-[520px] text-base leading-7 text-[var(--text-muted)] sm:text-xl sm:leading-8">
              Авторизуйтесь на сайте, чтобы мы могли сохранять ваши покупки,
              начислять бонусы и оповещать о скидках.
            </p>

            <div className="mt-8 grid gap-3 sm:mt-9">
              {providers.map((provider) => (
                <button
                  key={provider.id}
                  type="button"
                  onClick={() =>
                    void signIn(provider.id, {
                      redirectTo: window.location.href,
                    })
                  }
                  className={`grid h-16 grid-cols-[72px_1fr_72px] items-center rounded-[18px] border px-2 text-lg font-semibold shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)] sm:h-[72px] sm:text-2xl ${provider.className}`}
                  aria-label={provider.label}
                >
                  <span className="flex items-center justify-center">
                    {provider.icon}
                  </span>
                  <span className="text-center">{provider.label}</span>
                  <span aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>
        </div>
      )}
    </>
  );
}
