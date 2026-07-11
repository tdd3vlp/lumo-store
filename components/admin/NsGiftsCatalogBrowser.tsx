"use client";

import { useMemo, useState } from "react";
import type { CuratedDenomination } from "@/lib/gift-cards/denominations";

type NsGiftsCatalogItem = {
  serviceId: number;
  name: string;
  categoryName: string;
  price: number;
  currency: string;
  inStock: number;
};

type CurateForm = {
  serviceId: number | null;
  productType: string;
  region: string;
  currency: string;
  amountMajor: string;
  displayName: string;
  imageUrl: string;
  salePrice: string; // ₽, major units
  purchaseCost: string; // ₽, major units
  isPublished: boolean;
};

const EMPTY_FORM: CurateForm = {
  serviceId: null,
  productType: "",
  region: "GLOBAL",
  currency: "RUB",
  amountMajor: "",
  displayName: "",
  imageUrl: "",
  salePrice: "",
  purchaseCost: "",
  isPublished: true,
};

function formatRub(minor: number | null): string {
  if (minor == null) return "—";
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

function toMinor(major: string): number | undefined {
  const trimmed = major.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed.replace(",", "."));
  if (!Number.isFinite(n) || n < 0) return undefined;
  return Math.round(n * 100);
}

export default function NsGiftsCatalogBrowser({
  initialDenominations,
}: {
  initialDenominations: CuratedDenomination[];
}) {
  const [denominations, setDenominations] = useState(initialDenominations);
  const [catalog, setCatalog] = useState<NsGiftsCatalogItem[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [catalogQuery, setCatalogQuery] = useState("");

  const [form, setForm] = useState<CurateForm>(EMPTY_FORM);
  const [curateError, setCurateError] = useState<string | null>(null);
  const [curateSaving, setCurateSaving] = useState(false);
  const [curateNotice, setCurateNotice] = useState<string | null>(null);

  const [buyTarget, setBuyTarget] = useState<CuratedDenomination | null>(null);

  const productTypes = useMemo(
    () => Array.from(new Set(denominations.map((d) => d.productType))).sort(),
    [denominations],
  );

  const linkedServiceIds = useMemo(
    () => new Set(denominations.map((d) => d.nsGiftsServiceId).filter(Boolean)),
    [denominations],
  );

  const filteredCatalog = useMemo(() => {
    const q = catalogQuery.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.categoryName.toLowerCase().includes(q),
    );
  }, [catalog, catalogQuery]);

  async function refreshDenominations() {
    try {
      const res = await fetch("/api/admin/ns-gifts/curate", { cache: "no-store" });
      const data = await res.json();
      if (res.ok && Array.isArray(data.denominations)) {
        setDenominations(data.denominations);
      }
    } catch {
      // keep current list; a transient refresh failure is non-fatal
    }
  }

  async function loadCatalog() {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      const res = await fetch("/api/admin/ns-gifts/stock", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось загрузить каталог");
      setCatalog(data.items ?? []);
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : "Ошибка загрузки");
    } finally {
      setCatalogLoading(false);
    }
  }

  function prefillFromCatalog(item: NsGiftsCatalogItem) {
    setCurateError(null);
    setCurateNotice(null);
    setForm({
      ...EMPTY_FORM,
      serviceId: item.serviceId,
      displayName: item.name,
      currency: item.currency?.toUpperCase().slice(0, 3) || "RUB",
    });
    document.getElementById("curate-form")?.scrollIntoView({ behavior: "smooth" });
  }

  async function submitCurate(event: React.FormEvent) {
    event.preventDefault();
    setCurateError(null);
    setCurateNotice(null);

    const amountMajor = Number(form.amountMajor.replace(",", "."));
    if (!Number.isFinite(amountMajor) || amountMajor <= 0) {
      setCurateError("Укажите номинал (положительное число).");
      return;
    }
    const salePriceOverrideMinor = toMinor(form.salePrice);
    const purchaseCostMinor = toMinor(form.purchaseCost);

    setCurateSaving(true);
    try {
      const res = await fetch("/api/admin/ns-gifts/curate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productType: form.productType,
          region: form.region,
          currency: form.currency,
          amountMajor,
          displayName: form.displayName,
          imageUrl: form.imageUrl,
          isPublished: form.isPublished,
          nsGiftsServiceId: form.serviceId,
          salePriceOverrideMinor,
          purchaseCostMinor,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось сохранить товар");
      setCurateNotice("Товар сохранён.");
      setForm(EMPTY_FORM);
      await refreshDenominations();
    } catch (error) {
      setCurateError(error instanceof Error ? error.message : "Ошибка сохранения");
    } finally {
      setCurateSaving(false);
    }
  }

  return (
    <div className="mt-8 space-y-10">
      {/* Curated products */}
      <section>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold text-[var(--ink)]">Товары магазина</h2>
          <button
            type="button"
            onClick={refreshDenominations}
            className="rounded-[11px] border border-[var(--line-strong)] px-3 py-2 text-sm font-bold text-[var(--text-muted)] transition hover:text-[var(--ink)]"
          >
            Обновить
          </button>
        </div>

        {denominations.length === 0 ? (
          <p className="rounded-[16px] border border-[var(--line)] bg-[var(--card-surface)] p-5 text-sm text-[var(--text-muted)]">
            Пока нет ни одного товара. Загрузите каталог NS.gifts ниже и добавьте
            первую позицию.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-[16px] border border-[var(--line)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="bg-[var(--card-surface)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                <tr>
                  <th className="px-4 py-3">Товар</th>
                  <th className="px-4 py-3">Номинал</th>
                  <th className="px-4 py-3">Цена</th>
                  <th className="px-4 py-3">Склад</th>
                  <th className="px-4 py-3">Статус</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--line)]">
                {denominations.map((d) => (
                  <tr key={d.denominationId}>
                    <td className="px-4 py-3">
                      <p className="font-bold text-[var(--ink)]">
                        {d.displayName ?? "(без названия)"}
                      </p>
                      <p className="text-xs text-[var(--text-muted)]">
                        {d.productType} · {d.region}
                        {d.nsGiftsServiceId ? ` · NS #${d.nsGiftsServiceId}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[var(--text-muted)]">
                      {d.amountMajor.toLocaleString("ru-RU")} {d.currency}
                    </td>
                    <td className="px-4 py-3 font-bold text-[var(--ink)]">
                      {formatRub(d.salePriceMinor)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          d.availableCount > 0
                            ? "font-bold text-[var(--ink)]"
                            : "font-bold text-[var(--coral)]"
                        }
                      >
                        {d.availableCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {d.isPublished ? (
                        <span className="rounded-full bg-[var(--signal)] px-2.5 py-1 text-xs font-extrabold text-[var(--ink)]">
                          В продаже
                        </span>
                      ) : (
                        <span className="rounded-full border border-[var(--line-strong)] px-2.5 py-1 text-xs font-bold text-[var(--text-muted)]">
                          Черновик
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setBuyTarget(d)}
                        disabled={!d.nsGiftsServiceId}
                        title={
                          d.nsGiftsServiceId
                            ? "Купить коды у NS.gifts"
                            : "Сначала привяжите позицию NS.gifts"
                        }
                        className="rounded-[10px] bg-[var(--ink)] px-3 py-1.5 text-xs font-extrabold text-[var(--signal)] transition enabled:hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                      >
                        Пополнить
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Curate form */}
      <section id="curate-form">
        <h2 className="mb-4 text-xl font-bold text-[var(--ink)]">
          Добавить / изменить товар
        </h2>
        <form
          onSubmit={submitCurate}
          className="grid gap-4 rounded-[18px] border border-[var(--line)] bg-[var(--card-surface)] p-5 sm:grid-cols-2"
        >
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Тип (латиница)
            <input
              list="product-types"
              value={form.productType}
              onChange={(e) => setForm({ ...form, productType: e.target.value })}
              placeholder="steam"
              required
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
            <datalist id="product-types">
              {productTypes.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Название
            <input
              value={form.displayName}
              onChange={(e) => setForm({ ...form, displayName: e.target.value })}
              placeholder="Steam Wallet 500 ₽"
              required
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Регион
            <input
              value={form.region}
              onChange={(e) => setForm({ ...form, region: e.target.value })}
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Валюта номинала
            <input
              value={form.currency}
              onChange={(e) => setForm({ ...form, currency: e.target.value })}
              maxLength={3}
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 uppercase text-[var(--ink)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Номинал
            <input
              type="number"
              step="any"
              min="0"
              value={form.amountMajor}
              onChange={(e) => setForm({ ...form, amountMajor: e.target.value })}
              placeholder="500"
              required
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Цена продажи, ₽
            <input
              type="number"
              step="any"
              min="0"
              value={form.salePrice}
              onChange={(e) => setForm({ ...form, salePrice: e.target.value })}
              placeholder="590"
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)]">
            Закупка, ₽ (для маржи)
            <input
              type="number"
              step="any"
              min="0"
              value={form.purchaseCost}
              onChange={(e) => setForm({ ...form, purchaseCost: e.target.value })}
              placeholder="520"
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--text-muted)] sm:col-span-2">
            Ссылка на изображение
            <input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
              className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
          </label>
          <label className="flex items-center gap-2 text-sm font-semibold text-[var(--ink)]">
            <input
              type="checkbox"
              checked={form.isPublished}
              onChange={(e) => setForm({ ...form, isPublished: e.target.checked })}
              className="h-4 w-4"
            />
            Опубликовать в магазине
          </label>

          <div className="flex items-center gap-3 sm:col-span-2">
            <button
              type="submit"
              disabled={curateSaving}
              className="rounded-[12px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:opacity-50"
            >
              {curateSaving ? "Сохранение…" : "Сохранить товар"}
            </button>
            {form.serviceId && (
              <span className="text-xs text-[var(--text-muted)]">
                Привязка к NS.gifts #{form.serviceId}
              </span>
            )}
          </div>
          {curateError && (
            <p className="text-sm font-semibold text-[var(--coral)] sm:col-span-2">
              {curateError}
            </p>
          )}
          {curateNotice && (
            <p className="text-sm font-semibold text-[#527000] sm:col-span-2">
              {curateNotice}
            </p>
          )}
        </form>
      </section>

      {/* NS.gifts live catalog */}
      <section>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-xl font-bold text-[var(--ink)]">Каталог NS.gifts</h2>
          <button
            type="button"
            onClick={loadCatalog}
            disabled={catalogLoading}
            className="rounded-[11px] bg-[var(--ink)] px-4 py-2 text-sm font-extrabold text-[var(--signal)] transition hover:opacity-90 disabled:opacity-50"
          >
            {catalogLoading ? "Загрузка…" : "Загрузить каталог"}
          </button>
        </div>

        {catalogError && (
          <p className="mb-3 text-sm font-semibold text-[var(--coral)]">{catalogError}</p>
        )}

        {catalog.length > 0 && (
          <>
            <input
              value={catalogQuery}
              onChange={(e) => setCatalogQuery(e.target.value)}
              placeholder="Поиск по названию или категории…"
              className="mb-3 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)]"
            />
            <div className="max-h-[460px] overflow-y-auto rounded-[16px] border border-[var(--line)]">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead className="sticky top-0 bg-[var(--card-surface)] text-xs uppercase tracking-wide text-[var(--text-muted)]">
                  <tr>
                    <th className="px-4 py-3">Услуга</th>
                    <th className="px-4 py-3">Категория</th>
                    <th className="px-4 py-3">Цена</th>
                    <th className="px-4 py-3">Остаток</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--line)]">
                  {filteredCatalog.map((item) => (
                    <tr key={item.serviceId}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[var(--ink)]">{item.name}</p>
                        <p className="text-xs text-[var(--text-muted)]">
                          NS #{item.serviceId}
                          {linkedServiceIds.has(item.serviceId) ? " · уже в каталоге" : ""}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {item.categoryName}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">
                        {item.price} {item.currency}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-muted)]">{item.inStock}</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => prefillFromCatalog(item)}
                          className="rounded-[10px] border border-[var(--line-strong)] px-3 py-1.5 text-xs font-extrabold text-[var(--ink)] transition hover:border-[var(--ink)]"
                        >
                          Добавить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </section>

      {buyTarget && (
        <BuyModal
          denomination={buyTarget}
          onClose={() => setBuyTarget(null)}
          onStocked={async () => {
            await refreshDenominations();
          }}
        />
      )}
    </div>
  );
}

function BuyModal({
  denomination,
  onClose,
  onStocked,
}: {
  denomination: CuratedDenomination;
  onClose: () => void;
  onStocked: () => Promise<void>;
}) {
  const [quantity, setQuantity] = useState("1");
  const [phase, setPhase] = useState<"idle" | "created" | "paying" | "done">("idle");
  const [customId, setCustomId] = useState<string | null>(null);
  const [totalToPay, setTotalToPay] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ns-gifts/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "create",
          serviceId: denomination.nsGiftsServiceId,
          quantity: Number(quantity),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось создать заказ");
      setCustomId(data.customId);
      setTotalToPay(data.totalToPay);
      setPhase("created");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  async function pay() {
    if (!customId) return;
    setBusy(true);
    setPhase("paying");
    setError(null);
    try {
      const res = await fetch("/api/admin/ns-gifts/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: "pay",
          customId,
          serviceId: denomination.nsGiftsServiceId,
          denominationId: denomination.denominationId,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Оплата не прошла");
      setResult(
        `Добавлено ${data.inserted}/${data.total} код(ов). Остаток на балансе NS.gifts: ${data.balance}.`,
      );
      setPhase("done");
      await onStocked();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка оплаты");
      setPhase("created");
    } finally {
      setBusy(false);
    }
  }

  async function checkStatus() {
    if (!customId) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/ns-gifts/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ step: "status", customId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Не удалось получить статус");
      setResult(
        `Статус заказа ${customId}: ${data.statusMessage} (коды получены: ${data.hasPins ? "да" : "нет"}).`,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Ошибка");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Закрыть"
        onClick={onClose}
        className="absolute inset-0 bg-black/50"
      />
      <div className="relative w-full max-w-md rounded-[20px] bg-[var(--paper-strong)] p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-[var(--ink)]">
          Пополнить: {denomination.displayName}
        </h3>
        <p className="mt-1 text-sm text-[var(--text-muted)]">
          NS.gifts #{denomination.nsGiftsServiceId} · {denomination.amountMajor}{" "}
          {denomination.currency}
        </p>
        <p className="mt-3 rounded-[10px] bg-[var(--coral)]/12 px-3 py-2 text-xs font-semibold text-[var(--ink)]">
          Оплата списывает реальные деньги с баланса NS.gifts и необратима.
        </p>

        <label className="mt-4 block text-sm font-semibold text-[var(--text-muted)]">
          Количество кодов
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            disabled={phase !== "idle"}
            className="mt-1 w-full rounded-[11px] border border-[var(--line-strong)] bg-white px-3 py-2 text-[var(--ink)] disabled:opacity-60"
          />
        </label>

        {phase === "created" && totalToPay && (
          <p className="mt-4 rounded-[10px] bg-[var(--card-surface)] px-3 py-2 text-sm text-[var(--ink)]">
            К оплате у NS.gifts: <strong>{totalToPay}</strong>. Подтвердите оплату.
          </p>
        )}
        {result && (
          <p className="mt-4 text-sm font-semibold text-[#527000]">{result}</p>
        )}
        {error && <p className="mt-4 text-sm font-semibold text-[var(--coral)]">{error}</p>}

        <div className="mt-5 flex flex-wrap gap-3">
          {phase === "idle" && (
            <button
              type="button"
              onClick={create}
              disabled={busy}
              className="rounded-[12px] bg-[var(--ink)] px-5 py-3 font-extrabold text-[var(--signal)] transition hover:opacity-90 disabled:opacity-50"
            >
              {busy ? "…" : "Создать заказ"}
            </button>
          )}
          {phase === "created" && (
            <button
              type="button"
              onClick={pay}
              disabled={busy}
              className="rounded-[12px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:opacity-50"
            >
              {busy ? "Оплата…" : "Подтвердить оплату"}
            </button>
          )}
          {customId && (
            <button
              type="button"
              onClick={checkStatus}
              disabled={busy}
              className="rounded-[12px] border border-[var(--line-strong)] px-4 py-3 text-sm font-bold text-[var(--ink)] disabled:opacity-50"
            >
              Проверить статус
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="rounded-[12px] border border-[var(--line-strong)] px-4 py-3 text-sm font-bold text-[var(--text-muted)]"
          >
            {phase === "done" ? "Готово" : "Отмена"}
          </button>
        </div>
      </div>
    </div>
  );
}
