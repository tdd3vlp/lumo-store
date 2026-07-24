import "server-only";

// Operational alerts to a Telegram chat (stock-outs, etc.). Best-effort and
// non-blocking: a failure here must never break fulfilment, so every path
// swallows its error after logging. Configure with TELEGRAM_BOT_TOKEN (from
// @BotFather) and TELEGRAM_ALERT_CHAT_ID (the chat/channel numeric id the bot
// posts to). Missing config = silently disabled.

function config(): { token: string; chatId: string } | null {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ALERT_CHAT_ID;
  if (!token || !chatId) return null;
  return { token, chatId };
}

/** Send a plain-text alert. Never throws. Returns whether it was delivered. */
export async function sendTelegramAlert(text: string): Promise<boolean> {
  const cfg = config();
  if (!cfg) return false;
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${cfg.token}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: cfg.chatId,
          text,
          disable_web_page_preview: true,
        }),
        signal: AbortSignal.timeout(5000),
      },
    );
    if (!res.ok) {
      console.error(`[telegram] alert failed: HTTP ${res.status}`);
      return false;
    }
    return true;
  } catch (error) {
    const reason = error instanceof Error ? error.message : "send failed";
    console.error(`[telegram] alert error: ${reason}`);
    return false;
  }
}

/**
 * Warn that a PlayStation-account region is running low (or out). Fired after a
 * delivery consumes stock; `remaining` is what's left available for the region.
 */
export async function notifyPsAccountStock(input: {
  region: string;
  regionLabel: string;
  remaining: number;
}): Promise<void> {
  const { region, regionLabel, remaining } = input;
  const text =
    remaining <= 0
      ? `🔴 PlayStation-аккаунты (${regionLabel} / ${region}): ЗАКОНЧИЛИСЬ (0 в наличии).\nПополните склад — покупки этого региона больше не пройдут.`
      : `⚠️ PlayStation-аккаунты (${regionLabel} / ${region}): осталось ${remaining} шт.\nПора докупить, скоро закончатся.`;
  await sendTelegramAlert(text);
}
