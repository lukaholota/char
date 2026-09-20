/**
 * Правила бастіону (DMG 2024): кому він доступний, які приміщення персонажу відповідають і
 * скільки спеціальних приміщень дозволено на його рівні.
 *
 * Механіка бастіонів є лише в DMG 2024, тому редакція — межа: у 2014-персонажа розділу немає
 * взагалі. Рівень же межею не є ([Р26](../../docs/DECISIONS.md#р26)): персонаж 4-го рівня
 * бастіон створює, третє приміщення при ліміті два додає, приміщення з непройденою передумовою
 * теж додає — усе з написом, а не із замком.
 */

import type { BastionFacilityData, BastionOrderCode, BastionRequirement, BastionSpace } from "@/lib/bastion-facility";
import { bastionOrderTranslations } from "@/lib/refs/translation";
import type { Ruleset } from "@/rules/types";

export const BASTION_STANDARD_LEVEL = 5;

export const BASTION_BELOW_STANDARD_LEVEL_HINT =
  `За стандартними правилами бастіони доступні з ${BASTION_STANDARD_LEVEL}-го рівня`;

export type BastionAccess = {
  isOffered: boolean;
  isBelowStandardLevel: boolean;
  isEntryCardShown: boolean;
  isEntryCardMuted: boolean;
};

export function findBastionAccess(input: {
  ruleset: Ruleset;
  characterLevel: number;
  hasBastion: boolean;
}): BastionAccess {
  const isOffered = input.ruleset === "RULES_2024";
  const isBelowStandardLevel = input.characterLevel < BASTION_STANDARD_LEVEL;

  return {
    isOffered,
    isBelowStandardLevel,
    isEntryCardShown: isOffered,
    isEntryCardMuted: isOffered && isBelowStandardLevel && !input.hasBastion,
  };
}

/** Скільки спеціальних приміщень дозволено на рівні персонажа. Базові в ліміт не входять. */
const SPECIAL_FACILITY_LIMITS = [
  { fromLevel: 17, limit: 6 },
  { fromLevel: 13, limit: 5 },
  { fromLevel: 9, limit: 4 },
  { fromLevel: BASTION_STANDARD_LEVEL, limit: 2 },
] as const;

export type BastionSpecialFacilityUsage = {
  used: number;
  limit: number;
  isOverLimit: boolean;
};

export function findSpecialFacilityLimit(characterLevel: number): number {
  return SPECIAL_FACILITY_LIMITS.find((row) => characterLevel >= row.fromLevel)?.limit ?? 0;
}

export function findSpecialFacilityUsage(input: {
  characterLevel: number;
  used: number;
}): BastionSpecialFacilityUsage {
  const limit = findSpecialFacilityLimit(input.characterLevel);

  return { used: input.used, limit, isOverLimit: input.used > limit };
}

export type SpecialFacilitySlotsSummary = {
  counter: string | null;
  hint: string | null;
  isWarning: boolean;
};

/// «0 / 0» на 1-му рівні читається як баг: до 5-го рівня лічильника немає, є пояснення (Р26 — додати все одно можна).
export function describeSpecialFacilitySlots(usage: BastionSpecialFacilityUsage & { characterLevel: number }): SpecialFacilitySlotsSummary {
  if (usage.limit === 0) {
    return {
      counter: usage.used > 0 ? String(usage.used) : null,
      hint: `За стандартними правилами спеціальні приміщення відкриваються на ${BASTION_STANDARD_LEVEL}-му рівні. Додати їх можна й зараз — як домашнє правило.`,
      isWarning: usage.used > 0,
    };
  }

  const counter = `${usage.used} / ${usage.limit}`;
  if (usage.isOverLimit) {
    return { counter, hint: `За стандартними правилами на цьому рівні їх ${usage.limit}`, isWarning: true };
  }
  if (usage.used < usage.limit) {
    return { counter, hint: `Можна додати ще ${usage.limit - usage.used}`, isWarning: false };
  }

  const laterLevels = SPECIAL_FACILITY_LIMITS.map((row) => row.fromLevel).filter((level) => level > usage.characterLevel);
  return { counter, hint: laterLevels.length > 0 ? `Наступне — на ${Math.min(...laterLevels)}-му рівні` : null, isWarning: false };
}

