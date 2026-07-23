import type {
  GiftCardDeliveryEmail,
  PsAccountReadyEmail,
  TopUpConfirmationEmail,
} from "./types";

// Pure email rendering — no SMTP, no secrets, no "server-only" — so it can be
// unit-tested and previewed offline. smtp-provider.ts renders with these and
// then sends. Each renderer returns the exact subject / text / html that ships.
// HTML is table-based with inline styles for Gmail / Outlook / Apple Mail.

const SITE = "https://lumo-store.ru";
const PROFILE_URL = `${SITE}/profile`;
const INSTRUCTIONS_URL = `${SITE}/instructions`;
const SUPPORT_URL = `${SITE}/support`;

// Brand tokens, mirrored from the storefront.
const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Consolas,'Liberation Mono',Menlo,monospace";
const PAPER = "#fffdf7";
const ACCENT = "#d8ff3e";
const INK = "#111111";
const BODY = "#3f3d36";
const MUTED = "#8a8676";
const LINE = "#ece8dd";
const LINK = "#6a7d18";

export type RenderedEmail = { subject: string; text: string; html: string };

function fmtAmount(minor: number, currency: string): string {
  return `${(minor / 100).toLocaleString("ru-RU")} ${currency}`;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (c) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[c] as string,
  );
}

// ---- HTML building blocks -------------------------------------------------

function para(html: string): string {
  return `<p style="margin:0 0 12px;font-family:${FONT};font-size:15px;line-height:1.65;color:${BODY};">${html}</p>`;
}

function heading(text: string): string {
  return `<p style="margin:26px 0 8px;font-family:${FONT};font-size:15px;font-weight:800;color:${INK};">${escapeHtml(text)}</p>`;
}

function link(href: string, label: string): string {
  return `<a href="${href}" style="color:${LINK};font-weight:600;text-decoration:underline;">${escapeHtml(label)}</a>`;
}

function button(href: string, label: string): string {
  return (
    `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:18px 0 4px;">` +
    `<tr><td align="center" bgcolor="${ACCENT}" style="border-radius:13px;">` +
    `<a href="${href}" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:15px;font-weight:800;color:${INK};text-decoration:none;border-radius:13px;">${escapeHtml(label)}</a>` +
    `</td></tr></table>`
  );
}

function divider(): string {
  return `<div style="height:1px;line-height:1px;font-size:0;background:${LINE};margin:26px 0;">&nbsp;</div>`;
}

function noteCard(title: string, innerHtml: string): string {
  return (
    `<div style="background:#faf8f0;border:1px solid ${LINE};border-radius:16px;padding:16px 18px;margin:6px 0;">` +
    `<p style="margin:0 0 8px;font-family:${FONT};font-size:14px;font-weight:800;color:${INK};">${escapeHtml(title)}</p>` +
    `<div style="font-family:${FONT};font-size:14px;line-height:1.65;color:${BODY};">${innerHtml}</div>` +
    `</div>`
  );
}

/** A "label → value" detail card (order summary rows). */
function kvCard(rows: Array<[string, string]>): string {
  const inner = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;font-family:${FONT};font-size:14px;color:${MUTED};">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0 6px 16px;font-family:${FONT};font-size:14px;font-weight:700;color:${INK};text-align:right;word-break:break-all;">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return (
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#faf8f0;border:1px solid ${LINE};border-radius:16px;margin:6px 0;">` +
    `<tr><td style="padding:8px 18px;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">${inner}</table></td></tr></table>`
  );
}

function codeCard(label: string | null, code: string): string {
  const labelHtml = label
    ? `<div style="font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#7a8a2a;margin-bottom:6px;">${escapeHtml(label)}</div>`
    : "";
  return (
    `<div style="margin:8px 0;background:#f4ffcf;border:1px solid ${ACCENT};border-radius:16px;padding:16px 18px;">` +
    labelHtml +
    `<div style="font-family:${MONO};font-size:18px;font-weight:700;letter-spacing:0.06em;color:${INK};word-break:break-all;">${escapeHtml(code)}</div>` +
    `</div>`
  );
}

/** Full email document: paper background, brand mark, rounded card, footer. */
function shell(opts: {
  preheader: string;
  orderLabel?: string;
  title: string;
  contentHtml: string;
}): string {
  const orderLabel = opts.orderLabel
    ? `<p style="margin:0 0 6px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${MUTED};">Заказ ${escapeHtml(opts.orderLabel)}</p>`
    : "";
  return (
    `<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${PAPER};">${escapeHtml(opts.preheader)}</div>` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${PAPER};margin:0;padding:0;">` +
    `<tr><td align="center" style="padding:32px 16px;">` +
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;">` +
    `<tr><td style="padding:0 6px 18px;font-family:${FONT};font-size:22px;font-weight:800;letter-spacing:-0.02em;color:${INK};">` +
    `Lumo<span style="color:${ACCENT};">.</span></td></tr>` +
    `<tr><td style="background:#ffffff;border:1px solid ${LINE};border-radius:24px;padding:32px;">` +
    orderLabel +
    `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:1.25;font-weight:800;letter-spacing:-0.02em;color:${INK};">${escapeHtml(opts.title)}</h1>` +
    opts.contentHtml +
    `</td></tr>` +
    `<tr><td style="padding:18px 6px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#a5a08f;">` +
    `© Lumo Store · <a href="${SITE}" style="color:#a5a08f;text-decoration:underline;">lumo-store.ru</a><br>` +
    `Это письмо отправлено по вашему заказу и не требует ответа.` +
    `</td></tr>` +
    `</table></td></tr></table>`
  );
}

