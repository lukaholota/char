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

type SpellCatalog = typeof import("@/lib/spellsData");

let loadedCatalog: SpellCatalog | null = null;
let catalogLoad: Promise<SpellCatalog> | null = null;

function loadSpellCatalog(): Promise<SpellCatalog> {
  catalogLoad ??= import("@/lib/spellsData").then((catalog) => (loadedCatalog = catalog));
  return catalogLoad;
}

export async function findSpellForModal(link: SpellLink): Promise<SpellData | null> {
  const { getSpellByIdOrSlug } = await loadSpellCatalog();
  return getSpellByIdOrSlug(link.spellKey, link.ruleset) ?? null;
}

/**
 * Синхронно, коли каталог уже в памʼяті: тоді модалка відкривається одразу з текстом, а не
 * «порожня → скелетон → текст» — три перемальовки посеред анімації відкриття рвали її на телефоні.
 */
export function findLoadedSpellForModal(link: SpellLink): SpellData | null {
  return loadedCatalog?.getSpellByIdOrSlug(link.spellKey, link.ruleset) ?? null;
}

/** Розбір 2 МБ каталогу — у вільний час сторінки, а не в момент першого тапу по заклинанню. */
export function preloadSpellCatalogWhenIdle(): () => void {
  if (loadedCatalog || typeof window === "undefined") return () => undefined;
  const load = () => void loadSpellCatalog().catch(() => (catalogLoad = null));
  if (typeof window.requestIdleCallback === "function") {
    const handle = window.requestIdleCallback(load, { timeout: 4000 });
    return () => window.cancelIdleCallback(handle);
  }
  const handle = setTimeout(load, 1500);
  return () => clearTimeout(handle);
}