export type BastionFacilitiesSummary = { specialCount: number; basicCount: number; defenders: number };

/// Рядок «одразу бачу»: скільки чого в бастіоні, без розшифровки за приміщеннями.
export function summarizeFacilities(
  facilities: readonly { match: { isSpecial: boolean } | null; defenders: number }[]
): BastionFacilitiesSummary {
  return facilities.reduce(
    (summary, facility) => ({
      specialCount: summary.specialCount + (facility.match?.isSpecial ?? true ? 1 : 0),
      basicCount: summary.basicCount + (facility.match && !facility.match.isSpecial ? 1 : 0),
      defenders: summary.defenders + facility.defenders,
    }),
    { specialCount: 0, basicCount: 0, defenders: 0 }
  );
}

export type BastionTurnOrder = { facilityName: string; orderCode: BastionOrderCode };

export function findTurnOrders(
  facilities: readonly { name: string | null; slug: string; currentOrder: BastionOrderCode | null }[]
): BastionTurnOrder[] {
  return facilities.flatMap((facility) =>
    facility.currentOrder ? [{ facilityName: facility.name ?? facility.slug, orderCode: facility.currentOrder }] : []
  );
}

/// Журнал пише гравець (KR19.5): це лише заготовка тексту запису, яку він править перед збереженням.
export function describeTurnOrders(input: { isMaintaining: boolean; orders: readonly BastionTurnOrder[] }): string {
  const lines = input.orders.map((order) => `${order.facilityName} — ${bastionOrderTranslations[order.orderCode]}`);

  return [...(input.isMaintaining ? [bastionOrderTranslations.MAINTAIN] : []), ...lines].join("\n");
}

/**
 * DMG 2024, розділ 8, «Basic Facilities»: бастіон стартує з двох безкоштовних базових
 * приміщень — одне тісне, одне просторе. Кожне наступне базове й кожне збільшення коштує золота
 * й днів. Застосунок їх не списує — лише показує (Р26).
 */
const FREE_BASIC_FACILITY_SPACES: readonly BastionSpace[] = ["cramped", "roomy"];

export const BASIC_FACILITY_COSTS: readonly { space: BastionSpace; gold: number; days: number }[] = [
  { space: "cramped", gold: 500, days: 20 },
  { space: "roomy", gold: 1000, days: 45 },
  { space: "vast", gold: 3000, days: 125 },
];

export const BASIC_FACILITY_ENLARGEMENT_COSTS: readonly { from: BastionSpace; to: BastionSpace; gold: number; days: number }[] = [
  { from: "cramped", to: "roomy", gold: 500, days: 25 },
  { from: "roomy", to: "vast", gold: 2000, days: 80 },
];

export function findMissingFreeBasicSpaces(basicFacilitySpaces: readonly BastionSpace[]): BastionSpace[] {
  return FREE_BASIC_FACILITY_SPACES.filter((space) => !basicFacilitySpaces.includes(space));
}

/// «Each special facility can be chosen only once unless its description says otherwise» —
/// базових це не стосується: «A Bastion can have more than one of each basic facility».
export function isSpecialFacilityAlreadyBuilt(
  facility: Pick<BastionFacilityData, "slug" | "facilityType">,
  builtSlugs: readonly string[]
): boolean {
  return facility.facilityType === "special" && builtSlugs.includes(facility.slug);
}

/// DMG 2024, «Orders»: «Issuing this order prohibits other orders from being issued to the Bastion
/// on the current Bastion turn». Застосунок накази приміщень не стирає — лише попереджає (Р26).
export function describeMaintainConflict(input: { isMaintaining: boolean; orderedFacilityCount: number }): string | null {
  if (!input.isMaintaining || input.orderedFacilityCount === 0) return null;

  return `Бастіон на Утриманні: цього ходу інші накази не віддаються, а приміщень із наказом — ${input.orderedFacilityCount}.`;
}

