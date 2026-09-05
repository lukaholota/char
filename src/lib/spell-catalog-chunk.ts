/**
 * Каталог заклинань для модалки — окремим чанком, а не серверною дією і не в бандлі кожної
 * сторінки (KR25.1).
 *
 * `SpellInfoModal` змонтована глобально в `layout.tsx`, тож статичний імпорт поклав би 1,8 МБ
 * обох каталогів на кожну сторінку сайту. Динамічний імпорт лишає їх окремим чанком під
 * `/_next/static/`, а його сервісний воркер кешує cache-first (`public/sw.js`) — тому після
 * першого відкритого заклинання модалка працює й без мережі. Серверна дія цього не вміла: вона
 * POST, а воркер обробляє тільки GET.
 */

import type { SpellData } from "@/lib/spellsData";
import type { SpellLink } from "@/lib/spell-link";

export async function findSpellForModal(link: SpellLink): Promise<SpellData | null> {
  const { getSpellByIdOrSlug } = await import("@/lib/spellsData");
  return getSpellByIdOrSlug(link.spellKey, link.ruleset) ?? null;
}
