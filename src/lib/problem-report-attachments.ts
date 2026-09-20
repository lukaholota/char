import { readMediaBaseUrl } from "@/lib/media-url";

export const MAX_PROBLEM_REPORT_ATTACHMENTS = 3;
export const PROBLEM_REPORT_MEDIA_PREFIX = "problem-reports";
const ATTACHMENTS_HEADING = "Вкладення:";

export function isProblemReportAttachmentUrl(url: string): boolean {
  return url.startsWith(`${readMediaBaseUrl()}/${PROBLEM_REPORT_MEDIA_PREFIX}/`) && !/\s/.test(url);
}

/// Таблиця звітів колонки для вкладень не має, а читає її власник напряму: адреси картинок
/// дописуються в кінець повідомлення окремим блоком.
export function appendAttachmentsToMessage(message: string, attachmentUrls: string[]): string {
  if (!attachmentUrls.length) return message;
  return `${message}\n\n${ATTACHMENTS_HEADING}\n${attachmentUrls.join("\n")}`;
}
