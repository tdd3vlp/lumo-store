"use client";

import { Fragment, useMemo, useState } from "react";
import type { DigitalAccessLogRow } from "@/lib/audit/types";

const EVENT_LABELS: Record<string, string> = {
  ORDER_PAID: "Заказ оплачен",
  CODE_PAGE_OPENED: "Открыта страница кода",
  WARNING_ACCEPTED: "Приняты условия",
  CODE_REVEALED: "Код показан",
  CODE_COPIED: "Код скопирован",
  CODE_REOPENED: "Повторный показ",
  PAGE_CLOSED: "Страница закрыта",
};

// Minimal, dependency-free UA parsing — good enough for the dispute view.
function parseBrowser(ua: string | null): string {
  if (!ua) return "—";
  const m =
    /(Edg|OPR|Chrome|Firefox|Safari)\/?([\d.]+)?/.exec(
      ua.replace("Edge", "Edg"),
    ) ?? null;
  if (!m) return "—";
  const name =
    m[1] === "Edg" ? "Edge" : m[1] === "OPR" ? "Opera" : m[1];
  const major = m[2]?.split(".")[0] ?? "";
  return major ? `${name} ${major}` : name;
}

function parseOs(ua: string | null): string {
  if (!ua) return "—";
  if (/Windows NT 10/.test(ua)) return "Windows 10/11";
  if (/Windows/.test(ua)) return "Windows";
  if (/iPhone|iPad|iPod/.test(ua)) return "iOS";
  if (/Mac OS X/.test(ua)) return "macOS";
  if (/Android/.test(ua)) return "Android";
  if (/Linux/.test(ua)) return "Linux";
  return "—";
}

function parseDevice(ua: string | null): string {
  if (!ua) return "—";
  if (/iPad/.test(ua)) return "Планшет";
  if (/Mobile|iPhone|Android.*Mobile/.test(ua)) return "Телефон";
  return "Компьютер";
}

