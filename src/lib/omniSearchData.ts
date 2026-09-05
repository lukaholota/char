/**
 * Omni-Search Data Indexer
 * Indexes platform entities in-memory for instant global search (Cmd+K).
 *
 * Loaded lazily by the search dialog: it pulls every generated catalog JSON, so importing it
 * from the root layout would ship ~7.5 MiB of parsed JSON to every page (docs/DECISIONS.md Р14).
 */

import { Ruleset } from "@prisma/client";
import { getAllSpells } from "@/lib/spellsData";
import { getAllMagicItems } from "@/lib/magicItemsData";
import { getAllWeapons } from "@/lib/weaponsData";
import { getAllArmors } from "@/lib/armorData";
import { getAllCreatures, findEditionLabel } from "@/lib/bestiaryData";
import { getAllFeats } from "@/lib/featsData";
import { getAllInvocations } from "@/lib/invocationsData";
import { getAllBastionFacilities } from "@/lib/bastionsData";
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllClasses } from "@/lib/classesData";
import { getAllRaces, RACE_SINGULAR } from "@/lib/racesData";
import { getAllRuleArticles, getAllConditions, RuleArticle } from "@/lib/rulesData";
import { getAllRuleArticles2014 } from "@/lib/rules2014Data";
import { getAllRuleArticles2024, getConditions2024 } from "@/lib/rules2024Data";
import {
  itemRarityTranslations,
  weaponTranslations,
  armorTypeTranslations,
} from "@/lib/refs/translation";
import { toEntitySlug } from "@/lib/slug-utils";
import {
  findCategoryCatalogHref,
  findRoutePrefix,
  OMNI_CATEGORY_LABELS,
  type OmniSearchCategory,
} from "@/lib/search/omni-categories";
import { findAliasVariants } from "@/lib/search/searchAliases";

export {
  findCategoryCatalogHref,
  OMNI_CATEGORY_LABELS,
  type OmniSearchCategory,
} from "@/lib/search/omni-categories";
import {
  buildQueryMatcher,
  buildSearchableText,
  findMatchRank,
  matchesQuery,
  normalizeSearchText,
  QueryMatcher,
  SearchableText,
} from "@/lib/search/searchQuery";

export type OmniSearchItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: OmniSearchCategory;
  categoryLabel: string;
  href: string;
  badge?: string;
  keywords?: string[];
  /// Народні варіанти назви (KR13.4). Живуть окремо від keywords, бо точний збіг з аліасом —
  /// сильний сигнал для ранжування, а не просто ще одне слово в тексті.
  aliases?: string[];
  /// Set for creatures: the same monster exists in both editions as two separate records
  /// (docs/DECISIONS.md Р12), so the row has to say which one it is.
  edition?: string;
  /// Б9: той самий сирий атрибут (spell.school, armor.armorType…), яким каталог цієї категорії
  /// вибирає іконку — findOmniSearchVisual(item) диспетчерить по ньому в ту саму функцію
  /// catalog-visuals.ts, що й сама сторінка каталогу, тож іконка завжди та сама.
  visualKey?: string | null;
  /// Другий аргумент для категорій, чия іконка залежить від двох полів (isRanged для зброї,
  /// minLevel для потойбічних викликів).
  visualKeySecondary?: string | number | boolean | null;
};


const MAX_SEARCH_RESULTS = 50;
const SHORT_ALIAS_LENGTH = 4;

/// Б10: за однакового рангу класи й раси мають перемагати однойменних істот бестіарію
/// («друїд» — спершу клас, потім NPC-статблок). Нижче число — вищий пріоритет; усе, чого
/// немає в таблиці, ділить типовий пріоритет і між собою впорядковується лише рангом.
const CATEGORY_TIE_BREAK_PRIORITY: Partial<Record<OmniSearchCategory, number>> = {
  bestiary: 1,
};
const DEFAULT_CATEGORY_TIE_BREAK_PRIORITY = 0;

const cachedIndexes: Partial<Record<Ruleset, OmniSearchItem[]>> = {};
const cachedEntries: Partial<Record<Ruleset, SearchEntry[]>> = {};

type SearchEntry = {
  item: OmniSearchItem;
  text: SearchableText;
  /// Аліаси коротші за SHORT_ALIAS_LENGTH ловлять десятки чужих сутностей підрядком
  /// («маг» → «магічний», «магмін»), тому спрацьовують лише на точний запит.
  exactAliases: string[];
};

