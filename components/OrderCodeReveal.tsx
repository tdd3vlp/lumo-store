"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import CodeRevealModal from "@/components/CodeRevealModal";
import { WARNING_VERSION } from "@/lib/audit/constants";
import {
  newEventId,
  reportEvent,
  reportEventBeacon,
} from "@/lib/audit/client-report";
import { collectSignals } from "@/lib/audit/client-signals";

type OrderCodeRevealProps = {
  orderItemId: string;
  label: string;
  guideSlug: string | null;
};

export default function OrderCodeReveal({
  orderItemId,
  label,
  guideSlug,
}: OrderCodeRevealProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [copied, setCopied] = useState(false);
  const reportedOpen = useRef(false);
  const reportedClosed = useRef(false);

  // Fire CODE_PAGE_OPENED once, and PAGE_CLOSED exactly once when the page is
  // first hidden/unloaded — visibilitychange fires on every tab switch and both
  // listeners fire on close, so a ref guards against multiplying the event, and
  // a stable clientEventId dedupes server-side as a backstop.
  useEffect(() => {
    if (!reportedOpen.current) {
      reportedOpen.current = true;
      void reportEvent("CODE_PAGE_OPENED", orderItemId);
    }
    function reportClosedOnce() {
      if (reportedClosed.current) return;
      reportedClosed.current = true;
      reportEventBeacon("PAGE_CLOSED", orderItemId, `closed:${orderItemId}`);
    }
    function onVisibility() {
      if (document.visibilityState === "hidden") reportClosedOnce();
    }
    window.addEventListener("pagehide", reportClosedOnce);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", reportClosedOnce);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [orderItemId]);

  const onReveal = useCallback(async () => {
    // Guard against double-submit: the button is disabled while loading.
    setLoading(true);
    setError(null);
    try {
      const signals = await collectSignals();
      const res = await fetch("/api/account/orders/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItemId,
          acceptedWarning: true,
          warningVersion: WARNING_VERSION,
          clientEventId: newEventId(),
          signals,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Не удалось получить код");
      setCodes(Array.isArray(d.codes) ? d.codes : []);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось получить код");
    } finally {
      setLoading(false);
    }
  }, [orderItemId]);

  const onCopy = useCallback(async () => {
    if (!codes || codes.length === 0) return;
    try {
      await navigator.clipboard.writeText(codes.join("\n"));
      setCopied(true);
      void reportEvent("CODE_COPIED", orderItemId);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError("Не удалось скопировать код.");
    }
  }, [codes, orderItemId]);

  const guideLink = guideSlug ? (
    <Link
      href={`/instructions/${guideSlug}`}
      className="inline-flex items-center gap-1 rounded-full border border-[var(--line-strong)] px-3 py-1 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--ink)]/40"
    >
      Инструкция по активации
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        className="h-3.5 w-3.5"
        aria-hidden="true"
      >
        <path d="M9 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  ) : null;

  return (
    <div>
      <p className="text-sm font-semibold text-[var(--ink)]">{label}</p>

      {codes === null ? (
        <div className="mt-1.5 flex flex-col items-start gap-2">
          <button
            type="button"
            onClick={() => {
              setError(null);
              setOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-[12px] bg-[var(--signal)] px-4 py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M12 4.5C7 4.5 3 12 3 12s4 7.5 9 7.5S21 12 21 12s-4-7.5-9-7.5Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="12" cy="12" r="2.6" />
            </svg>
            Получить код
          </button>
          {guideLink}
        </div>
      ) : (
        <div className="mt-1.5">
          <div className="flex flex-wrap gap-2">
            {codes.map((code, i) => (
              <code
                key={`${orderItemId}-${i}`}
                className="select-all rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 font-mono text-sm font-bold tracking-wide text-[var(--ink)]"
              >
                {code}
              </code>
            ))}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={onCopy}
              className="inline-flex items-center gap-2 rounded-full border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--ink)] transition hover:border-[var(--ink)]/40"
            >
              {copied ? "Скопировано" : "Скопировать код"}
            </button>
            {guideLink}
          </div>
        </div>
      )}

      {open && (
        <CodeRevealModal
          open={open}
          onOpenChange={setOpen}
          onReveal={onReveal}
          loading={loading}
          error={error}
        />
      )}
    </div>
  );
}
