"use client";

import { useState } from "react";
import {
  calculateRubMinor,
  formatRubRate,
  formatRubles,
  parseRubRateToMinorPerUnit,
  type RegionPricingRate,
} from "@/lib/pricing/rates";

const REGION_LABELS: Record<string, string> = {
  IN: "Индия",
  TR: "Турция",
};

const PREVIEW_AMOUNT = 1000;

type RowState = {
  region: string;
  currency: string;
  input: string;
  saving: boolean;
  message: { kind: "success" | "error"; text: string } | null;
};

function previewFor(input: string): string | null {
  try {
    const minorPerUnit = parseRubRateToMinorPerUnit(input);
    return formatRubles(calculateRubMinor(PREVIEW_AMOUNT, minorPerUnit));
  } catch {
    return null;
  }
}

function toRows(rates: RegionPricingRate[]): RowState[] {
  return rates.map((rate) => ({
    region: rate.region,
    currency: rate.currency,
    input: formatRubRate(rate.rubMinorPerUnit),
    saving: false,
    message: null,
  }));
}

export default function AdminPricingRatesForm({
  initialRates,
}: {
  initialRates: RegionPricingRate[];
}) {
  const [rows, setRows] = useState<RowState[]>(() => toRows(initialRates));

  function updateRow(region: string, patch: Partial<RowState>) {
    setRows((current) =>
      current.map((row) =>
        row.region === region ? { ...row, ...patch } : row,
      ),
    );
  }

  async function save(row: RowState) {
    updateRow(row.region, { saving: true, message: null });
    try {
      const response = await fetch("/api/admin/pricing-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: row.region, rate: row.input }),
      });
      if (response.status === 401 || response.status === 403) {
        updateRow(row.region, {
          saving: false,
          message: {
            kind: "error",
            text: "Сессия истекла или нет доступа. Обновите страницу.",
          },
        });
        return;
      }
      const data = (await response.json()) as {
        rate?: RegionPricingRate;
        error?: string;
      };
      if (!response.ok || !data.rate) {
        throw new Error(data.error ?? "Не удалось сохранить");
      }
      updateRow(row.region, {
        input: formatRubRate(data.rate.rubMinorPerUnit),
        saving: false,
        message: { kind: "success", text: "Сохранено" },
      });
    } catch (error) {
      updateRow(row.region, {
        saving: false,
        message: {
          kind: "error",
          text: error instanceof Error ? error.message : "Ошибка сохранения",
        },
      });
    }
  }

  return (
    <div className="mt-8 grid gap-4">
      {rows.map((row) => {
        const preview = previewFor(row.input);
        return (
          <section
            key={row.region}
            className="rounded-[18px] border border-[var(--line-strong)] bg-[var(--card-surface)] p-5"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--ink)]">
                {REGION_LABELS[row.region] ?? row.region}
              </h2>
              <span className="rounded-[9px] bg-[var(--ink)] px-3 py-1 text-xs font-extrabold text-[var(--signal)]">
                {row.currency}
              </span>
            </div>

            <label className="mt-4 block text-sm font-bold text-[var(--text-muted)]">
              ₽ за 1 {row.currency}
            </label>
            <input
              inputMode="decimal"
              value={row.input}
              onChange={(event) =>
                updateRow(row.region, {
                  input: event.target.value,
                  message: null,
                })
              }
              className="mt-2 w-40 rounded-[12px] border border-[var(--line-strong)] bg-[var(--paper-strong)] px-3 py-2 text-lg font-bold text-[var(--ink)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--signal-strong)]"
            />

            <p className="mt-3 text-sm text-[var(--text-muted)]">
              Превью:{" "}
              <span className="font-bold text-[var(--ink)]">
                {PREVIEW_AMOUNT} {row.currency} = {preview ?? "—"}
              </span>
            </p>

            <div className="mt-4 flex items-center gap-3">
              <button
                type="button"
                disabled={row.saving || preview === null}
                onClick={() => void save(row)}
                className="rounded-[12px] bg-[var(--signal)] px-5 py-2.5 font-extrabold text-[var(--ink)] transition hover:bg-[var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-55"
              >
                {row.saving ? "Сохранение…" : "Сохранить"}
              </button>
              {row.message && (
                <span
                  className={
                    row.message.kind === "success"
                      ? "text-sm font-bold text-green-600"
                      : "text-sm font-bold text-red-600"
                  }
                >
                  {row.message.text}
                </span>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
