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
import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllRuleArticles, getAllConditions, RuleArticle } from "@/lib/rulesData";
import { getAllRuleArticles2024 } from "@/lib/rules2024Data";
import {
  itemRarityTranslations,
  weaponTranslations,
  armorTypeTranslations,
  subclassTranslations,
  subclassTranslationsEng,
} from "@/lib/refs/translation";
import { toEntitySlug } from "@/lib/slug-utils";
import { findAliasVariants } from "@/lib/search/searchAliases";
import {
  buildQueryMatcher,
  buildSearchableText,
  findMatchRank,
  matchesQuery,
  normalizeSearchText,
  QueryMatcher,
  SearchableText,
} from "@/lib/search/searchQuery";

export type OmniSearchCategory =
  | "spells"
  | "magic-items"
  | "weapons"
  | "armor"
  | "bestiary"
  | "feats"
  | "invocations"
  | "backgrounds"
  | "classes"
  | "races"
  | "rules"
  | "characters";

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

export const OMNI_CATEGORY_LABELS: Record<OmniSearchCategory, string> = {
  spells: "Заклинання",
  "magic-items": "Магічні предмети",
  weapons: "Зброя",
  armor: "Обладунки",
  bestiary: "Бестіарій",
  feats: "Риси",
  invocations: "Потойбічні виклики",
  backgrounds: "Походження",
  classes: "Класи",
  races: "Раси / Види",
  rules: "Довідник правил",
  characters: "Мої персонажі",
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

const CLASSES_2014 = [
  { key: "ARTIFICER_2014", name: "Винахідник", engName: "Artificer" },
  { key: "BARBARIAN_2014", name: "Варвар", engName: "Barbarian" },
  { key: "BARD_2014", name: "Бард", engName: "Bard" },
  { key: "CLERIC_2014", name: "Клірик", engName: "Cleric" },
  { key: "DRUID_2014", name: "Друїд", engName: "Druid" },
  { key: "FIGHTER_2014", name: "Воїн", engName: "Fighter" },
  { key: "MONK_2014", name: "Монах", engName: "Monk" },
  { key: "PALADIN_2014", name: "Паладин", engName: "Paladin" },
  { key: "RANGER_2014", name: "Слідопит", engName: "Ranger" },
  { key: "ROGUE_2014", name: "Пройдисвіт", engName: "Rogue" },
  { key: "SORCERER_2014", name: "Чародій", engName: "Sorcerer" },
  { key: "WARLOCK_2014", name: "Чорнокнижник", engName: "Warlock" },
  { key: "WIZARD_2014", name: "Чарівник", engName: "Wizard" },
];

const CLASSES_2024 = [
  { key: "BARBARIAN_2024", name: "Варвар", engName: "Barbarian" },
  { key: "BARD_2024", name: "Бард", engName: "Bard" },
  { key: "CLERIC_2024", name: "Клірик", engName: "Cleric" },
  { key: "DRUID_2024", name: "Друїд", engName: "Druid" },
  { key: "FIGHTER_2024", name: "Воїн", engName: "Fighter" },
  { key: "MONK_2024", name: "Монах", engName: "Monk" },
  { key: "PALADIN_2024", name: "Паладин", engName: "Paladin" },
  { key: "RANGER_2024", name: "Слідопит", engName: "Ranger" },
  { key: "ROGUE_2024", name: "Пройдисвіт", engName: "Rogue" },
  { key: "SORCERER_2024", name: "Чародій", engName: "Sorcerer" },
  { key: "WARLOCK_2024", name: "Чорнокнижник", engName: "Warlock" },
  { key: "WIZARD_2024", name: "Чарівник", engName: "Wizard" },
];

const RACES_2024 = [
  { name: "Аазимар", engName: "Aasimar" },
  { name: "Дракононароджений", engName: "Dragonborn" },
  { name: "Дворф", engName: "Dwarf" },
  { name: "Ельф", engName: "Elf" },
  { name: "Гном", engName: "Gnome" },
  { name: "Голіаф", engName: "Goliath" },
  { name: "Напіврослик", engName: "Halfling" },
  { name: "Людина", engName: "Human" },
  { name: "Орк", engName: "Orc" },
  { name: "Тифлінг", engName: "Tiefling" },
];

const RACES_2014 = [
  { name: "Дракононароджений", engName: "Dragonborn" },
  { name: "Дворф", engName: "Dwarf" },
  { name: "Ельф", engName: "Elf" },
  { name: "Гном", engName: "Gnome" },
  { name: "Напівельф", engName: "Half-Elf" },
  { name: "Напіворк", engName: "Half-Orc" },
  { name: "Напіврослик", engName: "Halfling" },
  { name: "Людина", engName: "Human" },
  { name: "Тифлінг", engName: "Tiefling" },
  { name: "Аазимар", engName: "Aasimar" },
  { name: "Голіаф", engName: "Goliath" },
  { name: "Табаксі", engName: "Tabaxi" },
  { name: "Тритон", engName: "Triton" },
  { name: "Кенку", engName: "Kenku" },
  { name: "Кобольд", engName: "Kobold" },
  { name: "Гоблін", engName: "Goblin" },
  { name: "Хобгоблін", engName: "Hobgoblin" },
  { name: "Ведмебай", engName: "Bugbear" },
  { name: "Черепаха", engName: "Tortle" },
  { name: "Воєнокований", engName: "Warforged" },
  { name: "Змінник", engName: "Changeling" },
];

/// SRD 5.1 не знає терміна «вільна дія» — жодного входження «free action». Найближче за змістом
/// у 2014 — безкоштовна взаємодія з предметом у підрозділі «Ваш хід у бою», тож запит веде туди.
const RULE_SUBSECTION_ALIASES: Record<string, string[]> = {
  "your-turn": ["вільна дія", "вільні дії", "безкоштовна дія", "основна дія"],
};

const CATEGORY_CATALOG_PATHS: Record<OmniSearchCategory, string> = {
  spells: "/spells",
  "magic-items": "/magic-items",
  weapons: "/weapons",
  armor: "/armor",
  bestiary: "/bestiary",
  feats: "/feats",
  invocations: "/invocations",
  backgrounds: "/backgrounds",
  classes: "/char/create",
  races: "/char/create",
  rules: "/rules",
  characters: "/char/home",
};

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

export function findCategoryCatalogHref(
  category: OmniSearchCategory,
  ruleset: Ruleset = "RULES_2014"
): string {
  if (category === "classes" || category === "races") return findCreatorHref(ruleset);
  if (category === "characters") return CATEGORY_CATALOG_PATHS.characters;
  return `${findRoutePrefix(ruleset)}${CATEGORY_CATALOG_PATHS[category]}`;
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

function findRoutePrefix(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "/2024" : "";
}

function findCreatorHref(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "/2024/char" : "/char/create";
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

/// Доповнення власника, 2026-08-22: «бекграунд», «передісторія», «історія» мають вести на сам
/// каталог Походжень, а не на конкретний запис — тому це один додатковий пункт індексу, а не
/// аліас кожної з ~90 сутностей.
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
  const prefix = findRoutePrefix(ruleset);

  return {
    id: "category-backgrounds",
    title: OMNI_CATEGORY_LABELS.backgrounds,
    category: "backgrounds",
    categoryLabel: OMNI_CATEGORY_LABELS.backgrounds,
    href: `${prefix}${CATEGORY_CATALOG_PATHS.backgrounds}`,
    badge: "Каталог",
    aliases: BACKGROUND_CATEGORY_ALIASES,
  };
}

function collectClassItems(ruleset: Ruleset): OmniSearchItem[] {
  const classList = ruleset === "RULES_2024" ? CLASSES_2024 : CLASSES_2014;

  return classList.map((classEntry) => ({
    id: `class-${classEntry.key}`,
    title: classEntry.name,
    subtitle: classEntry.engName,
    category: "classes" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.classes,
    href: findCreatorHref(ruleset),
    badge: "Клас",
    keywords: [
      "персонаж",
      "створення",
      classEntry.engName,
    ],
    aliases: findAliasVariants(ruleset, ["class"], [toEntitySlug(classEntry.engName), classEntry.name]),
  }));
}

/// Підкласи живуть лише у перекладних таблицях: 166 ключів, з них 48 із суфіксом _2024.
/// Суфікс і є ознакою редакції — так само, як у ключах класів.
function collectSubclassItems(ruleset: Ruleset): OmniSearchItem[] {
  const is2024 = ruleset === "RULES_2024";
  const engNames: Record<string, string> = subclassTranslationsEng;

  return Object.entries(subclassTranslations)
    .filter(([key]) => key.endsWith("_2024") === is2024)
    .map(([key, nameUa]) => {
      const engName = engNames[key] ?? key;

      return {
        id: `subclass-${key}`,
        title: nameUa,
        subtitle: engName,
        category: "classes" as const,
        categoryLabel: OMNI_CATEGORY_LABELS.classes,
        href: findCreatorHref(ruleset),
        badge: "Підклас",
        keywords: ["підклас", "персонаж", "створення", engName],
        aliases: findAliasVariants(ruleset, ["subclass"], [toEntitySlug(engName), nameUa]),
      };
    });
}

function collectRaceItems(ruleset: Ruleset): OmniSearchItem[] {
  const is2024 = ruleset === "RULES_2024";
  const raceList = is2024 ? RACES_2024 : RACES_2014;

  return raceList.map((race) => ({
    id: `race-${race.engName}`,
    title: race.name,
    subtitle: race.engName,
    category: "races" as const,
    categoryLabel: OMNI_CATEGORY_LABELS.races,
    href: findCreatorHref(ruleset),
    badge: is2024 ? "Вид" : "Раса",
    keywords: [
      "персонаж",
      "створення",
      race.engName,
    ],
    aliases: findAliasVariants(ruleset, ["race", "species"], [toEntitySlug(race.engName), race.name]),
  }));
}

/// Articles go in twice: the umbrella record keeps the old href, and every subsection becomes its
/// own record. That is what puts article *bodies* into the index and what makes a hit land on
/// #emanation-area instead of the top of the section (KR13.4, вимоги 3 і 5).
/// KR12.6: getAllRuleArticles(ruleset) для RULES_2024 віддає лише 6 рукописних статей —
/// 203 перекладені з SRD 5.2.1 лежать окремо в getAllRuleArticles2024() і в індекс не потрапляли.
function collectRuleArticles(ruleset: Ruleset): RuleArticle[] {
  return ruleset === "RULES_2024" ? getAllRuleArticles2024() : getAllRuleArticles(ruleset);
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

function collectConditionItems(ruleset: Ruleset): OmniSearchItem[] {
  const prefix = findRoutePrefix(ruleset);

  return getAllConditions(ruleset).map((condition) => ({
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
