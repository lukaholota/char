import type { RulesetId } from "./strategies/types";

/** SRD 5.2, «Choose Languages»: кожен персонаж знає Загальну плюс дві мови зі стандартної таблиці. */
export const ORIGIN_LANGUAGE_2024 = "COMMON";

export const STANDARD_LANGUAGES_2024: readonly string[] = [
  "COMMON",
  "COMMON_SIGN_LANGUAGE",
  "DRACONIC",
  "DWARVISH",
  "ELVISH",
  "GIANT",
  "GNOMISH",
  "GOBLIN",
  "HALFLING",
  "ORC",
];

const ORIGIN_LANGUAGE_CHOICES_2024 = 2;

/**
 * 2014 складає лічильники виду, підвиду, класу, походження й рис. 2024 походження не складає — Origin
 * дає рівно дві мови, скільки б джерел щось не обіцяло; понад них — лише мови від рис класу (Жаргон злодіїв).
 */
export function countOriginLanguageChoices(
  ruleset: RulesetId,
  sourceCounts: ReadonlyArray<number | null | undefined>,
  featureCounts: ReadonlyArray<number | null | undefined> = [],
): number {
  const fromFeatures = sumCounts(featureCounts);
  if (ruleset === "RULES_2024") return ORIGIN_LANGUAGE_CHOICES_2024 + fromFeatures;
  return sumCounts(sourceCounts) + fromFeatures;
}

function sumCounts(counts: ReadonlyArray<number | null | undefined>): number {
  return counts.reduce<number>((total, count) => total + toCount(count), 0);
}

export function collectOriginLanguages(ruleset: RulesetId, granted: readonly string[]): string[] {
  const languages = ruleset === "RULES_2024" ? [ORIGIN_LANGUAGE_2024, ...granted] : granted;
  return Array.from(new Set(languages.filter(Boolean)));
}

/**
 * Порядок у списку вибору — за поширеністю, а не за абеткою англійської назви. Інакше другою
 * стоїть Загальна мова жестів: у таблиці SRD вона йде одразу за Common, а гравець її майже не
 * бере й натикається на неї першою.
 *
 * Список статичний і навмисно не рахується на льоту. Цифри зняті один раз із робочої бази
 * 2026-09-20 по 10 394 персонажах (`pers.custom_languages_known`): ельфійська 4 369, дворфська
 * 2 160, пекельна 1 603, драконяча 1 574, злодійський жаргон 1 358, друїдська 1 078, гномʼяча
 * 1 051, сільван 945, оркська 828, небесна 807, напівросликів 729, безодні 685, жестів 682,
 * велетнів 581, первинна 562, гоблінська 536, глибинна 468, підземна 368. Це всі відомі
 * персонажам мови, не лише обрані вручну, тож расові дарунки теж тягнуть свої мови вгору — для
 * порядку в списку цього досить.
 *
 * Мови, яких тут немає, йдуть після названих у тому порядку, у якому їх дає каталог.
 */
const LANGUAGE_ORDER_BY_POPULARITY: readonly string[] = [
  "COMMON",
  "ELVISH",
  "DWARVISH",
  "INFERNAL",
  "DRACONIC",
  "THIEVES_CANT",
  "DRUIDIC",
  "GNOMISH",
  "SYLVAN",
  "ORC",
  "CELESTIAL",
  "HALFLING",
  "ABYSSAL",
  "COMMON_SIGN_LANGUAGE",
  "GIANT",
  "PRIMORDIAL",
  "GOBLIN",
  "DEEP_SPEECH",
  "UNDERCOMMON",
];

function rankLanguage(language: string): number {
  const rank = LANGUAGE_ORDER_BY_POPULARITY.indexOf(language);
  return rank === -1 ? LANGUAGE_ORDER_BY_POPULARITY.length : rank;
}

export function listChoosableLanguages(
  ruleset: RulesetId,
  allLanguages: readonly string[],
  known: readonly string[],
): string[] {
  const knownLanguages = new Set(known);
  const pool = ruleset === "RULES_2024" ? STANDARD_LANGUAGES_2024 : allLanguages;

  return pool
    .filter((language) => !knownLanguages.has(language))
    .sort((left, right) => rankLanguage(left) - rankLanguage(right));
}

function toCount(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, Math.trunc(value)) : 0;
}
