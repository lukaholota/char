/**
 * Розбір файлу `creator-content-<редакція>.json` назад у той самий обʼєкт, який віддавала база.
 *
 * Єдине, що JSON втрачає на цьому графі, — `DateTime`: Prisma віддає `Date`, JSON лишає рядок
 * ISO. Полів таких три моделі (`Class`, `Feature`, `Feat`), і вони лежать на кожній вкладеній
 * фічі, тому оживлення робиться обходом, а не руками по кожній гілці.
 */

import type { CreatorContent } from "@/server/db/creator-content-query";

const DATE_KEYS = new Set(["createdAt", "updatedAt"]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

function reviveDatesInPlace(value: unknown): void {
  if (Array.isArray(value)) {
    for (const item of value) reviveDatesInPlace(item);
    return;
  }
  if (!value || typeof value !== "object") return;

  const record = value as Record<string, unknown>;
  for (const [key, nested] of Object.entries(record)) {
    if (DATE_KEYS.has(key) && typeof nested === "string" && ISO_DATE.test(nested)) {
      record[key] = new Date(nested);
      continue;
    }
    reviveDatesInPlace(nested);
  }
}

export function reviveCreatorContent(raw: unknown): CreatorContent {
  const content = raw as CreatorContent;
  reviveDatesInPlace(content);
  return content;
}
