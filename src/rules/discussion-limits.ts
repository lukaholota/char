export const COMMENTS_PER_HOUR = 30;
export const REPORTS_PER_DAY = 20;
export const MAX_COMMENT_LENGTH = 5_000;
export const MAX_REPORT_DETAILS_LENGTH = 1_000;
export const REPORT_REASONS = ["SPAM", "OFFENSIVE", "COPYRIGHT", "OTHER"] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

const HOUR_MS = 60 * 60 * 1000;

export function findCommentLimitStart(now: Date): Date {
  return new Date(now.getTime() - HOUR_MS);
}

export function findReportLimitStart(now: Date): Date {
  return new Date(now.getTime() - 24 * HOUR_MS);
}

export function readCommentBody(raw: string): { body: string } | { error: string } {
  const body = raw.replace(/\r\n/g, "\n").trim();
  if (!body) return { error: "Коментар порожній" };
  if (body.length > MAX_COMMENT_LENGTH) return { error: `Коментар задовгий: до ${MAX_COMMENT_LENGTH} символів` };
  return { body };
}

export function readReportInput(raw: { reason: unknown; details: unknown }): { reason: ReportReason; details: string | null } | { error: string } {
  const reason = REPORT_REASONS.find((known) => known === raw.reason);
  if (!reason) return { error: "Оберіть причину скарги" };
  const details = String(raw.details ?? "").replace(/\r\n/g, "\n").trim();
  if (details.length > MAX_REPORT_DETAILS_LENGTH) return { error: `Пояснення задовге: до ${MAX_REPORT_DETAILS_LENGTH} символів` };
  if (reason === "OTHER" && !details) return { error: "Поясніть, що не так" };
  return { reason, details: details || null };
}
