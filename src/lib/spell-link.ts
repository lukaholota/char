/**
 * Посилання на заклинання — одне місце на всю механіку: як його розпізнати в `href`, як зібрати
 * адресу і як відкрити модалку. Читають рендерер описів, лист персонажа, сама модалка і
 * проставляч посилань KR25.3. Свого другого не заводити (KR25.1, за зразком glossary-marker.ts).
 *
 * Редакція живе в самій адресі, а не в контексті сторінки: `/2024/spells/<ключ>` — заклинання
 * 2024, `/spells/<ключ>` і давнє `/spell/<ключ>` — 2014. Ключ — слаг (`produce-flame`) або
 * номер; слаг рахує `buildSpellKey` у spellsData.ts, і саме він стабільний (KR25.2).
 */

import type { Ruleset } from "@prisma/client";
import { toEntitySlug } from "@/lib/slug-utils";
import { goBackInHistory, waitForPendingHistoryBack } from "@/lib/history-back";
import { rememberSpellCard } from "@/lib/spell-cards";
import type { SpellData } from "@/lib/spellsData";

export type SpellLink = { spellKey: string; ruleset: Ruleset };

/** Одна функція слага на весь проєкт: `Produce Flame` → `produce-flame`, `Melf's Acid Arrow` → `melfs-acid-arrow`. */
export function buildSpellSlug(engName: string): string {
  return toEntitySlug(engName);
}

/**
 * Посилання з рядка заклинання — каталогу чи бази. Для 2024 ключ — слаг, бо позиційний номер
 * каталогу й автоінкремент бази різні; для 2014 номер один і той самий в обох.
 */
export function buildSpellLinkForSpell(spell: {
  spellId: number;
  engName: string;
  ruleset?: Ruleset | null;
}): SpellLink {
  if (spell.ruleset === "RULES_2024") {
    return { spellKey: buildSpellSlug(spell.engName), ruleset: "RULES_2024" };
  }
  return { spellKey: String(spell.spellId), ruleset: "RULES_2014" };
}

const SPELL_PARAM = "spell";
const SPELL_EDITION_PARAM = "edition";

const EDITION_2024 = "2024";
const SPELL_PATH_SEGMENTS = new Set(["spell", "spells"]);
const LEGACY_SCHEME = "spell:";

export function findSpellLinkInHref(href: string | null | undefined): SpellLink | null {
  const trimmed = (href ?? "").trim();
  if (!trimmed) return null;

  if (trimmed.startsWith(LEGACY_SCHEME)) {
    return buildSpellLinkForKey(trimmed.slice(LEGACY_SCHEME.length), "RULES_2014");
  }

  const { pathname, search } = splitHref(trimmed);
  return findSpellLinkInSearch(search) ?? findSpellLinkInPathname(pathname);
}

export function findSpellLinkInSearch(search: string): SpellLink | null {
  const params = new URLSearchParams(search);
  const ruleset = params.get(SPELL_EDITION_PARAM) === EDITION_2024 ? "RULES_2024" : "RULES_2014";
  return buildSpellLinkForKey(params.get(SPELL_PARAM), ruleset);
}

const SPELL_ANCHOR_PATTERN = /<a href="\/[^"]*">|<\/a>/g;

/**
 * Знімає розмітку якоря, лишаючи його текст. Гейтам «латиниця в українському полі» потрібно саме
 * це: маршрут каталогу латинський за побудовою, а недоперекладений шматок — ні (KR25.4).
 */
export function stripSpellAnchors(text: string): string {
  return text.replace(SPELL_ANCHOR_PATTERN, "");
}

/** Довга форма — справжній маршрут: прямий захід, `/no-ai/` і краулер не залежать від редиректу. */
export function buildSpellHref(link: SpellLink): string {
  const editionPrefix = link.ruleset === "RULES_2024" ? `/${EDITION_2024}` : "";
  return `${editionPrefix}/spells/${link.spellKey}`;
}

function writeSpellLinkToSearch(params: URLSearchParams, link: SpellLink | null): void {
  if (!link) {
    params.delete(SPELL_PARAM);
    params.delete(SPELL_EDITION_PARAM);
    return;
  }

  params.set(SPELL_PARAM, link.spellKey);
  if (link.ruleset === "RULES_2024") params.set(SPELL_EDITION_PARAM, EDITION_2024);
  else params.delete(SPELL_EDITION_PARAM);
}

