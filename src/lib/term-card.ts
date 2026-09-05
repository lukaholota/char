/**
 * Картка терміна для модалки маркера `термін{{Original}}` (KR30.3): що словник каже про
 * оригінал, якими ще словами його шукають, чи є про нього стаття довідника, стан або запис
 * каталогу. Чиста функція над переданими джерелами — дані підкладає `term-catalog-chunk.ts`,
 * а тести підкладають свої.
 */

import type { Ruleset } from "@prisma/client";
import type { ConditionData, RuleArticle } from "@/lib/rulesData";
import type { TermLink } from "@/lib/term-link";
import { toEntitySlug } from "@/lib/slug-utils";

export type TermDictionaryEntry = { term: string; section: string };

export type TermArticle = {
  title: string;
  summary: string;
  href: string;
  ruleset: Ruleset;
  subsection: { title: string; content: string } | null;
};

export type TermCondition = {
  name: string;
  description: string;
  bulletPoints: string[];
  href: string;
  ruleset: Ruleset;
};

export type TermCatalogEntry = { kind: "weapon" | "armor"; name: string; href: string };

export type TermCard = {
  original: string;
  ruleset: Ruleset;
  dictionary: TermDictionaryEntry[];
  aliases: string[];
  article: TermArticle | null;
  condition: TermCondition | null;
  catalog: TermCatalogEntry | null;
};

export type NamedCatalogEntry = { engName: string; name: string };

export type TermSources = {
  articles: Record<Ruleset, RuleArticle[]>;
  conditions: Record<Ruleset, ConditionData[]>;
  dictionary: Record<string, unknown>;
  weapons: Record<Ruleset, NamedCatalogEntry[]>;
  armors: Record<Ruleset, NamedCatalogEntry[]>;
  findAliases: (ruleset: Ruleset, entityTypes: string[], keys: string[]) => string[];
};

const RULESETS_IN_ORDER = (ruleset: Ruleset): Ruleset[] =>
  ruleset === "RULES_2024" ? ["RULES_2024", "RULES_2014"] : ["RULES_2014", "RULES_2024"];

const ALIAS_ENTITY_TYPES = ["rule", "class", "subclass", "race", "species", "spell", "creature", "magic-item"];

const DICTIONARY_SECTION_LABELS: Record<string, string> = {
  attributes: "характеристики",
  skills: "навички",
  classes: "класи",
  races: "раси",
  additionalRaces: "раси",
  rules: "правила",
  rules2024: "правила 2024",
  conditions: "стани",
  alignments: "світогляди",
  damageTypes: "типи шкоди",
  creatureSizes: "розміри істот",
  creatureTypes: "типи істот",
  creatureTypeTags: "підтипи істот",
  spellSchools: "школи магії",
  generalTerms: "загальні терміни",
  dice: "кубики",
  classFeatures: "риси класів 2014",
  classFeatures2024: "риси класів 2024",
  equipment: "спорядження",
  lifestyleLevels: "рівні життя",
  mountsAndVehicles: "їздові тварини й транспорт",
  currency: "валюта",
  restAndRecovery: "відпочинок",
  environments: "середовища",
  planes: "плани існування",
  campaignSettings: "сетинги",
  gemstones: "коштовне каміння",
  magicItemTypes: "типи магічних предметів",
  materials: "матеріали",
  distanceAndTime: "відстань і час",
  combatActions: "дії в бою",
  statblockFeatures: "риси статблока",
  namedStatblocks: "іменовані статблоки",
  variantRules: "варіанти правил",
  siegeEquipment: "облогова техніка",
  diseases: "хвороби",
  trapsAndHazards: "пастки й небезпеки",
  characterOrigin: "походження персонажа",
};

export function buildTermCard(link: TermLink, sources: TermSources): TermCard {
  const dictionary = findDictionaryEntries(link.original, sources.dictionary);
  const article = findArticle(link, sources.articles);
  const condition = findCondition(link, sources.conditions);
  const catalog = findCatalogEntry(link, sources);
  const aliases = collectAliases(link, dictionary, article, sources.findAliases);

  return { original: link.original, ruleset: link.ruleset, dictionary, aliases, article, condition, catalog };
}

export function findRoutePrefix(ruleset: Ruleset): string {
  return ruleset === "RULES_2024" ? "/2024" : "";
}

