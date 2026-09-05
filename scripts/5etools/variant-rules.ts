/**
 * Варіантні й необовʼязкові правила поза SRD — з пінованого дзеркала 5etools (Р19).
 * Джерела: DMG, XGtE і TCoE; PHB не беремо — його варіанти вже приїхали зі SRD 5.1.
 */

import { readFileSync } from "fs";

import { findCachePath, MIRROR_REPOSITORY, MIRROR_REVISION } from "./mirror";
import { renderEntries } from "./source-item";
import {
  buildSummary,
  claimSlug,
  kebabCase,
  numberArticlesWithinCategory,
  ParsedRuleCategoryKey,
  ParsedRuleSubSection,
} from "../srd/rules-markdown";

/// `PHB` увійшло сюди тільки для KR23.5's дрібних реєстрів (хвороби Додатка A, глосарій чуттів):
/// самі варіантні правила PHB як і раніше не беремо — `SOURCE_BOOKS` нижче лишається без PHB.
/// `XDMG` — глави 1–3 DMG 2024 (KR23.4, `xdmg-chapters.ts`); цей файл їх не парсить і не
/// фільтрує, тип лише спільний для обох конвеєрів.
export type BeyondSrdSource = "DMG" | "XGE" | "TCE" | "PHB" | "XDMG";

export type ParsedBeyondSrdArticle = {
  id: string;
  slug: string;
  category: ParsedRuleCategoryKey;
  engTitle: string;
  engSummary: string;
  engTags: string[];
  bookSource: BeyondSrdSource;
  page: number;
  order: number;
  subsections: ParsedRuleSubSection[];
};

const SOURCE_BOOKS: BeyondSrdSource[] = ["DMG", "XGE", "TCE"];

/// SRD 5.1 уже містить ці правила дослівно — друга копія розійшлася б із першою.
const ALREADY_IN_SRD = new Set(["Madness"]);

const CATEGORIES: Record<string, ParsedRuleCategoryKey> = {
  "Action Options": "combat",
  "Cleaving Through Creatures": "combat",
  Diagonals: "combat",
  Facing: "combat",
  Flanking: "combat",
  "Hitting Cover": "combat",
  "Initiative Variants": "combat",
  Injuries: "combat",
  "Massive Damage": "combat",
  Morale: "combat",
  Healing: "combat",
  Falling: "combat",
  Sleep: "adventuring",
  "Adamantine Weapons": "adventuring",
  "Rest Variants": "adventuring",
  "Tying Knots": "adventuring",
  "Tool Proficiencies": "adventuring",
  "Downtime Revisited": "adventuring",
  "Simultaneous Effects": "abilities",
  "Automatic Success": "abilities",
  "Proficiency Dice": "abilities",
  "Skill Variants": "abilities",
  "New Ability Scores: Honor and Sanity": "abilities",
  "Customizing Your Origin": "abilities",
  "Optional Class Features": "abilities",
  Inspiration: "abilities",
  "Level Advancement without XP": "abilities",
  Milestones: "abilities",
  "Alternatives to Epic Boons": "abilities",
  "Spell Points": "spellcasting",
  Spellcasting: "spellcasting",
  "Scroll Mishaps": "spellcasting",
  "Mixing Potions": "spellcasting",
  "Wands That Don't Recharge": "spellcasting",
  "More Difficult Identification": "spellcasting",
  "Hero Points": "gamemaster",
  "Plot Points": "gamemaster",
  "Fear and Horror": "gamemaster",
  Loyalty: "gamemaster",
  Renown: "gamemaster",
  "Planar Effects": "gamemaster",
  "Alien Technology": "gamemaster",
  Firearms: "gamemaster",
  Explosives: "gamemaster",
  Sidekicks: "gamemaster",
  "Shared Campaign Variant Rules": "gamemaster",
};

const DOWNTIME_CATEGORY: ParsedRuleCategoryKey = "adventuring";