export function isSameSpellLink(a: SpellLink | null, b: SpellLink | null): boolean {
  if (!a || !b) return a === b;
  return a.spellKey === b.spellKey && a.ruleset === b.ruleset;
}

/**
 * Кожне відкрите заклинання — рівно один запис в історії, позначений глибиною: «Назад» закриває
 * модалку, а хрестик повертається на стільки записів, скільки заклинань відкрито поверх сторінки.
 * Прямий захід за посиланням `?spell=` запису не має — там хрестик лише прибирає параметр.
 */
const SPELL_HISTORY_DEPTH_KEY = "__spellModalDepth";

function readSpellHistoryDepth(): number {
  const depth = (window.history.state as Record<string, unknown> | null)?.[SPELL_HISTORY_DEPTH_KEY];
  return typeof depth === "number" ? depth : 0;
}

/**
 * Стан Next (`__NA` і дерево маршруту) переноситься в новий запис. Без нього Next сприймає
 * `?spell=` як перехід на іншу сторінку: тягне її з сервера й перемальовує весь лист — і саме це
 * рвало анімацію модалки (WebKit: кадр ~230 мс на кожному відкритті).
 */
function pushSpellHistoryEntry(url: string): void {
  const nextJsState = (window.history.state as Record<string, unknown> | null) ?? {};
  window.history.pushState({ ...nextJsState, [SPELL_HISTORY_DEPTH_KEY]: readSpellHistoryDepth() + 1 }, "", url);
}

export function openSpellLink(link: SpellLink): void {
  if (typeof window === "undefined") return;

  void waitForPendingHistoryBack().then(() => {
    const url = new URL(window.location.href);
    writeSpellLinkToSearch(url.searchParams, link);
    pushSpellHistoryEntry(url.href);
    window.dispatchEvent(
      new CustomEvent("spell:open", { detail: { spellId: link.spellKey, ruleset: link.ruleset } })
    );
    dispatchLocationChange();
  });
}

/**
 * Хоумбрю немає в каталозі карток, тож модалка бере його з памʼяті, а ключ в адресі — як у
 * каталожного: без нього `locationchange` після запису закриває модалку раніше за перший кадр.
 */
export function openHomebrewSpell(spell: SpellData): void {
  const link: SpellLink = { spellKey: String(spell.spellId), ruleset: spell.ruleset ?? "RULES_2014" };
  rememberSpellCard(link, spell);
  openSpellLink(link);
}

export function closeSpellLink(): void {
  if (typeof window === "undefined") return;

  const depth = readSpellHistoryDepth();
  if (depth > 0) {
    goBackInHistory(depth);
    return;
  }

  const url = new URL(window.location.href);
  writeSpellLinkToSearch(url.searchParams, null);
  window.history.replaceState(window.history.state, "", url);
  dispatchLocationChange();
}

function findSpellLinkInPathname(pathname: string): SpellLink | null {
  const segments = pathname.split("/").filter(Boolean);
  const at = segments.findIndex((segment) => SPELL_PATH_SEGMENTS.has(segment));
  if (at < 0) return null;

  const ruleset = segments[at - 1] === EDITION_2024 ? "RULES_2024" : "RULES_2014";
  return buildSpellLinkForKey(segments[at + 1], ruleset);
}

/** Ключ — номер (`1352`, `20180`; хоумбрю — відʼємний, `-41`) або слаг від англійської назви (`produce-flame`), KR25.2. */
const SPELL_KEY_PATTERN = /^(?:-\d+|[a-z0-9]+(?:-[a-z0-9]+)*)$/i;

function buildSpellLinkForKey(key: string | null | undefined, ruleset: Ruleset): SpellLink | null {
  const spellKey = (key ?? "").trim();
  return SPELL_KEY_PATTERN.test(spellKey) ? { spellKey, ruleset } : null;
}

function splitHref(href: string): { pathname: string; search: string } {
  const withoutHash = href.split("#")[0];
  const [pathname, search = ""] = withoutHash.split("?");
  return { pathname, search };
}

/** Синхронний `pushState` не породжує події — без цього пінга модалка не побачить нову адресу. */
export function dispatchLocationChange(): void {
  if (typeof window === "undefined") return;
  const fire = () => window.dispatchEvent(new Event("locationchange"));
  if (typeof queueMicrotask === "function") queueMicrotask(fire);
  else window.setTimeout(fire, 0);
}
