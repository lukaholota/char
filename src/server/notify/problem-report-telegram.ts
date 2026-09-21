import type { ProblemReportRecord } from "@/server/db/problem-reports";

const TELEGRAM_MESSAGE_LIMIT = 4096;
const TELEGRAM_TIMEOUT_MS = 5000;

export async function notifyOwnerAboutProblemReport(record: ProblemReportRecord): Promise<void> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!botToken || !chatId) return;

  try {
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: buildProblemReportTelegramText(record), disable_web_page_preview: true }),
      signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
    });
    if (!response.ok) console.error("Problem report Telegram notification rejected:", response.status, await response.text());
  } catch (error) {
    console.error("Problem report Telegram notification failed:", error);
  }
}

export function buildProblemReportTelegramText(record: ProblemReportRecord): string {
  const details = [
    `🐞 Репорт від ${record.userId ? `користувач #${record.userId}` : "анонім"}`,
    `Сторінка: ${record.pageUrl ?? record.pagePath}`,
    describeScreen(record),
    record.userAgent ? `Браузер: ${record.userAgent}` : null,
  ].filter(Boolean).join("\n");

  const room = TELEGRAM_MESSAGE_LIMIT - details.length - 2;
  return `${details}\n\n${truncate(record.message, room)}`;
}

function describeScreen(record: ProblemReportRecord): string | null {
  if (!record.viewportWidth || !record.viewportHeight) return null;
  return `Екран: ${record.viewportWidth}×${record.viewportHeight}${record.timezone ? `, ${record.timezone}` : ""}`;
}

function truncate(text: string, limit: number): string {
  return text.length <= limit ? text : `${text.slice(0, limit - 1)}…`;
}