export function parseBeyondSrdRules(options: { reservedSlugs?: string[] } = {}): ParsedBeyondSrdArticle[] {
  const takenSlugs = new Set(options.reservedSlugs ?? []);
  const raw = JSON.parse(readFileSync(findCachePath("variantrules.json"), "utf-8")) as {
    variantrule: Record<string, unknown>[];
  };

  const wanted = raw.variantrule
    .filter((rule) => SOURCE_BOOKS.includes(String(rule.source) as BeyondSrdSource))
    .filter((rule) => !ALREADY_IN_SRD.has(String(rule.name)));

  /// Одне заняття міжчасся описане і в DMG, і в XGtE — це різні правила з однією назвою.
  /// Щоб читач бачив, котре перед ним, назва такої статті несе книгу.
  const repeated = findRepeatedNames(wanted);
  const articles = wanted.map((rule) => buildArticle(rule, takenSlugs, repeated));

  return numberArticlesWithinCategory(articles);
}

export function buildVariantRuleUrl(article: { engTitle: string; bookSource: BeyondSrdSource }): string {
  const anchor = `${article.engTitle.toLowerCase().replace(/[^a-z0-9]+/g, "%20").trim()}_${article.bookSource.toLowerCase()}`;
  return `https://5e.tools/variantrules.html#${anchor}`;
}

export const MIRROR_ATTRIBUTION = { repository: MIRROR_REPOSITORY, revision: MIRROR_REVISION };

function findRepeatedNames(rules: Record<string, unknown>[]): Set<string> {
  const seen = new Set<string>();
  const repeated = new Set<string>();

  for (const rule of rules) {
    const name = String(rule.name);
    if (seen.has(name)) repeated.add(name);
    seen.add(name);
  }

  return repeated;
}

function buildArticle(
  rule: Record<string, unknown>,
  takenSlugs: Set<string>,
  repeatedNames: Set<string>
): Omit<ParsedBeyondSrdArticle, "order"> {
  const bookSource = String(rule.source) as BeyondSrdSource;
  const engTitle = repeatedNames.has(String(rule.name))
    ? `${rule.name} (${bookSource})`
    : String(rule.name);
  const slug = claimSlug(kebabCase(engTitle), "variant", takenSlugs);
  const subsections = buildSubSections(rule, slug);

  return {
    id: `beyond-${slug}`,
    slug,
    category: pickCategory(String(rule.name)),
    engTitle,
    engSummary: buildSummary(subsections[0]?.engContent ?? ""),
    engTags: [engTitle, bookSource],
    bookSource,
    page: Number(rule.page ?? 0),
    subsections,
  };
}

function buildSubSections(rule: Record<string, unknown>, slug: string): ParsedRuleSubSection[] {
  const entries = Array.isArray(rule.entries) ? rule.entries : [];
  const intro = entries.filter((entry) => !isNamedBlock(entry));
  const named = entries.filter(isNamedBlock) as Record<string, unknown>[];
  const takenIds = new Set<string>();

  const introContent = renderEntries(intro, rule, `${rule.name} › intro`);
  const introSection = introContent
    ? [buildSubSection(slug, String(rule.name), introContent, takenIds)]
    : [];

  return [
    ...introSection,
    ...named.map((block) =>
      buildSubSection(slug, String(block.name), renderEntries([block], rule, `${rule.name} › ${block.name}`), takenIds)
    ),
  ].filter((subsection) => subsection.engContent.length > 0);
}

function buildSubSection(
  articleSlug: string,
  engTitle: string,
  engContent: string,
  takenIds: Set<string>
): ParsedRuleSubSection {
  return {
    id: `${articleSlug}--${claimSlug(kebabCase(engTitle), null, takenIds)}`,
    engTitle,
    engContent,
  };
}

function isNamedBlock(entry: unknown): boolean {
  return typeof entry === "object" && entry !== null && typeof (entry as { name?: unknown }).name === "string";
}

function pickCategory(engTitle: string): ParsedRuleCategoryKey {
  if (engTitle.startsWith("Downtime Activity:")) return DOWNTIME_CATEGORY;

  const category = CATEGORIES[engTitle];
  if (!category) throw new Error(`Варіантне правило «${engTitle}» не має категорії довідника`);
  return category;
}
