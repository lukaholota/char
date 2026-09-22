/**
 * Модалка заклинання бере одну картку через GET, а не весь каталог: 1,8 МБ каталогу розбирались
 * на кожному листі й підвішували телефон (2026-09-21). GET, а не серверна дія, — щоб сервісний
 * воркер міг віддати відкриту раніше картку без мережі (`public/sw.js`).
 */

import type { SpellData } from "@/lib/spellsData";
import type { SpellLink } from "@/lib/spell-link";
import { runWhenIdle } from "@/lib/run-when-idle";

const EDITION_BY_RULESET = { RULES_2014: "2014", RULES_2024: "2024" } as const;

const loadedCards = new Map<string, SpellData>();
const cardLoads = new Map<string, Promise<SpellData | null>>();

export function buildSpellCardUrl(link: SpellLink): string {
  return `/spell-cards/${EDITION_BY_RULESET[link.ruleset]}/${encodeURIComponent(link.spellKey)}`;
}

export function findSpellForModal(link: SpellLink): Promise<SpellData | null> {
  const url = buildSpellCardUrl(link);
  const pending = cardLoads.get(url) ?? fetchSpellCard(url);
  cardLoads.set(url, pending);
  return pending;
}

/**
 * Синхронно, коли картка вже в памʼяті: тоді модалка відкривається одразу з текстом, а не
 * «порожня → скелетон → текст» — три перемальовки посеред анімації відкриття рвали її на телефоні.
 */
export function findLoadedSpellForModal(link: SpellLink): SpellData | null {
  return loadedCards.get(buildSpellCardUrl(link)) ?? null;
}

export function preloadSpellCardsWhenIdle(links: SpellLink[]): () => void {
  if (links.length === 0) return () => undefined;
  return runWhenIdle(() => links.forEach((link) => void findSpellForModal(link).catch(() => null)), 4000);
}

async function fetchSpellCard(url: string): Promise<SpellData | null> {
  try {
    const response = await fetch(url);
    if (response.status === 404) return null;
    if (!response.ok) throw new Error(`spell card ${response.status}`);
    const spell = (await response.json()) as SpellData;
    loadedCards.set(url, spell);
    return spell;
  } catch (error) {
    cardLoads.delete(url);
    throw error;
  }
}
