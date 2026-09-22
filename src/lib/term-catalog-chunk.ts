/**
 * Джерела картки терміна — окремим чанком (KR25.1): `TermInfoModal` змонтована глобально, і статичний імпорт довідника обох редакцій,
 * словника й каталогів ліг би в бандл кожної сторінки. Динамічний імпорт тягне їх на першому
 * відкритому терміні, а сервісний воркер кешує чанк cache-first.
 *
 * Стани й дії з реєстру (`rule-term-links.json`) мають картки наперед у легкому чанку —
 * ≈ 21 КБ gzip проти ≈ 560 КБ повних джерел (KR34.2).
 */

import type { TermCard } from "@/lib/term-card";
import { findRuleTermHref, type TermLink } from "@/lib/term-link";

export async function findTermCard(link: TermLink): Promise<TermCard> {
  if (isRuleTerm(link.original)) {
    const cards = (await import("@/lib/generated/rule-term-cards.json")).default as Record<string, Record<string, TermCard>>;
    const card = cards[link.ruleset]?.[link.original];
    if (card) return card;
  }

  const [{ buildTermCard }, { collectTermSources }] = await Promise.all([
    import("@/lib/term-card"),
    import("@/lib/term-sources"),
  ]);
  return buildTermCard(link, collectTermSources());
}

function isRuleTerm(original: string): boolean {
  return findRuleTermHref(original, "RULES_2014") !== null || findRuleTermHref(original, "RULES_2024") !== null;
}
