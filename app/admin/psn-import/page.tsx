"use client";

import { useEffect, useRef, useState } from "react";
import Header from "@/components/Header";
import { ALLOWED_STORE_PREFIXES, WELL_KNOWN_COLLECTIONS } from "@/lib/psn/types";
import type { PsnRegion } from "@/lib/psn/types";

type PresetKey = "new_releases" | "preorders" | "collections";

type Job = {
  id: string;
  status: string;
  region: string;
  category_url: string;
  page_from: number;
  page_to: number;
  dry_run: boolean;
  has_staged: boolean;
  pages_fetched: number;
  products_seen: number;
  products_upserted: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
};

type CommitState = {
  stagedJobId: string;
  region: string;
  saleEndDate: string;
  collectionName: string;
};

type EventLine = {
  id: number;
  type: string;
  message: string;
  createdAt: string;
};

const STATUS_COLOR: Record<string, string> = {
  pending: "text-[var(--text-muted)]",
  running: "text-[var(--signal)]",
  done: "text-[#527000]",
  failed: "text-[var(--coral)]",
  cancelled: "text-[var(--text-muted)]",
};

const EVENT_COLOR: Record<string, string> = {
  info: "text-[var(--text-muted)]",
  page: "text-white/80",
  product: "text-[var(--signal)]",
  warning: "text-[#e0a83a]",
  error: "text-[var(--coral)]",
  done: "text-[#91ad23]",
};

const PRESETS: { key: PresetKey; label: string; fixedCollection: string | null }[] = [
  { key: "new_releases", label: "Новинки",    fixedCollection: WELL_KNOWN_COLLECTIONS.NEW_RELEASES },
  { key: "preorders",    label: "Предзаказы", fixedCollection: WELL_KNOWN_COLLECTIONS.PREORDERS },
  { key: "collections",  label: "Коллекции",  fixedCollection: null },
];

const lsUrlKey  = (key: PresetKey) => `psn_preset_${key}_url`;
const lsPgsKey  = (key: PresetKey) => `psn_preset_${key}_pages`;
const lsNameKey = (key: PresetKey) => `psn_preset_${key}_name`;

