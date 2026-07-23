import Link from "next/link";
import ClearCartOnSuccess from "@/components/ClearCartOnSuccess";
import Footer from "@/components/Footer";
import Header from "@/components/Header";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

type View = {
  title: string;
  body: string;
  tone: "ok" | "wait" | "bad";
  paid: boolean;
};

const NOT_FOUND: View = {
  title: "Заказ не найден",
  body: "Не удалось найти заказ. Если деньги списаны — напишите в поддержку, мы всё проверим.",
  tone: "bad",
  paid: false,
};

// What the order delivers, derived from its line item types — the paid message
// differs (a top-up credits a balance, it has no codes or instructions).
type OrderKind = "giftcard" | "account" | "steam" | "telegram" | "generic";

function kindFromTypes(types: string[]): OrderKind {
  const set = new Set(types);
  // Cart orders may mix gift cards and accounts; top-ups are always single-line.
  if (set.has("gift_card")) return "giftcard";
  if (set.has("ps_account")) return "account";
  if (set.has("steam_topup")) return "steam";
  if (set.has("telegram_stars")) return "telegram";
  return "generic";
}

const PAID_BODY: Record<OrderKind, string> = {
  giftcard:
    "Спасибо! Заказ оплачен. Коды и инструкция придут на почту и появятся в личном кабинете.",
  account:
    "Спасибо! Заказ оплачен. Данные аккаунта появятся в личном кабинете, а на почту придёт подтверждение готовности.",
  steam:
    "Спасибо! Оплата прошла. Баланс Steam пополнится в течение нескольких минут — информация о заказе появится в личном кабинете.",
  telegram:
    "Спасибо! Оплата прошла. Звёзды будут зачислены в течение нескольких минут — информация о заказе появится в личном кабинете.",
  generic:
    "Спасибо! Заказ оплачен. Информация о заказе появится в личном кабинете.",
};

function viewFor(status: string, kind: OrderKind): View {
  switch (status) {
    case "paid":
    case "fulfilling":
    case "fulfilled":
      return {
        title: "Оплата прошла",
        body: PAID_BODY[kind],
        tone: "ok",
        paid: true,
      };
    case "manual_review":
      return {
        title: "Оплата получена",
        body: "Платёж принят и проверяется вручную — это займёт немного времени. Мы свяжемся с вами по почте.",
        tone: "wait",
        paid: true,
      };
    default:
      return {
        title: "Ожидаем подтверждение оплаты",
        body: "Если вы завершили оплату, статус обновится в течение пары минут. Обновите страницу или проверьте личный кабинет.",
        tone: "wait",
        paid: false,
      };
  }
}

export default async function CheckoutStatusPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: publicId } = await searchParams;

  let view = NOT_FOUND;
  // Only a basket-based order should clear the client cart. Steam / Telegram
  // top-ups are bought straight from their own page and never touch the cart, so
  // wiping it on their success page would drop unrelated items the user still has.
  let isCartOrder = false;
  if (publicId) {
    const [row] = await sql`
      SELECT
        o.status,
        coalesce(
          array_agg(DISTINCT oi.item_type) FILTER (WHERE oi.item_type IS NOT NULL),
          '{}'
        ) AS item_types
      FROM orders o
      LEFT JOIN order_items oi ON oi.order_id = o.id
      WHERE o.public_id = ${publicId}
      GROUP BY o.id, o.status
      LIMIT 1
    `;
    if (row) {
      const types = Array.isArray(row.item_types)
        ? row.item_types.map((t: unknown) => String(t))
        : [];
      view = viewFor(String(row.status), kindFromTypes(types));
      // Only a basket order should clear the cart; top-ups never touch it.
      isCartOrder = types.includes("gift_card") || types.includes("ps_account");
    }
  }

  const accent =
    view.tone === "ok"
      ? "var(--signal)"
      : view.tone === "bad"
        ? "var(--coral)"
        : "var(--line-strong)";

  return (
    <>
      <Header />
      {view.paid && isCartOrder && <ClearCartOnSuccess />}
      <main className="mx-auto max-w-2xl px-4 py-16 md:px-6">
        <section
          className="rounded-[24px] border bg-[var(--card-surface)] p-8 md:p-10"
          style={{ borderColor: accent }}
        >
          {publicId && (
            <p className="mb-2 text-xs font-extrabold uppercase tracking-[0.18em] text-[var(--text-muted)]">
              Заказ {publicId}
            </p>
          )}
          <h1 className="font-[family-name:var(--font-unbounded)] text-3xl font-bold tracking-[-0.03em] text-[var(--ink)] md:text-4xl">
            {view.title}
          </h1>
          <p className="mt-4 leading-7 text-[var(--text-muted)]">{view.body}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/profile"
              className="inline-flex rounded-[13px] bg-[var(--signal)] px-5 py-3 font-extrabold text-[var(--ink)]"
            >
              В личный кабинет
            </Link>
            <Link
              href="/"
              className="inline-flex rounded-[13px] border border-[var(--line-strong)] px-5 py-3 font-extrabold text-[var(--ink)]"
            >
              В каталог
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