/// DMG 2024, «Special Facilities»: «Each new special facility immediately becomes part of the
/// character's Bastion when the character reaches the level. Each time a character gains a level,
/// that character can replace one of their Bastion's special facilities with another».
export function describeBastionLevelUp(input: {
  ruleset: Ruleset;
  fromLevel: number;
  toLevel: number;
  hasBastion: boolean;
}): string[] {
  if (input.ruleset !== "RULES_2024") return [];
  if (!input.hasBastion) return describeBastionUnlock(input.fromLevel, input.toLevel);

  const gainedFacilities = findSpecialFacilityLimit(input.toLevel) - findSpecialFacilityLimit(input.fromLevel);
  return [
    ...(gainedFacilities > 0
      ? [`Бастіон отримує нові спеціальні приміщення: +${gainedFacilities}, разом до ${findSpecialFacilityLimit(input.toLevel)}. Оберіть їх на сторінці бастіону.`]
      : []),
    "На новому рівні можна замінити одне спеціальне приміщення бастіону іншим, якому персонаж відповідає.",
  ];
}

function describeBastionUnlock(fromLevel: number, toLevel: number): string[] {
  if (fromLevel >= BASTION_STANDARD_LEVEL || toLevel < BASTION_STANDARD_LEVEL) return [];
  return [`З ${BASTION_STANDARD_LEVEL}-го рівня персонаж може здобути бастіон — його можна створити на слайді Рис.`];
}

/// Заміна переносить стан рядка: розмір лишається, якщо новий каталог його дозволяє, і наказ —
/// якщо новому приміщенню його дають.
export function findReplacementState(input: {
  currentSpace: BastionSpace;
  currentOrder: BastionOrderCode | null;
  allowedSpaces: readonly BastionSpace[];
  allowedOrders: readonly BastionOrderCode[];
}): { space: BastionSpace; keepsOrder: boolean } {
  return {
    space: input.allowedSpaces.includes(input.currentSpace) ? input.currentSpace : input.allowedSpaces[0],
    keepsOrder: input.currentOrder !== null && input.allowedOrders.includes(input.currentOrder),
  };
}

export const FIRST_BASTION_TURN_NUMBER = 1;

/**
 * Номер, який форма журналу підставляє в новий запис. Це підказка, а не нумерація: гравець її
 * переписує, застосунок ходів не рахує й порядок за нього не тримає
 * ([Р26](../../docs/DECISIONS.md#р26)). Тому «наступний» — це на одиницю більший за найбільший
 * записаний, а не «кількість записів + 1»: журнал може починатися з десятого ходу й мати
 * прогалини.
 */
export function findNextTurnNumber(turns: readonly { turnNumber: number }[]): number {
  if (turns.length === 0) return FIRST_BASTION_TURN_NUMBER;

  return Math.max(...turns.map((turn) => turn.turnNumber)) + 1;
}

/**
 * Чаротворчі фокуси, які дає клас. Джерело — SRD 5.2.1 у репозиторії
 * ([classes.md](../../data/2024/srd/classes.md)): бард — музичний інструмент, жрець і паладин —
 * священний символ, друїд і рейнджер — друїдичне фокусування, чаклун, чорнокнижник і чарівник —
 * містичне фокусування. Артифісер у SRD відсутній; його фокус — ремісничі інструменти.
 */
export type BastionSpellcastingFocus = "arcane" | "holy" | "druid" | "tool" | "artisansTool";

export type BastionClassStanding = { className: string; subclassName: string | null };

const CLASS_FOCUSES: Record<string, readonly BastionSpellcastingFocus[]> = {
  BARD_2024: ["tool"],
  CLERIC_2024: ["holy"],
  DRUID_2024: ["druid"],
  PALADIN_2024: ["holy"],
  RANGER_2024: ["druid"],
  SORCERER_2024: ["arcane"],
  WARLOCK_2024: ["arcane"],
  WIZARD_2024: ["arcane"],
  ARTIFICER_2024: ["artisansTool", "tool"],
};

/// Обидва підкласи чаклують зі списку чарівника й користуються містичним фокусуванням. У SRD
/// 5.2.1 їх немає — SRD несе по одному підкласу на клас, — тому це єдине місце модуля, яке
/// спирається на PHB 2024, а не на корпус у репозиторії. Помилка тут дозволяє зайве, а не
/// забороняє потрібне, і це той бік, на який Р26 просить хилитися.
const SUBCLASS_FOCUSES: Record<string, readonly BastionSpellcastingFocus[]> = {
  ELDRITCH_KNIGHT: ["arcane"],
  ARCANE_TRICKSTER: ["arcane"],
};