/// The class, subclass and race lists used to be typed out here and drifted: the 2014 race list
/// held 21 of the 66 rows in the database. They now come from the catalogs, which read the same
/// tables the character creator does (KR15.6).
export function buildOmniSearchIndex(ruleset: Ruleset = "RULES_2014"): OmniSearchItem[] {
  const cached = cachedIndexes[ruleset];
  if (cached) return cached;

  const items = [
    ...collectSpellItems(ruleset),
    ...collectMagicItemItems(ruleset),
    ...collectWeaponItems(ruleset),
    ...collectArmorItems(ruleset),
    ...collectCreatureItems(ruleset),
    ...collectFeatItems(ruleset),
    ...collectInvocationItems(ruleset),
    ...collectBastionItems(ruleset),
    ...collectBackgroundItems(ruleset),
    ...collectClassItems(ruleset),
    ...collectSubclassItems(ruleset),
    ...collectRaceItems(ruleset),
    ...collectRuleItems(ruleset),
    ...collectConditionItems(ruleset),
  ];

  cachedIndexes[ruleset] = items;
  return items;
}

export function searchOmniIndex(
  query: string,
  ruleset: Ruleset = "RULES_2014",
  categoryFilter?: OmniSearchCategory | "ALL"
): OmniSearchItem[] {
  const matcher = buildQueryMatcher(query);
  if (!matcher) return [];

  const ranked: Array<{ item: OmniSearchItem; rank: number }> = [];
  for (const entry of collectSearchEntries(ruleset)) {
    if (categoryFilter && categoryFilter !== "ALL" && entry.item.category !== categoryFilter) continue;
    if (!matchesQuery(matcher, entry.text) && !matchesExactAlias(matcher, entry.exactAliases)) continue;
    ranked.push({
      item: entry.item,
      rank: findMatchRank(matcher, entry.item.title, entry.item.subtitle, entry.item.aliases),
    });
  }

  return ranked
    .sort(
      (a, b) =>
        a.rank - b.rank ||
        findCategoryTieBreakPriority(a.item.category) - findCategoryTieBreakPriority(b.item.category) ||
        a.item.title.length - b.item.title.length
    )
    .slice(0, MAX_SEARCH_RESULTS)
    .map((entry) => entry.item);
}

function findCategoryTieBreakPriority(category: OmniSearchCategory): number {
  return CATEGORY_TIE_BREAK_PRIORITY[category] ?? DEFAULT_CATEGORY_TIE_BREAK_PRIORITY;
}


function matchesExactAlias(matcher: QueryMatcher, exactAliases: string[]): boolean {
  return exactAliases.length > 0 && matcher.phrases.some((phrase) => exactAliases.includes(phrase));
}

function collectSearchEntries(ruleset: Ruleset): SearchEntry[] {
  const cached = cachedEntries[ruleset];
  if (cached) return cached;

  const entries = buildOmniSearchIndex(ruleset).map((item) => {
    const aliases = item.aliases ?? [];
    const longAliases = aliases.filter((alias) => alias.length >= SHORT_ALIAS_LENGTH);
    const shortAliases = aliases.filter((alias) => alias.length < SHORT_ALIAS_LENGTH);

    return {
      item,
      text: buildSearchableText([item.title, item.subtitle, ...(item.keywords ?? []), ...longAliases]),
      exactAliases: shortAliases.map(normalizeSearchText),
    };
  });

  cachedEntries[ruleset] = entries;
  return entries;
}


/// Classes, subclasses and races used to send the reader into the character creator, because
/// that was the only screen listing them. KR15.6 gave them catalogs, so a hit now opens the
/// catalog with that entry already selected.
function findRaceHref(ruleset: Ruleset, engName: string): string {
  return `${findRoutePrefix(ruleset)}/races?race=${toEntitySlug(engName)}`;
}

function findClassHref(ruleset: Ruleset, engName: string): string {
  return `${findRoutePrefix(ruleset)}/classes?class=${toEntitySlug(engName)}`;
}

/// A subclass has no page of its own — it opens its class and gets found by the catalog's own
/// search box, which reads subclass names into its haystack.
function findSubclassHref(ruleset: Ruleset, className: string, subclassName: string): string {
  return `${findRoutePrefix(ruleset)}/classes?class=${toEntitySlug(className)}&q=${encodeURIComponent(subclassName)}`;
}

