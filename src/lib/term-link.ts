/**
 * Посилання на термін — одне місце на всю механіку, за зразком `spell-link.ts` (KR25.1):
 * як термін їде в адресі, як відкрити й закрити модалку, з якої редакції брати довідник.
 * Читають рендерер маркера (`GlossaryTerm`) і сама модалка (`TermInfoModal`). Свого другого
 * не заводити (KR30.3).
 *
 * Маркер `{{Insight}}` редакції не несе, тому вона береться зі сторінки: сегмент `2024` в
 * адресі — довідник 2024, без нього — 2014.
 */

import type { Ruleset } from "@prisma/client";
import { dispatchLocationChange } from "@/lib/spell-link";
import ruleTermLinks from "@/lib/refs/rule-term-links.json";

export type TermLink = { original: string; ruleset: Ruleset };

/// Посилання на стан чи дію в тексті — звичайний якір на справжню сторінку довідника
/// (`<a href="/rules/conditions#condition-paralyzed">`), як у заклинань (KR34.2). Реєстр
/// `rule-term-links.json` каже, який термін стоїть за адресою, тож редакція береться з адреси,
/// а не зі сторінки.
export type RuleTermLinkEntry = { original: string; RULES_2014?: string; RULES_2024?: string };

const RULESETS: Ruleset[] = ["RULES_2014", "RULES_2024"];
const NO_AI_PREFIX = "/no-ai";

const termLinkByHref = new Map<string, TermLink>(
  (ruleTermLinks as RuleTermLinkEntry[]).flatMap((entry) =>
    RULESETS.flatMap((ruleset) => {
      const href = entry[ruleset];
      return href ? [[href, { original: entry.original, ruleset }] as [string, TermLink]] : [];
    })
  )
);

export function listRuleTermLinks(): RuleTermLinkEntry[] {
  return ruleTermLinks as RuleTermLinkEntry[];
}

export function findRuleTermHref(original: string, ruleset: Ruleset): string | null {
  const entry = listRuleTermLinks().find((candidate) => candidate.original === original);
  return entry?.[ruleset] ?? null;
}

const RULE_TERM_ANCHOR = /<a href="(?:\/2024)?\/rules\/[^"]*">([\s\S]*?)<\/a>/g;

/// Текст без якорів на правила — щоб звірити опис у базі з описом у сіді: якщо без якорів вони
/// однакові, відрізняються лише посилання, і їх можна переносити, не чіпаючи формулювання.
export function stripRuleTermAnchors(text: string): string {
  return text.replace(RULE_TERM_ANCHOR, "$1");
}

export function findTermLinkInHref(href: string | null | undefined): TermLink | null {
  const trimmed = (href ?? "").trim();
  const withoutMode = trimmed.startsWith(`${NO_AI_PREFIX}/`) ? trimmed.slice(NO_AI_PREFIX.length) : trimmed;
  return termLinkByHref.get(withoutMode) ?? null;
}

export const TERM_OPEN_EVENT = "term:open";

const TERM_PARAM = "term";
/// Свій параметр, а не спільний із заклинанням: термін відкривається й поверх модалки
/// заклинання, і закриття терміна стирало б заклинанню `edition` — під терміном 2014 заклинання
/// 2024 мовчки ставало заклинанням 2014 (KR34.4, спіймано в Chromium).
const TERM_EDITION_PARAM = "term-edition";
/// Адреси KR30.3 (`?term=Insight&edition=2024`) уже поділені — без заклинання поруч їх `edition` належить терміну.
const LEGACY_EDITION_PARAM = "edition";
const SPELL_PARAM = "spell";
const EDITION_2024 = "2024";

export function findTermLinkInSearch(search: string): TermLink | null {
  const params = new URLSearchParams(search);
  const original = (params.get(TERM_PARAM) ?? "").trim();
  if (!original) return null;

  const edition = params.get(TERM_EDITION_PARAM) ?? (params.has(SPELL_PARAM) ? null : params.get(LEGACY_EDITION_PARAM));
  return { original, ruleset: edition === EDITION_2024 ? "RULES_2024" : "RULES_2014" };
}

export function findRulesetInPathname(pathname: string): Ruleset {
  const segments = pathname.split("/").filter(Boolean);
  return segments.includes(EDITION_2024) ? "RULES_2024" : "RULES_2014";
}

export function isSameTermLink(a: TermLink | null, b: TermLink | null): boolean {
  if (!a || !b) return a === b;
  return a.original === b.original && a.ruleset === b.ruleset;
}

export function openTermLink(link: TermLink, term = ""): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  writeTermLinkToSearch(url.searchParams, link);
  window.history.pushState({}, "", url);
  window.dispatchEvent(
    new CustomEvent(TERM_OPEN_EVENT, { detail: { original: link.original, ruleset: link.ruleset, term } })
  );
  dispatchLocationChange();
}

export function closeTermLink(): void {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  writeTermLinkToSearch(url.searchParams, null);
  window.history.replaceState({}, "", url);
  dispatchLocationChange();
}

function writeTermLinkToSearch(params: URLSearchParams, link: TermLink | null): void {
  if (!params.has(SPELL_PARAM)) params.delete(LEGACY_EDITION_PARAM);
  if (!link) {
    params.delete(TERM_PARAM);
    params.delete(TERM_EDITION_PARAM);
    return;
  }

  params.set(TERM_PARAM, link.original);
  if (link.ruleset === "RULES_2024") params.set(TERM_EDITION_PARAM, EDITION_2024);
  else params.delete(TERM_EDITION_PARAM);
}