function fmtUtc(iso: string): { date: string; time: string } {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${pad(d.getUTCDate())}.${pad(d.getUTCMonth() + 1)}.${d.getUTCFullYear()}`,
    time: `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} UTC`,
  };
}

const CELL = "px-3 py-2 align-top";
const HEAD = "px-3 py-2 text-left font-bold";
const COLS = 11;

function Field({
  label,
  value,
}: {
  label: string;
  value: string | number | null | undefined;
}) {
  const shown =
    value === null || value === undefined || value === "" ? "—" : String(value);
  return (
    <div className="min-w-0">
      <div className="text-[10px] font-bold uppercase tracking-wide text-[var(--text-muted)]">
        {label}
      </div>
      <div className="break-all font-mono text-[var(--ink)]">{shown}</div>
    </div>
  );
}

/** Build the query string shared by refresh + export from the current filter. */
function filterParams(orderFilter: string): string {
  const q = orderFilter.trim();
  return q ? `orderPublicId=${encodeURIComponent(q)}` : "";
}

export default function DigitalAccessHistory({
  initialRows,
}: {
  initialRows: DigitalAccessLogRow[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [orderFilter, setOrderFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtered = useMemo(() => {
    const q = orderFilter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.orderPublicId ?? "").toLowerCase().includes(q),
    );
  }, [rows, orderFilter]);

  async function refresh() {
    setRefreshing(true);
    setNotice(null);
    try {
      const qs = filterParams(orderFilter);
      const res = await fetch(
        `/api/admin/digital-access${qs ? `?${qs}` : ""}`,
        { cache: "no-store" },
      );
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? "Ошибка");
      setRows(Array.isArray(d.rows) ? d.rows : []);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setRefreshing(false);
    }
  }

  const exportQs = filterParams(orderFilter);
  const exportHref = `/api/admin/digital-access?format=json${exportQs ? `&${exportQs}` : ""}`;

  return (
    <div className="mt-8 space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="text"
          value={orderFilter}
          onChange={(e) => setOrderFilter(e.target.value)}
          placeholder="Фильтр по номеру заказа"
          className="rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
        />
        <button
          type="button"
          onClick={refresh}
          disabled={refreshing}
          className="rounded-[12px] border border-[var(--line-strong)] px-4 py-2 text-sm font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)] disabled:opacity-50"
        >
          {refreshing ? "Обновление…" : "Обновить"}
        </button>
        <a
          href={exportHref}
          className="rounded-[12px] bg-[var(--signal)] px-4 py-2 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
        >
          Экспорт в JSON{exportQs ? " (по фильтру)" : ""}
        </a>
        <span className="text-sm text-[var(--text-muted)]">
          Событий: {filtered.length}
        </span>
        {notice && (
          <span className="text-sm font-semibold text-[var(--coral)]">
            {notice}
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-[18px] border border-[var(--line-strong)]">
        <table className="min-w-[1100px] border-collapse text-xs text-[var(--ink)]">
          <thead className="bg-[var(--paper-strong)] text-[var(--text-muted)]">
            <tr>
              <th className={HEAD} aria-label="Развернуть" />
              <th className={HEAD}>Событие</th>
              <th className={HEAD}>Дата</th>
              <th className={HEAD}>Время</th>
              <th className={HEAD}>Заказ</th>
              <th className={HEAD}>IP</th>
              <th className={HEAD}>Браузер</th>
              <th className={HEAD}>ОС</th>
              <th className={HEAD}>Устройство</th>
              <th className={HEAD}>Fingerprint</th>
              <th className={HEAD}>Session ID</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const { date, time } = fmtUtc(r.occurredAt);
              const isOpen = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr
                    onClick={() => toggle(r.id)}
                    className="cursor-pointer border-t border-[var(--line)] odd:bg-white even:bg-[var(--paper)]/40 hover:bg-[var(--signal-soft)]/40"
                  >
                    <td className={`${CELL} select-none text-[var(--text-muted)]`}>
                      {isOpen ? "▾" : "▸"}
                    </td>
                    <td className={`${CELL} font-bold`}>
                      {EVENT_LABELS[r.eventType] ?? r.eventType}
                    </td>
                    <td className={CELL}>{date}</td>
                    <td className={`${CELL} whitespace-nowrap`}>{time}</td>
                    <td className={CELL}>{r.orderPublicId ?? "—"}</td>
                    <td className={`${CELL} font-mono`}>{r.ip ?? "—"}</td>
                    <td className={CELL}>{parseBrowser(r.userAgent)}</td>
                    <td className={CELL}>{parseOs(r.userAgent)}</td>
                    <td className={CELL}>{parseDevice(r.userAgent)}</td>
                    <td className={`${CELL} font-mono`} title={r.browserFingerprint ?? ""}>
                      {r.browserFingerprint
                        ? `${r.browserFingerprint.slice(0, 12)}…`
                        : "—"}
                    </td>
                    <td className={`${CELL} font-mono`} title={r.sessionId ?? ""}>
                      {r.sessionId ? `${r.sessionId.slice(0, 12)}…` : "—"}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-[var(--line)] bg-[var(--paper)]/60">
                      <td className={CELL} />
                      <td className={CELL} colSpan={COLS - 1}>
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-4">
                          <Field label="Часовой пояс" value={r.timezone} />
                          <Field label="Разрешение экрана" value={r.screenResolution} />
                          <Field label="Платформа" value={r.platform} />
                          <Field label="Память (GB)" value={r.deviceMemory} />
                          <Field label="Ядра CPU" value={r.hardwareConcurrency} />
                          <Field label="Версия предупреждения" value={r.warningVersion} />
                          <Field label="Accept-Language" value={r.acceptLanguage} />
                          <Field label="Referer" value={r.referer} />
                          <Field label="Код (code_id)" value={r.codeId} />
                          <Field label="User-Agent" value={r.userAgent} />
                          <Field label="Fingerprint" value={r.browserFingerprint} />
                          <Field label="Session ID" value={r.sessionId} />
                          <Field
                            label="Payload"
                            value={r.payload ? JSON.stringify(r.payload) : null}
                          />
                          <Field label="row_hash" value={r.rowHash} />
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td className={`${CELL} text-[var(--text-muted)]`} colSpan={COLS}>
                  Событий пока нет.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
