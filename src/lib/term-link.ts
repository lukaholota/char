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

export type TermLink = { original: string; ruleset: Ruleset };

export const TERM_OPEN_EVENT = "term:open";

const TERM_PARAM = "term";
const TERM_EDITION_PARAM = "edition";
const EDITION_2024 = "2024";

export function findTermLinkInSearch(search: string): TermLink | null {
  const params = new URLSearchParams(search);
  const original = (params.get(TERM_PARAM) ?? "").trim();
  if (!original) return null;

  const ruleset = params.get(TERM_EDITION_PARAM) === EDITION_2024 ? "RULES_2024" : "RULES_2014";
  return { original, ruleset };
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
  if (!link) {
    params.delete(TERM_PARAM);
    params.delete(TERM_EDITION_PARAM);
    return;
  }

  params.set(TERM_PARAM, link.original);
  if (link.ruleset === "RULES_2024") params.set(TERM_EDITION_PARAM, EDITION_2024);
  else params.delete(TERM_EDITION_PARAM);
}