function findDictionaryEntries(original: string, dictionary: Record<string, unknown>): TermDictionaryEntry[] {
  const wanted = normalizeTerm(original);
  const found: TermDictionaryEntry[] = [];

  for (const [section, value] of Object.entries(dictionary)) {
    const label = DICTIONARY_SECTION_LABELS[section] ?? section;
    for (const [key, term] of collectLeafPairs(value)) {
      if (isSameTerm(key, wanted) && !found.some((entry) => entry.term === term)) {
        found.push({ term, section: label });
      }
    }
  }

  return found;
}

function collectLeafPairs(value: unknown): Array<[string, string]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, leaf]) =>
    typeof leaf === "string" ? [[key, leaf] as [string, string]] : collectLeafPairs(leaf)
  );
}

function findArticle(link: TermLink, articles: Record<Ruleset, RuleArticle[]>): TermArticle | null {
  const wanted = normalizeTerm(link.original);

  for (const ruleset of RULESETS_IN_ORDER(link.ruleset)) {
    for (const article of articles[ruleset]) {
      if (isSameTerm(article.engTitle, wanted)) {
        return {
          title: article.title,
          summary: article.summary,
          href: `${findRoutePrefix(ruleset)}/rules/${article.category}#${article.slug}`,
          ruleset,
          subsection: null,
        };
      }
    }
    for (const article of articles[ruleset]) {
      const subsection = article.subsections.find((section) => isSameTerm(section.engTitle ?? "", wanted));
      if (subsection) {
        return {
          title: article.title,
          summary: article.summary,
          href: `${findRoutePrefix(ruleset)}/rules/${article.category}#${subsection.id}`,
          ruleset,
          subsection: { title: subsection.title, content: subsection.content },
        };
      }
    }
  }

  return null;
}

function findCondition(link: TermLink, conditions: Record<Ruleset, ConditionData[]>): TermCondition | null {
  const wanted = normalizeTerm(link.original);

  for (const ruleset of RULESETS_IN_ORDER(link.ruleset)) {
    const condition = conditions[ruleset].find((entry) => isSameTerm(entry.engName, wanted));
    if (condition) {
      return {
        name: condition.name,
        description: condition.description,
        bulletPoints: condition.bulletPoints,
        href: `${findRoutePrefix(ruleset)}/rules/conditions#${condition.id}`,
        ruleset,
      };
    }
  }

  return null;
}

function findCatalogEntry(link: TermLink, sources: TermSources): TermCatalogEntry | null {
  const wanted = normalizeTerm(link.original);
  const catalogs: Array<[TermCatalogEntry["kind"], Record<Ruleset, NamedCatalogEntry[]>, string]> = [
    ["weapon", sources.weapons, "weapons"],
    ["armor", sources.armors, "armor"],
  ];

  for (const ruleset of RULESETS_IN_ORDER(link.ruleset)) {
    for (const [kind, byRuleset, path] of catalogs) {
      const entry = byRuleset[ruleset].find((item) => isSameTerm(item.engName, wanted));
      if (entry) {
        return { kind, name: entry.name, href: `${findRoutePrefix(ruleset)}/${path}/${toEntitySlug(entry.engName)}` };
      }
    }
  }

  return null;
}

function collectAliases(
  link: TermLink,
  dictionary: TermDictionaryEntry[],
  article: TermArticle | null,
  findAliases: TermSources["findAliases"]
): string[] {
  const keys = [toEntitySlug(link.original), ...dictionary.map((entry) => entry.term)];
  const found = new Set(findAliases(link.ruleset, ALIAS_ENTITY_TYPES, keys));
  if (article) {
    const slug = article.href.split("#")[1] ?? "";
    for (const alias of findAliases(article.ruleset, ["rule"], [slug, article.title])) found.add(alias);
  }
  return [...found];
}

/// «Animal Handling», «animalHandling» і «animal-handling» — один ключ. Порівняння йде
/// по словах у нижньому регістрі, бо словник тримає camelCase, а маркер — назву з книги.
function normalizeTerm(value: string): string {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_\-–—]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

function isSameTerm(candidate: string, wanted: string): boolean {
  return candidate !== "" && normalizeTerm(candidate) === wanted;
}