function stripBracketedSuffix(name: string): string {
  return name.replace(/\s*\[.*?\]/g, "").trim() || name;
}

function collectSpellItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllSpells(ruleset).map((spell) => {
    const levelLabel = spell.level === 0 ? "Фокус" : `Рівень ${spell.level}`;
    const cleanTitle = stripBracketedSuffix(spell.name);

    return {
      id: `spell-${spell.spellId}`,
      title: cleanTitle,
      subtitle: spell.engName,
      category: "spells" as const,
      categoryLabel: OMNI_CATEGORY_LABELS.spells,
      href: `${prefix}/spells?q=${encodeURIComponent(cleanTitle)}`,
      badge: levelLabel,
      keywords: [
        spell.school ?? "",
        spell.source,
        levelLabel,
        spell.name,
      ],
      aliases: findAliasVariants(ruleset, ["spell"], [toEntitySlug(spell.engName), cleanTitle]),
      visualKey: spell.school ?? null,
    };
  });
}

function collectMagicItemItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllMagicItems(ruleset).map((magicItem) => {
    const rarityLabel = itemRarityTranslations[magicItem.rarity] || magicItem.rarity;
    const cleanTitle = stripBracketedSuffix(magicItem.name);
    const source = (magicItem as { source?: string }).source ?? "";

    return {
      id: `item-${magicItem.magicItemId}`,
      title: cleanTitle,
      subtitle: magicItem.engName,
      category: "magic-items" as const,
      categoryLabel: OMNI_CATEGORY_LABELS["magic-items"],
      href: `${prefix}/magic-items?q=${encodeURIComponent(cleanTitle)}`,
      badge: rarityLabel,
      keywords: [
        magicItem.itemType,
        String(source),
        rarityLabel,
        magicItem.name,
      ],
      aliases: findAliasVariants(ruleset, ["magic-item"], [toEntitySlug(magicItem.engName), cleanTitle]),
      visualKey: magicItem.itemType,
    };
  });
}

function collectWeaponItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllWeapons(ruleset).map((weapon) => {
    const nameUa =
      weaponTranslations[weapon.code as keyof typeof weaponTranslations] || weapon.nameUa || weapon.name;

    return {
      id: `weapon-${weapon.id}`,
      title: nameUa,
      subtitle: weapon.engName,
      category: "weapons" as const,
      categoryLabel: OMNI_CATEGORY_LABELS.weapons,
      href: `${prefix}/weapons?q=${encodeURIComponent(nameUa)}`,
      badge: `${weapon.damage} ${weapon.damageType}`,
      keywords: [
        String(weapon.weaponType),
        weapon.source,
        ...weapon.properties,
      ],
      aliases: findAliasVariants(ruleset, ["weapon"], [weapon.code, toEntitySlug(weapon.engName), nameUa]),
      visualKey: String(weapon.weaponType),
      visualKeySecondary: weapon.isRanged,
    };
  });
}

function collectArmorItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllArmors(ruleset).map((armor) => {
    const typeLabel =
      armorTypeTranslations[armor.armorType as keyof typeof armorTypeTranslations] || armor.armorType;
    const title = armor.nameUa || armor.name;

    return {
      id: `armor-${armor.id}`,
      title,
      subtitle: armor.engName,
      category: "armor" as const,
      categoryLabel: OMNI_CATEGORY_LABELS.armor,
      href: `${prefix}/armor?q=${encodeURIComponent(title)}`,
      badge: `КБ ${armor.baseAC}`,
      keywords: [
        String(typeLabel),
        armor.source,
      ],
      aliases: findAliasVariants(ruleset, ["armor"], [toEntitySlug(armor.engName), title]),
      visualKey: String(armor.armorType),
    };
  });
}

function collectCreatureItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);
  const editionLabel = findEditionLabel(ruleset);

  return getAllCreatures(ruleset).map((creature) => {
    const crLabel = creature.challenge && creature.challenge !== "-" ? `CR ${creature.challenge}` : "Саммон";

    return {
      id: `creature-${creature.creatureId}`,
      title: creature.name,
      subtitle: creature.nameEng,
      category: "bestiary" as const,
      categoryLabel: OMNI_CATEGORY_LABELS.bestiary,
      href: `${prefix}/bestiary/${toEntitySlug(creature.nameEng)}`,
      badge: crLabel,
      edition: editionLabel,
      keywords: [
        creature.type,
        creature.size,
        creature.alignment,
        creature.source,
        creature.challenge,
        `CR ${creature.challenge}`,
      ],
      aliases: findAliasVariants(ruleset, ["creature"], [toEntitySlug(creature.nameEng), creature.name]),
      visualKey: creature.type,
    };
  });
}

function collectFeatItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllFeats(ruleset).map((feat) => ({
    id: `feat-${feat.featId}`,
    title: feat.name,
    subtitle: feat.engName,
    category: "feats" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.feats,
    href: `${prefix}/feats?q=${encodeURIComponent(feat.name)}`,
    badge: feat.category ?? undefined,
    keywords: [
      feat.source,
      feat.prerequisite ?? "",
    ],
    aliases: findAliasVariants(ruleset, ["feat"], [toEntitySlug(feat.engName), feat.name]),
    visualKey: feat.category ?? null,
  }));
}

function collectInvocationItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllInvocations(ruleset).map((invocation) => {
    const title = invocation.nameUa || invocation.name;

    return {
      id: `inv-${invocation.id}`,
      title,
      subtitle: invocation.engName,
      category: "invocations" as const,
      categoryLabel: OMNI_CATEGORY_LABELS.invocations,
      href: `${prefix}/invocations?q=${encodeURIComponent(title)}`,
      badge: invocation.minLevel ? `Рівень ${invocation.minLevel}` : undefined,
      keywords: [
        invocation.source,
        invocation.prerequisite ?? "",
      ],
      aliases: findAliasVariants(ruleset, ["invocation"], [toEntitySlug(invocation.engName), title]),
      visualKey: invocation.pactRequirement,
      visualKeySecondary: invocation.minLevel,
    };
  });
}

/// Бастіони існують лише в DMG 2024, тож в індексі 2014 їх немає взагалі — інакше пошук
/// пропонував би сторінку, на яку гейт `isRules2024Allowed` однаково не пустить.
function collectBastionItems(ruleset: Ruleset): OmniSearchItem[] {
  if (ruleset !== "RULES_2024") return [];

  return getAllBastionFacilities().map((facility) => ({
    id: `bastion-${facility.slug}`,
    title: facility.name,
    subtitle: facility.engName,
    category: "bastions" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.bastions,
    href: `/2024/bastions/${facility.slug}`,
    badge: facility.level === null ? "Базове" : `Рівень ${facility.level}`,
    keywords: [facility.source, facility.prerequisiteText, facility.shortDescription],
    aliases: findAliasVariants(ruleset, ["bastion"], [facility.slug, facility.name]),
    visualKey: facility.orders[0] ?? null,
  }));
}

/// Доповнення власника, 2026-08-22: «бекграунд», «передісторія», «історія» мають вести на сам
/// каталог Походжень, а не на конкретний запис — тому це один додатковий пункт індексу, а не
/// аліас кожної з ~90 сутностей.
/// Підрозділ «Ваш хід у бою» люди шукають словами, яких у тексті немає.
const RULE_SUBSECTION_ALIASES: Record<string, string[]> = {
  "your-turn": ["вільна дія", "вільні дії", "безкоштовна дія", "основна дія"],
};

const BACKGROUND_CATEGORY_ALIASES = ["бекграунд", "бекграунди", "передісторія", "історія"];

function collectBackgroundItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  const items = getAllBackgrounds(ruleset).map((background) => ({
    id: `background-${background.backgroundId}`,
    title: background.name,
    subtitle: background.engName,
    category: "backgrounds" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.backgrounds,
    href: `${prefix}/backgrounds/${background.slug}`,
    badge: background.originFeat ? background.originFeat.nameUa : background.specialAbilityName ?? undefined,
    keywords: [
      background.source,
      ...background.skills.map((skill) => skill.nameUa),
      ...background.tools,
    ],
    aliases: findAliasVariants(ruleset, ["background"], [background.slug, background.name]),
    visualKey: background.source,
  }));

  return [...items, collectBackgroundCategoryShortcut(ruleset)];
}

function collectBackgroundCategoryShortcut(ruleset: Ruleset): OmniSearchItem {
  return {
    id: "category-backgrounds",
    title: OMNI_CATEGORY_LABELS.backgrounds,
    category: "backgrounds",
    categoryLabel: OMNI_CATEGORY_LABELS.backgrounds,
    href: findCategoryCatalogHref("backgrounds", ruleset),
    badge: "Каталог",
    aliases: BACKGROUND_CATEGORY_ALIASES,
  };
}