export function findSpellcastingFocuses(
  classes: readonly BastionClassStanding[]
): BastionSpellcastingFocus[] {
  const focuses = classes.flatMap((standing) => [
    ...(CLASS_FOCUSES[standing.className] ?? []),
    ...(standing.subclassName ? SUBCLASS_FOCUSES[standing.subclassName] ?? [] : []),
  ]);

  return [...new Set(focuses)];
}

export type BastionCharacterProfile = {
  characterLevel: number;
  spellcastingFocuses: readonly BastionSpellcastingFocus[];
  featureKeys: readonly string[];
  skillProficiencies: readonly string[];
  hasAnySkillExpertise: boolean;
};

/**
 * Третій стан обовʼязковий ([Р26](../../docs/DECISIONS.md#р26)): 12 вимог із 33 — це членство
 * й слава в організаціях, яких застосунок не знає. Назвати незнане «не відповідаєш» — брехня.
 */
export type BastionRequirementStatus = "met" | "unmet" | "campaign";

export type BastionFacilityMatch = {
  status: BastionRequirementStatus;
  isSpecial: boolean;
  isAboveCharacterLevel: boolean;
};

export function findFacilityMatch(
  facility: Pick<BastionFacilityData, "prerequisite" | "facilityType" | "level">,
  profile: BastionCharacterProfile
): BastionFacilityMatch {
  return {
    status: findPrerequisiteStatus(facility.prerequisite, profile),
    isSpecial: facility.facilityType === "special",
    isAboveCharacterLevel: facility.level !== null && profile.characterLevel < facility.level,
  };
}

/// Назви фіч у базі несуть клас і редакцію — `Fighter: Fighting Style (2024)`,
/// `Monk: Unarmored Defense (2024)`, — а передумова приміщення називає саму фічу.
export function toBastionFeatureKey(engName: string): string {
  return engName
    .replace(/^[^:]+:\s*/, "")
    .replace(/\s*\([^)]*\)\s*$/, "")
    .trim()
    .toLowerCase();
}

export function toBastionSkillKey(skillEng: string): string {
  return skillEng.trim().toUpperCase().replace(/[^A-Z]+/g, "_");
}

/// `allOf` — конʼюнкція груп, кожна група — дизʼюнкція вимог (форма з KR19.1).
function findPrerequisiteStatus(
  prerequisite: BastionFacilityData["prerequisite"],
  profile: BastionCharacterProfile
): BastionRequirementStatus {
  if (!prerequisite) return "met";

  const groups = prerequisite.allOf.map((group) => findGroupStatus(group, profile));
  if (groups.includes("unmet")) return "unmet";
  if (groups.includes("campaign")) return "campaign";

  return "met";
}

function findGroupStatus(
  group: readonly BastionRequirement[],
  profile: BastionCharacterProfile
): BastionRequirementStatus {
  const statuses = group.map((requirement) => findRequirementStatus(requirement, profile));
  if (statuses.includes("met")) return "met";
  if (statuses.includes("campaign")) return "campaign";

  return "unmet";
}

function findRequirementStatus(
  requirement: BastionRequirement,
  profile: BastionCharacterProfile
): BastionRequirementStatus {
  switch (requirement.kind) {
    case "membership":
    case "renown":
      return "campaign";
    case "spellcastingFocus":
      return hasFocus(profile.spellcastingFocuses, requirement.focus) ? "met" : "unmet";
    case "feature":
      return profile.featureKeys.includes(toBastionFeatureKey(requirement.featureEng))
        ? "met"
        : "unmet";
    case "skillProficiency":
      return profile.skillProficiencies.includes(toBastionSkillKey(requirement.skillEng))
        ? "met"
        : "unmet";
    case "expertise":
      return profile.hasAnySkillExpertise ? "met" : "unmet";
  }
}

/// «Інструменти як фокусування» вимагає Містичний кабінет; ремісничі інструменти артифісера —
/// їх окремий випадок, тому загальніша вимога ними теж закривається.
function hasFocus(
  focuses: readonly BastionSpellcastingFocus[],
  required: string
): boolean {
  if (required === "any") return focuses.length > 0;
  if (required === "tool") return focuses.includes("tool") || focuses.includes("artisansTool");

  return focuses.includes(required as BastionSpellcastingFocus);
}
