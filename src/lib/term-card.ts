/**
 * Картка терміна для модалки маркера `термін{{Original}}` (KR30.3): що словник каже про
 * оригінал, якими ще словами його шукають, чи є про нього стаття довідника, стан або запис
 * каталогу. Чиста функція над переданими джерелами — дані підкладає `term-catalog-chunk.ts`,
 * а тести підкладають свої.
 */

import type { Ruleset } from "@prisma/client";
import type { ConditionData, RuleArticle } from "@/lib/rulesData";
import { findRuleTermHref, listRuleTermLinks, type TermLink } from "@/lib/term-link";
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

export type TermOtherEdition = { ruleset: Ruleset; href: string };

export type TermCard = {
  original: string;
  ruleset: Ruleset;
  dictionary: TermDictionaryEntry[];
  aliases: string[];
  article: TermArticle | null;
  condition: TermCondition | null;
  otherEdition: TermOtherEdition | null;
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
  deities: "божества",
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

/// Стаття й стан беруться лише з редакції сторінки: текст правила 2024 на сторінці 2014 — це
/// саме те мовчазне застосування іншої редакції, яке проєкт забороняє (KR34.1). Коли своєї
/// статті немає, картка несе лише адресу статті іншої редакції, без тексту.
export function buildTermCard(link: TermLink, sources: TermSources): TermCard {
  const dictionary = findDictionaryEntries(link.original, sources.dictionary);
  const article = findArticle(link, sources.articles);
  const condition = findCondition(link, sources.conditions);
  const otherEdition = article || condition ? null : findOtherEdition(link, sources);
  const catalog = isRuleTerm(link.original) ? null : findCatalogEntry(link, sources);
  const aliases = collectAliases(link, dictionary, article, sources.findAliases);

  return { original: link.original, ruleset: link.ruleset, dictionary, aliases, article, condition, otherEdition, catalog };
}

/// Словникова форма варта місця в модалці лише тоді, коли пояснення немає і вона справді інша,
/// ніж слово, на яке натиснули: «Пазур» → «Кіготь». Поруч зі статтею чи станом вона зайва.
export function listDictionaryFormsUnlikeTerm(card: TermCard, clickedTerm: string): string[] {
  if (card.article || card.condition) return [];
  const wanted = foldTerm(clickedTerm);
  return card.dictionary.map((entry) => entry.term).filter((term) => foldTerm(term) !== wanted);
}

/// Картка, у якій немає нічого, крім самого оригіналу, модалки не варта: оригінал уже видно в
/// підказці над словом.
export function hasTermCardMoreThanOriginal(card: TermCard, clickedTerm: string): boolean {
  return Boolean(
    card.article ||
      card.condition ||
      card.otherEdition ||
      card.catalog ||
      card.aliases.length > 0 ||
      listDictionaryFormsUnlikeTerm(card, clickedTerm).length > 0
  );
}

function foldTerm(value: string): string {
  return value.trim().toLocaleLowerCase("uk");
}

export type RuleTermCards = Record<Ruleset, Record<string, TermCard>>;

/// Картки термінів реєстру наперед — легкий чанк для якорів на стани й дії (KR34.2): модалці за
/// ними не потрібні `rules-beyond-srd` і весь словник. Обидві редакції для кожного терміна, бо
/// термін без статті у своїй редакції теж має чесну картку з посиланням на іншу.
export function buildRuleTermCards(sources: TermSources): RuleTermCards {
  const cards: RuleTermCards = { RULES_2014: {}, RULES_2024: {} };
  for (const { original } of listRuleTermLinks()) {
    for (const ruleset of ["RULES_2014", "RULES_2024"] as const) {
      cards[ruleset][original] = buildTermCard({ original, ruleset }, sources);
    }
  }
  return cards;
}

/// Стан чи дія з реєстру — правило, а не спорядження: «Hide» — це «Сховатися», і однойменний
/// шкуряний обладунок у його картці був би чужим записом.
function isRuleTerm(original: string): boolean {
  return listRuleTermLinks().some((entry) => entry.original === original);
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
  const registeredHref = findRuleTermHref(link.original, link.ruleset);
  if (registeredHref) return findArticleByHref(registeredHref, link.ruleset, articles);
  return findArticleByTitle(link, articles);
}

function findArticleByHref(href: string, ruleset: Ruleset, articles: Record<Ruleset, RuleArticle[]>): TermArticle | null {
  const prefix = findRoutePrefix(ruleset);
  for (const article of articles[ruleset]) {
    const articleHref = `${prefix}/rules/${article.category}`;
    if (href === `${articleHref}#${article.slug}`) {
      return { title: article.title, summary: article.summary, href, ruleset, subsection: null };
    }
    const subsection = article.subsections.find((section) => href === `${articleHref}#${section.id}`);
    if (subsection) {
      return {
        title: article.title,
        summary: article.summary,
        href,
        ruleset,
        subsection: { title: subsection.title, content: subsection.content },
      };
    }
  }
  return null;
}

function findArticleByTitle(link: TermLink, articles: Record<Ruleset, RuleArticle[]>): TermArticle | null {
  const { ruleset } = link;
  const wanted = normalizeTitle(link.original);
  const byExactTitle = (title: string) => isSameTerm(title, normalizeTerm(link.original));
  const byTitle = (title: string) => title !== "" && normalizeTitle(title) === wanted;

  for (const matches of [byExactTitle, byTitle]) {
    const article = articles[ruleset].find((entry) => matches(entry.engTitle));
    if (article) {
      return {
        title: article.title,
        summary: article.summary,
        href: `${findRoutePrefix(ruleset)}/rules/${article.category}#${article.slug}`,
        ruleset,
        subsection: null,
      };
    }
  }

  for (const matches of [byExactTitle, byTitle]) {
    for (const article of articles[ruleset]) {
      const subsection = article.subsections.find((section) => matches(section.engTitle ?? ""));
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
  const { ruleset } = link;
  const wanted = normalizeTitle(link.original);
  const condition = conditions[ruleset].find((entry) => entry.engName !== "" && normalizeTitle(entry.engName) === wanted);
  if (!condition) return null;

  return {
    name: condition.name,
    description: condition.description,
    bulletPoints: condition.bulletPoints,
    href: `${findRoutePrefix(ruleset)}/rules/conditions#${buildConditionAnchor(condition.id)}`,
    ruleset,
  };
}

/// На сторінці станів 2024 стоїть і стаття «exhaustion», тож голий `#exhaustion` був би двома
/// елементами з одним id. Префікс розводить їх.
export function buildConditionAnchor(conditionId: string): string {
  return `condition-${conditionId}`;
}

function findOtherEdition(link: TermLink, sources: TermSources): TermOtherEdition | null {
  const other: TermLink = { ...link, ruleset: link.ruleset === "RULES_2024" ? "RULES_2014" : "RULES_2024" };
  const found = findCondition(other, sources.conditions) ?? findArticle(other, sources.articles);
  return found ? { ruleset: found.ruleset, href: found.href } : null;
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

/// Назви статей книга дає в множині («Bonus Actions», «Saving Throws»), а маркер і словник — в
/// однині. Виміряно 2026-09-13 на всіх назвах довідника обох редакцій: пари, що різняться лише
/// кінцевим «s» останнього слова, завжди означають одне поняття. Складені назви («Advantage and
/// Disadvantage») тут не розбираються — «Home Plane and Alignment» знаходився б за «Alignment».
function normalizeTitle(value: string): string {
  const cached = normalizedTitles.get(value);
  if (cached !== undefined) return cached;

  const normalized = normalizeTerm(value)
    .split(" ")
    .map((word, index, words) => (index === words.length - 1 && /[^s]s$/.test(word) ? word.slice(0, -1) : word))
    .join(" ");
  normalizedTitles.set(value, normalized);
  return normalized;
}

const normalizedTitles = new Map<string, string>();

function isSameTerm(candidate: string, wanted: string): boolean {
  if (candidate === "") return false;

  let normalized = normalizedTerms.get(candidate);
  if (normalized === undefined) {
    normalized = normalizeTerm(candidate);
    normalizedTerms.set(candidate, normalized);
  }
  return normalized === wanted;
}

const normalizedTerms = new Map<string, string>();