function collectClassItems(ruleset: Ruleset): OmniSearchItem[] {
  return getAllClasses(ruleset).map((characterClass) => ({
    id: `class-${characterClass.key}`,
    title: characterClass.name,
    subtitle: characterClass.engName,
    category: "classes" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.classes,
    href: findClassHref(ruleset, characterClass.engName),
    badge: "Клас",
    keywords: ["персонаж", "створення", characterClass.engName],
    aliases: findAliasVariants(
      ruleset,
      ["class"],
      [toEntitySlug(characterClass.engName), characterClass.name],
    ),
  }));
}

function collectSubclassItems(ruleset: Ruleset): OmniSearchItem[] {
  return getAllClasses(ruleset).flatMap((characterClass) =>
    characterClass.subclasses.map((subclass) => ({
      id: `subclass-${characterClass.key}-${subclass.key}`,
      title: subclass.name,
      subtitle: `${subclass.engName} · ${characterClass.name}`,
      category: "classes" as const,
      categoryLabel: OMNI_CATEGORY_LABELS.classes,
      href: findSubclassHref(ruleset, characterClass.engName, subclass.name),
      badge: "Підклас",
      keywords: ["підклас", "персонаж", "створення", subclass.engName, characterClass.name],
      aliases: findAliasVariants(
        ruleset,
        ["subclass"],
        [toEntitySlug(subclass.engName), subclass.name],
      ),
    })),
  );
}

function collectRaceItems(ruleset: Ruleset): OmniSearchItem[] {
  return getAllRaces(ruleset).map((race) => ({
    id: `race-${race.key}`,
    title: race.name,
    subtitle: race.engName,
    category: "races" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.races,
    href: findRaceHref(ruleset, race.engName),
    badge: RACE_SINGULAR[ruleset],
    keywords: ["персонаж", "створення", race.engName],
    aliases: findAliasVariants(
      ruleset,
      ["race", "species"],
      [toEntitySlug(race.engName), race.name],
    ),
  }));
}

function collectRuleArticles(ruleset: Ruleset): RuleArticle[] {
  return ruleset === "RULES_2024" ? getAllRuleArticles2024() : getAllRuleArticles2014();
}

function collectRuleItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);
  const items: OmniSearchItem[] = [];

  for (const article of collectRuleArticles(ruleset)) {
    const articleAliases = findAliasVariants(ruleset, ["rule"], [article.slug, article.title]);

    items.push({
      id: `rule-${article.id}`,
      title: article.title,
      subtitle: article.engTitle,
      category: "rules",
      categoryLabel: OMNI_CATEGORY_LABELS.rules,
      href: `${prefix}/rules/${article.category}#${article.slug}`,
      badge: article.category,
      keywords: [article.category, ...article.tags, article.summary],
      aliases: articleAliases,
      visualKey: article.category,
    });

    for (const subsection of article.subsections) {
      items.push({
        id: `rule-${article.id}-${subsection.id}`,
        title: subsection.title,
        subtitle: subsection.engTitle ?? article.title,
        category: "rules",
        categoryLabel: OMNI_CATEGORY_LABELS.rules,
        href: `${prefix}/rules/${article.category}#${subsection.id}`,
        badge: article.title,
        keywords: [
          article.category,
          article.title,
          ...article.tags,
          subsection.content,
          subsection.callout?.title ?? "",
          subsection.callout?.text ?? "",
        ],
        aliases: [
          ...articleAliases,
          ...findAliasVariants(ruleset, ["rule"], [subsection.id, subsection.title]),
          ...(RULE_SUBSECTION_ALIASES[subsection.id] ?? []),
        ],
        visualKey: article.category,
      });
    }
  }

  return items;
}

function collectConditions(ruleset: Ruleset) {
  return ruleset === "RULES_2024" ? getConditions2024() : getAllConditions(ruleset);
}

function collectConditionItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return collectConditions(ruleset).map((condition) => ({
    id: `condition-${condition.id}`,
    title: condition.name,
    subtitle: condition.engName,
    category: "rules" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.rules,
    href: `${prefix}/rules/conditions#${condition.id}`,
    badge: "Стан",
    keywords: [
      "Стани",
      "Condition",
      condition.description,
      ...condition.bulletPoints,
    ],
    aliases: findAliasVariants(ruleset, ["condition"], [condition.id, condition.name]),
    visualKey: "condition",
  }));
}
