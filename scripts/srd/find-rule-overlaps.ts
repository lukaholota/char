/**
 * Пошук перетинів між рукописними статтями довідника й імпортованими зі SRD.
 * Ним користуються і звіт `report-rule-duplicates.ts`, і гейт `tests/content/rules-duplicates.test.ts`.
 */

import { getImportedRuleArticles2014 } from "../../src/lib/rules2014Data";
import { getImportedRuleArticles2024 } from "../../src/lib/rules2024Data";
import { Ruleset } from "@prisma/client";

import { findHandwrittenArticles, RuleArticle } from "../../src/lib/rulesData";
import { ImportedRuleArticle } from "../../src/lib/rulesProvenance";

export type RuleOverlap = {
  handwritten: RuleArticle;
  imported: ImportedRuleArticle;
  reason: string;
};

export function findImportedArticles(ruleset: Ruleset): ImportedRuleArticle[] {
  return ruleset === "RULES_2024" ? getImportedRuleArticles2024() : getImportedRuleArticles2014();
}

export function findRuleOverlaps(ruleset: Ruleset): RuleOverlap[] {
  const overlaps: RuleOverlap[] = [];

  for (const handwritten of findHandwrittenArticles(ruleset)) {
    for (const imported of findImportedArticles(ruleset)) {
      const reason = findMatchReason(handwritten, imported);
      if (reason) overlaps.push({ handwritten, imported, reason });
    }
  }

  return overlaps;
}

function findMatchReason(handwritten: RuleArticle, imported: ImportedRuleArticle): string | null {
  if (imported.slug === `${handwritten.slug}-rule`) return "імпортована відступила суфіксом `-rule`";
  if (imported.slug === handwritten.slug) return "той самий слаг";
  if (normalize(imported.engTitle) === normalize(handwritten.engTitle)) return "той самий англійський заголовок";
  if (normalize(imported.title) === normalize(handwritten.title)) return "той самий український заголовок";

  /// Рукописний конспект часто називає підрозділ рівно так, як SRD називає цілу статтю, — і тоді
  /// два елементи сторінки категорії ділять один якір. Саме так KR20.4 спершу проґавив
  /// «Верховий та підводний бій»: слаги різні, теги розійшлися, а вміст той самий.
  if (handwritten.subsections.some((subsection) => subsection.id === imported.slug)) {
    return "підрозділ рукописної носить слаг статті SRD";
  }
  if (isTitleNested(handwritten.engTitle, imported.engTitle)) return "англійський заголовок вкладений";

  const sharedTags = handwritten.tags.filter((tag) => imported.tags.includes(tag));
  if (sharedTags.length >= 2) return `спільні теги: ${sharedTags.join(", ")}`;

  return null;
}

/// Однослівний заголовок глосарію («Дія», «Монстр») вкладається геть у все, тому вкладеність
/// вважається за збіг лише коли обидві назви складені щонайменше з двох слів.
function isTitleNested(left: string, right: string): boolean {
  const [a, b] = [normalize(left), normalize(right)];
  if (a === b || countWords(a) < 2 || countWords(b) < 2) return false;
  return a.includes(b) || b.includes(a);
}

function countWords(normalized: string): number {
  return normalized.split(" ").filter(Boolean).length;
}

function normalize(value: string): string {
  return value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}