export default function PsnImportPage() {
  const [jobs, setJobs] = useState<Job[] | null>(null);
  const [authed, setAuthed] = useState<boolean | null>(null);

  // Form state
  const [region, setRegion] = useState<PsnRegion>("TR");
  const [categoryUrl, setCategoryUrl] = useState("");
  const [pageFrom, setPageFrom] = useState(1);
  const [pageTo, setPageTo] = useState(5);
  const [dryRun, setDryRun] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Commit modal
  const [commitState, setCommitState] = useState<CommitState | null>(null);
  const [committing, setCommitting] = useState(false);
  const [commitError, setCommitError] = useState<string | null>(null);
  const [presetCollectionNames, setPresetCollectionNames] = useState<Record<string, string>>({});

  // SSE log
  const [activeJobId, setActiveJobId] = useState<string | null>(null);
  const [eventLog, setEventLog] = useState<EventLine[]>([]);
  const logRef = useRef<HTMLDivElement | null>(null);
  const esRef = useRef<EventSource | null>(null);

  // Preset state (URL, pages, custom name)
  const [presetUrls,  setPresetUrls]  = useState<Record<PresetKey, string>>({
    new_releases: "", preorders: "", collections: "",
  });
  const [presetPages, setPresetPages] = useState<Record<PresetKey, number>>({
    new_releases: 3, preorders: 5, collections: 3,
  });
  const [presetNames, setPresetNames] = useState<Record<PresetKey, string>>({
    new_releases: "", preorders: "", collections: "",
  });

  useEffect(() => {
    const all: PresetKey[] = ["new_releases", "preorders", "collections"];
    setPresetUrls({
      new_releases: localStorage.getItem(lsUrlKey("new_releases")) ?? "",
      preorders:    localStorage.getItem(lsUrlKey("preorders"))    ?? "",
      collections:  localStorage.getItem(lsUrlKey("collections"))  ?? "",
    });
    setPresetPages({
      new_releases: Number(localStorage.getItem(lsPgsKey("new_releases")) ?? "3"),
      preorders:    Number(localStorage.getItem(lsPgsKey("preorders"))    ?? "5"),
      collections:  Number(localStorage.getItem(lsPgsKey("collections"))  ?? "3"),
    });
    setPresetNames(
      all.reduce((acc, key) => {
        acc[key] = localStorage.getItem(lsNameKey(key)) ?? "";
        return acc;
      }, {} as Record<PresetKey, string>),
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const LOCALE_EXAMPLE: Partial<Record<PsnRegion, string>> = {
    TR: ALLOWED_STORE_PREFIXES[0] + "category/44d8bb20-653e-431e-8ad9-4f981f71cf23/1",
    UA: ALLOWED_STORE_PREFIXES[1] + "category/44d8bb20-653e-431e-8ad9-4f981f71cf23/1",
  };

  useEffect(() => {
    fetch("/api/auth/session", { cache: "no-store" })
      .then((r) => r.json())
      .then((s: { user?: unknown }) => setAuthed(Boolean(s?.user)))
      .catch(() => setAuthed(false));
  }, []);

  const loadJobs = () => {
    fetch("/api/admin/psn-import")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((data: { jobs: Job[] }) => setJobs(data.jobs))
      .catch(() => setJobs([]));
  };

  useEffect(() => {
    if (authed) loadJobs();
  }, [authed]);

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [eventLog]);

  const connectToJob = (jobId: string) => {
    esRef.current?.close();
    setActiveJobId(jobId);
    setEventLog([]);

    const es = new EventSource(`/api/admin/psn-import/events?jobId=${jobId}`);
    esRef.current = es;

    const handle = (ev: MessageEvent, type: string) => {
      const data = JSON.parse(ev.data as string) as {
        id: number;
        message: string;
        createdAt: string;
      };
      setEventLog((prev) => [
        ...prev,
        { id: data.id, type, message: data.message, createdAt: data.createdAt },
      ]);
    };

    for (const evt of ["info", "page", "product", "warning", "error", "done"] as const) {
      es.addEventListener(evt, (ev) => handle(ev as MessageEvent, evt));
    }

    const finish = () => { es.close(); loadJobs(); };
    es.addEventListener("end", finish);
    es.addEventListener("timeout", finish);
    es.onerror = finish;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/psn-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region, categoryUrl, pageFrom, pageTo, dryRun }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) { setFormError(data.error ?? "Unknown error"); return; }
      loadJobs();
      connectToJob(data.jobId!);
    } catch (err) {
      setFormError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePresetSubmit = async (key: PresetKey) => {
    const url = presetUrls[key];
    if (!url) return;
    const preset = PRESETS.find((p) => p.key === key)!;
    const collectionName = preset.fixedCollection ?? presetNames[key];
    try {
      const res = await fetch("/api/admin/psn-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          region: "TR",
          categoryUrl: url,
          pageFrom: 1,
          pageTo: presetPages[key],
          dryRun: true,
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) return;
      setPresetCollectionNames((prev) => ({ ...prev, [data.jobId!]: collectionName }));
      loadJobs();
      connectToJob(data.jobId);
    } catch {
      // ignore — user can check logs
    }
  };

  const handleCommit = async () => {
    if (!commitState) return;
    setCommitError(null);
    setCommitting(true);
    try {
      const res = await fetch("/api/admin/psn-import/commit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stagedJobId: commitState.stagedJobId,
          saleEndDate: commitState.saleEndDate || null,
          collectionName: commitState.collectionName || null,
        }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok) { setCommitError(data.error ?? "Unknown error"); return; }
      setCommitState(null);
      loadJobs();
      connectToJob(data.jobId!);
    } catch (err) {
      setCommitError((err as Error).message);
    } finally {
      setCommitting(false);
    }
  };

  if (authed === false) {
    return (
      <>
        <Header />
        <main className="mx-auto max-w-3xl px-4 pb-36 pt-6 md:px-6">
          <div className="rounded-[18px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-6">
            <h2 className="text-xl font-bold text-[var(--ink)]">Нет доступа</h2>
            <p className="mt-2 text-sm text-[var(--text-muted)]">
              Войдите под учётной записью из ADMIN_EMAILS.
            </p>
          </div>
        </main>
      </>
    );
  }

  const inputCls = "w-full rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]";
  const labelCls = "mb-1 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]";

  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-4 pb-36 pt-6 md:px-6">
        <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
          Администрирование
        </p>
        <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.04em] text-[var(--ink)] md:text-4xl">
          Parse
        </h1>

        {/* 4 blocks, 2 per row, equal height */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2">

          {/* Block 1: New import */}
          <form
            onSubmit={handleSubmit}
            className="flex flex-col rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5"
          >
            <p className="mb-4 text-sm font-bold text-[var(--ink)]">Новый импорт</p>
            <div className="flex flex-1 flex-col gap-3">
              <label className="block">
                <span className={labelCls}>Регион</span>
                <div className="flex gap-2">
                  {(["TR", "UA"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => { setRegion(r); setCategoryUrl(""); }}
                      className={`rounded-[10px] px-4 py-2 text-sm font-bold transition ${
                        region === r
                          ? "bg-[var(--ink)] text-[var(--signal)]"
                          : "border border-[var(--line-strong)] text-[var(--text-muted)] hover:text-[var(--ink)]"
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </label>

              <label className="block">
                <span className={labelCls}>URL категории</span>
                <input
                  type="url"
                  required
                  value={categoryUrl}
                  onChange={(e) => setCategoryUrl(e.target.value)}
                  placeholder={LOCALE_EXAMPLE[region]}
                  className={inputCls}
                />
              </label>

              <div className="flex gap-2">
                <label className="flex-1">
                  <span className={labelCls}>С</span>
                  <input
                    type="number"
                    min={1}
                    value={pageFrom}
                    onChange={(e) => setPageFrom(Number(e.target.value))}
                    className={inputCls}
                  />
                </label>
                <label className="flex-1">
                  <span className={labelCls}>По</span>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={pageTo}
                    onChange={(e) => setPageTo(Number(e.target.value))}
                    className={inputCls}
                  />
                </label>
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 rounded-[10px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={dryRun}
                  onChange={(e) => setDryRun(e.target.checked)}
                  className="h-4 w-4 accent-[var(--signal)]"
                />
                <span className="text-sm font-bold text-[var(--ink)]">Dry-run</span>
              </label>

              {formError && (
                <p className="rounded-[10px] border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-3 py-2 text-sm text-[var(--coral)]">
                  {formError}
                </p>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="mt-auto w-full rounded-[10px] bg-[var(--signal)] py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:opacity-50"
              >
                {submitting ? "Запуск…" : dryRun ? "Dry-run" : "Import"}
              </button>
            </div>
          </form>

          {/* Blocks 2-4: Presets */}
          {PRESETS.map(({ key, label, fixedCollection }) => (
            <div
              key={key}
              className="flex flex-col rounded-[20px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5"
            >
              <p className="mb-4 text-sm font-bold text-[var(--ink)]">{label}</p>
              <div className="flex flex-1 flex-col gap-3">
                <label className="block">
                  <span className={labelCls}>URL категории PSN TR</span>
                  <input
                    type="url"
                    value={presetUrls[key]}
                    onChange={(e) => {
                      const v = e.target.value;
                      setPresetUrls((prev) => ({ ...prev, [key]: v }));
                      localStorage.setItem(lsUrlKey(key), v);
                    }}
                    placeholder={LOCALE_EXAMPLE["TR"]}
                    className={inputCls}
                  />
                </label>

                <label className="block">
                  <span className={labelCls}>Страниц</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={presetPages[key]}
                    onChange={(e) => {
                      const v = Number(e.target.value);
                      setPresetPages((prev) => ({ ...prev, [key]: v }));
                      localStorage.setItem(lsPgsKey(key), String(v));
                    }}
                    className={inputCls}
                  />
                </label>

                {fixedCollection === null && (
                  <label className="block">
                    <span className={labelCls}>Название коллекции</span>
                    <input
                      type="text"
                      value={presetNames[key]}
                      onChange={(e) => {
                        const v = e.target.value;
                        setPresetNames((prev) => ({ ...prev, [key]: v }));
                        localStorage.setItem(lsNameKey(key), v);
                      }}
                      placeholder="Лучшие игры июля"
                      className={inputCls}
                    />
                  </label>
                )}

                <button
                  type="button"
                  disabled={!presetUrls[key]}
                  onClick={() => handlePresetSubmit(key)}
                  className="mt-auto w-full rounded-[10px] bg-[var(--signal)] py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:opacity-40"
                >
                  Dry-run
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* SSE log — full width */}
        <div className="mt-6 overflow-hidden rounded-[20px] border border-[var(--line-strong)] bg-[var(--ink)]">
          <div className="flex items-center justify-between border-b border-white/12 px-5 py-3.5">
            <p className="text-sm font-bold text-white">
              {activeJobId ? "Лог задачи" : "Лог"}
            </p>
            {activeJobId && (
              <code className="font-mono text-[10px] text-white/40">
                {activeJobId.slice(0, 8)}…
              </code>
            )}
          </div>
          <div
            ref={logRef}
            className="h-[260px] overflow-y-auto p-4 font-mono text-[11px] leading-[1.6] [scrollbar-width:thin]"
          >
            {eventLog.length === 0 ? (
              <p className="text-white/30">Запустите задачу — лог появится здесь.</p>
            ) : (
              eventLog.map((ev) => (
                <div key={ev.id} className={EVENT_COLOR[ev.type] ?? "text-white/60"}>
                  <span className="text-white/25">[{ev.type.toUpperCase()}]</span>{" "}
                  {ev.message}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Commit modal */}
        {commitState && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
            <div className="w-full max-w-md rounded-[20px] border border-[var(--line-strong)] bg-[var(--paper)] p-6 shadow-xl">
              <h2 className="mb-1 text-lg font-bold text-[var(--ink)]">
                Закоммитить в БД
              </h2>
              <p className="mb-5 text-xs text-[var(--text-muted)]">
                Регион: {commitState.region} · job {commitState.stagedJobId.slice(0, 8)}…
              </p>
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Дата окончания скидки (необязательно)
                  </span>
                  <input
                    type="date"
                    value={commitState.saleEndDate}
                    onChange={(e) => setCommitState({ ...commitState, saleEndDate: e.target.value })}
                    className="w-full rounded-[12px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none focus:border-[var(--ink)]"
                  />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-bold uppercase tracking-[0.1em] text-[var(--text-muted)]">
                    Название коллекции (необязательно)
                  </span>
                  <input
                    type="text"
                    value={commitState.collectionName}
                    onChange={(e) => setCommitState({ ...commitState, collectionName: e.target.value })}
                    placeholder="Например: Лучшие игры июля"
                    className="w-full rounded-[12px] border border-[var(--line-strong)] bg-[var(--paper)] px-3 py-2.5 text-sm text-[var(--ink)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--ink)]"
                  />
                </label>
                {commitError && (
                  <p className="rounded-[10px] border border-[var(--coral)]/30 bg-[var(--coral)]/10 px-3 py-2.5 text-sm text-[var(--coral)]">
                    {commitError}
                  </p>
                )}
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => { setCommitState(null); setCommitError(null); }}
                    className="flex-1 rounded-[12px] border border-[var(--line-strong)] py-2.5 text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
                  >
                    Отмена
                  </button>
                  <button
                    type="button"
                    onClick={handleCommit}
                    disabled={committing}
                    className="flex-1 rounded-[12px] bg-[var(--signal)] py-2.5 text-sm font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:opacity-50"
                  >
                    {committing ? "Коммит…" : "Записать в БД"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Job history */}
        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-[var(--ink)]">История задач</h2>
            <button
              type="button"
              onClick={loadJobs}
              className="rounded-[10px] border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
            >
              Обновить
            </button>
          </div>

          {jobs === null ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-16 animate-pulse rounded-[14px] bg-[var(--line)]" />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <p className="text-sm text-[var(--text-muted)]">Задач пока нет.</p>
          ) : (
            <div className="divide-y divide-[var(--line)] border-y border-[var(--line)]">
              {jobs.map((job) => (
                <div key={job.id} className="flex items-center gap-4 py-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 text-sm">
                      <span className={`font-black ${STATUS_COLOR[job.status] ?? ""}`}>
                        {job.status.toUpperCase()}
                      </span>
                      {job.dry_run && (
                        <span className="rounded-[6px] bg-[var(--paper)] px-1.5 py-0.5 text-[10px] font-extrabold text-[var(--text-muted)]">
                          DRY-RUN
                        </span>
                      )}
                      <span className="font-bold text-[var(--ink)]">{job.region}</span>
                      <span className="truncate text-[var(--text-muted)]">
                        p.{job.page_from}–{job.page_to}
                      </span>
                    </div>
                    <p className="mt-0.5 truncate text-xs text-[var(--text-muted)]">
                      {job.category_url}
                    </p>
                    {job.error_message && (
                      <p className="mt-0.5 text-xs text-[var(--coral)]">{job.error_message}</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right text-xs text-[var(--text-muted)]">
                    <p>{job.products_upserted} / {job.products_seen}</p>
                    <p>{job.pages_fetched} стр.</p>
                  </div>
                  {job.dry_run && job.status === "done" && job.has_staged && (
                    <button
                      type="button"
                      onClick={() => setCommitState({
                        stagedJobId: job.id,
                        region: job.region,
                        saleEndDate: "",
                        collectionName: presetCollectionNames[job.id] ?? "",
                      })}
                      className="shrink-0 rounded-[10px] bg-[var(--signal)] px-3 py-1.5 text-xs font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)]"
                    >
                      Коммит
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => connectToJob(job.id)}
                    disabled={job.status === "pending"}
                    className="shrink-0 rounded-[10px] border border-[var(--line-strong)] px-3 py-1.5 text-xs font-bold text-[var(--text-muted)] transition hover:text-[var(--ink)] disabled:opacity-30"
                  >
                    Лог
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