// ---- Renderers ------------------------------------------------------------

export function renderGiftCardDelivery(
  input: GiftCardDeliveryEmail,
): RenderedEmail {
  const multiple = input.cards.length > 1;

  const codeLines = input.cards
    .map((c) =>
      multiple ? `${fmtAmount(c.denominationMinor, c.currency)} — ${c.code}` : c.code,
    )
    .join("\n");
  const text =
    `Здравствуйте!\n\n` +
    `Спасибо за покупку в Lumo.\n` +
    `Ваш заказ успешно обработан, и цифровой товар уже готов к использованию.\n\n` +
    `Код активации\n` +
    `${multiple ? "Коды подарочных карт:" : "Код подарочной карты:"}\n${codeLines}\n\n` +
    `Инструкции по активации\n${INSTRUCTIONS_URL}\n` +
    `Воспользуйтесь пошаговыми инструкциями, чтобы активировать приобретённую карту.\n\n` +
    `Личный кабинет\n${PROFILE_URL}\n` +
    `Здесь всегда доступны ваши покупки, история заказов и информация по ним.\n\n` +
    `Поддержка\n${SUPPORT_URL}\n` +
    `Если возникнут вопросы, мы всегда готовы помочь.\n\n` +
    `Важно\n` +
    `• Сохраните код до момента активации.\n` +
    `• Не передавайте его третьим лицам.\n` +
    `• После успешной активации повторное использование кода невозможно.\n\n` +
    `Спасибо, что выбрали Lumo.\n` +
    `Желаем приятных покупок, выгодных пополнений и отличной игры!\n\n` +
    `С уважением,\nКоманда Lumo`;

  const codeCards = input.cards
    .map((c) =>
      codeCard(multiple ? fmtAmount(c.denominationMinor, c.currency) : null, c.code),
    )
    .join("");
  const contentHtml =
    para(
      "Спасибо за покупку в Lumo. Ваш заказ успешно обработан, и цифровой товар уже готов к использованию.",
    ) +
    heading("Код активации") +
    codeCards +
    button(PROFILE_URL, "Открыть личный кабинет") +
    heading("Инструкции по активации") +
    para(
      `Воспользуйтесь пошаговыми ${link(INSTRUCTIONS_URL, "инструкциями")}, чтобы активировать приобретённую карту.`,
    ) +
    heading("Поддержка") +
    para(`Если возникнут вопросы, мы всегда готовы ${link(SUPPORT_URL, "помочь")}.`) +
    divider() +
    noteCard(
      "Важно",
      "• Сохраните код до момента активации.<br>" +
        "• Не передавайте его третьим лицам.<br>" +
        "• После успешной активации повторное использование кода невозможно.",
    ) +
    divider() +
    para(
      "Спасибо, что выбрали Lumo. Желаем приятных покупок, выгодных пополнений и отличной игры!",
    ) +
    para("С уважением,<br>Команда Lumo");

  return {
    subject: "Ваш заказ в Lumo оформлен",
    text,
    html: shell({
      preheader: "Ваш код готов — заказ оформлен.",
      orderLabel: input.publicOrderId,
      title: "Ваш заказ готов",
      contentHtml,
    }),
  };
}

