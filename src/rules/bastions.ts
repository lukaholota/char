/**
 * Правила бастіону (DMG 2024): кому він доступний, які приміщення персонажу відповідають і
 * скільки спеціальних приміщень дозволено на його рівні.
 *
 * Механіка бастіонів є лише в DMG 2024, тому редакція — межа: у 2014-персонажа розділу немає
 * взагалі. Рівень же межею не є ([Р26](../../docs/DECISIONS.md#р26)): персонаж 4-го рівня
 * бастіон створює, третє приміщення при ліміті два додає, приміщення з непройденою передумовою
 * теж додає — усе з написом, а не із замком.
 */

import type { BastionFacilityData, BastionRequirement } from "@/lib/bastion-facility";
import type { Ruleset } from "@/rules/types";

export const BASTION_STANDARD_LEVEL = 5;

export const BASTION_BELOW_STANDARD_LEVEL_HINT =
  `За стандартними правилами бастіони доступні з ${BASTION_STANDARD_LEVEL}-го рівня`;

export type BastionAccess = {
  isOffered: boolean;
  isBelowStandardLevel: boolean;
  isEntryCardShown: boolean;
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
    isEntryCardShown: isOffered && (input.hasBastion || !isBelowStandardLevel),
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
