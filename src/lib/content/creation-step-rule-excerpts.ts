/**
 * Початок статті довідника для кроку майстра створення персонажа: те саме посилання, що й у
 * KR29.3, плюс перші абзаци тексту, щоб гравець прочитав правило, не залишаючи майстра.
 *
 * Модуль статично імпортує довідник обох редакцій, тож його тягнуть лише серверні сторінки
 * (`/char/create`, `/2024/char`) і тести — майстер дістає готовий знімок пропом.
 */

import type { Ruleset } from "@prisma/client";
import type { RuleArticle, RuleSubSection } from "@/lib/rulesData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import {
  findCreationStepRuleLink,
  listLinkedCreationStepIds,
  type CreationStepRuleLink,
} from "@/lib/components/characterCreator/creation-step-rule-links";

export type CreationStepRuleExcerpt = CreationStepRuleLink & {
  sectionTitle: string | null;
  excerpt: string;
  isTruncated: boolean;
};

export type CreationStepRuleExcerpts = Record<Ruleset, Record<string, CreationStepRuleExcerpt>>;

const EXCERPT_CHARACTER_BUDGET = 700;

export function collectCreationStepRuleExcerpts(): CreationStepRuleExcerpts {
  return {
    RULES_2014: collectForRuleset("RULES_2014", getAllRuleArticles2014()),
    RULES_2024: collectForRuleset("RULES_2024", getAllRuleArticles2024()),
  };
}

function collectForRuleset(ruleset: Ruleset, articles: RuleArticle[]): Record<string, CreationStepRuleExcerpt> {
  const excerpts: Record<string, CreationStepRuleExcerpt> = {};

  for (const stepId of listLinkedCreationStepIds(ruleset)) {
    const link = findCreationStepRuleLink(stepId, ruleset);
    if (!link) continue;

    const target = findAnchorTarget(articles, link);
    if (!target) continue;

    const opening = cutOpening(findOpeningText(target));
    if (opening.text === "") continue;

    excerpts[stepId] = {
      ...link,
      sectionTitle: target.subsection?.title ?? null,
      excerpt: opening.text,
      isTruncated: opening.isTruncated,
    };
  }

  return excerpts;
}

type AnchorTarget = { article: RuleArticle; subsection: RuleSubSection | null };

function findAnchorTarget(articles: RuleArticle[], link: CreationStepRuleLink): AnchorTarget | null {
  const inCategory = articles.filter((article) => article.category === link.category);

  const bySlug = inCategory.find((article) => article.slug === link.anchor);
  if (bySlug) return { article: bySlug, subsection: null };

  for (const article of inCategory) {
    const subsection = article.subsections.find((candidate) => candidate.id === link.anchor);
    if (subsection) return { article, subsection };
  }

  return null;
}

/// Якір на підрозділ читається з самого підрозділу; якір на статтю — з її підрозділів підряд,
/// бо `summary` там лише стиснене перше речення того самого тексту, а перший підрозділ буває
/// однорядковим заводом («Вид складається з таких частин.»). Назва підрозділу йде жирним
/// перед текстом — інакше уривок стрибає з теми на тему без попередження.
function findOpeningText({ article, subsection }: AnchorTarget): string {
  if (subsection) return subsection.content;
  if (article.subsections.length === 0) return article.summary;

  return article.subsections
    .map((candidate) =>
      candidate.title === article.title ? candidate.content : `**${candidate.title}.** ${candidate.content}`
    )
    .join("\n\n");
}

function cutOpening(content: string): { text: string; isTruncated: boolean } {
  const paragraphs = content
    .trim()
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter((paragraph) => paragraph !== "" && !isAside(paragraph));
  if (paragraphs.length === 0) return { text: "", isTruncated: false };

  const kept: string[] = [];
  for (const paragraph of paragraphs) {
    if (kept.length > 0 && joinedLength(kept) + paragraph.length > EXCERPT_CHARACTER_BUDGET) break;
    kept.push(paragraph);
    if (joinedLength(kept) >= EXCERPT_CHARACTER_BUDGET) break;
  }

  return { text: kept.join("\n\n"), isTruncated: kept.length < paragraphs.length };
}

/// Врізка в рамці («Імпровізована зброя» посеред властивостей майстерності) — відступ від теми
/// кроку, і в уривку з кількох абзаців вона зʼїдає місце самого правила.
function isAside(paragraph: string): boolean {
  return paragraph.startsWith(">");
}

function joinedLength(paragraphs: string[]): number {
  return paragraphs.join("\n\n").length;
}