export function renderPsAccountReady(
  input: PsAccountReadyEmail,
): RenderedEmail {
  const productLabel =
    input.regions.length > 0
      ? `Аккаунт PlayStation (${input.regions.join(", ")})`
      : "Аккаунт PlayStation";

  const text =
    `Здравствуйте!\n\n` +
    `Спасибо за заказ в Lumo.\n` +
    `Мы получили оплату и уже подготовили ваш заказ: ${productLabel}.\n\n` +
    `Где найти данные заказа\n` +
    `В целях безопасности данные аккаунта (логин, пароль и другая ` +
    `конфиденциальная информация) не отправляются по электронной почте.\n` +
    `Это позволяет защитить ваши данные и исключить их попадание к третьим лицам.\n` +
    `Все сведения доступны только в вашем личном кабинете:\n${PROFILE_URL}\n\n` +
    `Если заказ находится в обработке\n` +
    `В некоторых случаях подготовка заказа может занять несколько минут.\n` +
    `Как только заказ будет готов, информация автоматически появится в личном кабинете.\n\n` +
    `Полезные ссылки\n` +
    `Инструкции — ${INSTRUCTIONS_URL}\n` +
    `Поддержка — ${SUPPORT_URL}\n` +
    `Если у вас возникнут вопросы, мы всегда готовы помочь.\n\n` +
    `Благодарим за доверие к Lumo.\n` +
    `Мы делаем всё, чтобы покупка цифровых товаров была простой, безопасной ` +
    `и максимально удобной.\n\n` +
    `С уважением,\nКоманда Lumo`;

  const contentHtml =
    para(
      `Спасибо за заказ в Lumo. Мы получили оплату и уже подготовили ваш заказ: <b style="color:${INK};">${escapeHtml(productLabel)}</b>.`,
    ) +
    heading("Где найти данные заказа") +
    para(
      "В целях безопасности данные аккаунта — логин, пароль и другая конфиденциальная информация — не отправляются по электронной почте. Это защищает ваши данные и исключает их попадание к третьим лицам.",
    ) +
    para("Все сведения доступны только в вашем личном кабинете:") +
    button(PROFILE_URL, "Открыть личный кабинет") +
    heading("Если заказ находится в обработке") +
    para(
      "В некоторых случаях подготовка заказа может занять несколько минут. Как только заказ будет готов, информация автоматически появится в личном кабинете.",
    ) +
    divider() +
    noteCard(
      "Полезные ссылки",
      `${link(INSTRUCTIONS_URL, "Инструкции")} · ${link(SUPPORT_URL, "Поддержка")}<br>` +
        "Если у вас возникнут вопросы, мы всегда готовы помочь.",
    ) +
    divider() +
    para(
      "Благодарим за доверие к Lumo. Мы делаем всё, чтобы покупка цифровых товаров была простой, безопасной и максимально удобной.",
    ) +
    para("С уважением,<br>Команда Lumo");

  return {
    subject: "Заказ оформлен — детали доступны в личном кабинете",
    text,
    html: shell({
      preheader: "Заказ оформлен — детали доступны в личном кабинете.",
      orderLabel: input.publicOrderId,
      title: "Заказ оформлен",
      contentHtml,
    }),
  };
}

export function renderTopUpConfirmation(
  input: TopUpConfirmationEmail,
): RenderedEmail {
  const isSteam = input.kind === "steam";
  const service = isSteam ? "Пополнение Steam" : "Telegram Stars";
  const targetLabel = isSteam ? "Аккаунт" : "Получатель";
  const amountLabelName = isSteam ? "Сумма" : "Количество";
  const title = isSteam ? "Пополнение Steam оформлено" : "Telegram Stars оформлены";
  const subject = isSteam
    ? "Пополнение Steam оформлено — Lumo"
    : "Telegram Stars оформлены — Lumo";

  const text =
    `Здравствуйте!\n\n` +
    `Спасибо за заказ в Lumo.\n` +
    `Мы получили оплату и обрабатываем ваше пополнение.\n\n` +
    `Детали заказа\n` +
    `Услуга: ${service}\n` +
    `${targetLabel}: ${input.target}\n` +
    `${amountLabelName}: ${input.amountLabel}\n\n` +
    `Статус\n` +
    `Зачисление обычно происходит в течение нескольких минут. ` +
    `Если баланс не появился — напишите в поддержку, мы поможем.\n\n` +
    `Личный кабинет\n${PROFILE_URL}\n` +
    `Здесь доступна история ваших заказов и их статусы.\n\n` +
    `Полезные ссылки\n` +
    `Инструкции — ${INSTRUCTIONS_URL}\n` +
    `Поддержка — ${SUPPORT_URL}\n\n` +
    `Благодарим за доверие к Lumo.\n` +
    `Желаем выгодных пополнений и отличной игры!\n\n` +
    `С уважением,\nКоманда Lumo`;

  const contentHtml =
    para(
      "Спасибо за заказ в Lumo. Мы получили оплату и обрабатываем ваше пополнение.",
    ) +
    heading("Детали заказа") +
    kvCard([
      ["Услуга", service],
      [targetLabel, input.target],
      [amountLabelName, input.amountLabel],
    ]) +
    button(PROFILE_URL, "Открыть личный кабинет") +
    heading("Статус") +
    para(
      `Зачисление обычно происходит в течение нескольких минут. Если баланс не появился — ${link(SUPPORT_URL, "напишите в поддержку")}, мы поможем.`,
    ) +
    divider() +
    noteCard(
      "Полезные ссылки",
      `${link(INSTRUCTIONS_URL, "Инструкции")} · ${link(SUPPORT_URL, "Поддержка")}<br>` +
        "В личном кабинете доступна история ваших заказов и их статусы.",
    ) +
    divider() +
    para(
      "Благодарим за доверие к Lumo. Желаем выгодных пополнений и отличной игры!",
    ) +
    para("С уважением,<br>Команда Lumo");

  return {
    subject,
    text,
    html: shell({
      preheader: `${service} оформлено — заказ принят.`,
      orderLabel: input.publicOrderId,
      title,
      contentHtml,
    }),
  };
}
