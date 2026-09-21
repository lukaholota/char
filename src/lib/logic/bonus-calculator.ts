/**
 * Bonus calculation helpers
 * All functions handle null/undefined JSON fields gracefully
 */

import { Ability, DamageType, Skills, SkillProficiencyType, WeaponProperty } from "@prisma/client";
import type { Feature } from "@prisma/client";
import { PersWithRelations, PersWeaponWithWeapon } from "@/lib/actions/pers";
import { getAbilityMod, getProficiencyBonus, skillAbilityMap } from "./utils";
import { calculateArmorClass, explainArmorClass, type ArmorClassPartKey } from "@/rules/armor";
import {
  calculateSavingThrowProficiencyBonus,
  calculateSkillProficiencyBonus,
  hasJackOfAllTradesFeature,
} from "@/rules/proficiency";
import {
  findInitiativeProficiencyBonus,
  sumFeatureFlatHitPoints,
  sumFeatureSpeedBonus,
} from "@/rules/feature-stat-grants";
import { findAlertInitiativeBonus, findObservantPassiveBonus } from "@/rules/feat-flat-bonuses-2014";
import { calculateWalkingSpeed, explainWalkingSpeed, type WalkingSpeedPartKey } from "@/rules/walking-speed";
import { collectDamageResistances, findDarkvisionRange } from "@/rules/senses-and-resistances";
import type { StateEffects } from "@/rules/state-effects";
import {
  canUseDexterousAttacks,
  findMartialArtsDamageDice,
  findMartialArtsDie,
  isMonkWeapon,
} from "@/rules/martial-arts";
import { findUnarmoredMovementBonus, MONK_CLASS_NAMES } from "@/rules/unarmored-movement";
import { buildCharacterLevels, findClassLevel } from "@/rules/character-level";
import type { AbilityKey, ArmorAbilityBonusType } from "@/rules/types";
import { StatBonuses, SkillBonuses, SimpleBonusValue } from "@/lib/types/model-types";
import { abilityTranslations, armorTranslations } from "@/lib/refs/translation";

// ============================================================================
// JSON Parsers (handle null/undefined/invalid JSON)
// ============================================================================

function parseStatBonuses(json: unknown): StatBonuses {
  if (!json || typeof json !== "object") return {};
  return json as StatBonuses;
}

function parseSkillBonuses(json: unknown): SkillBonuses {
  if (!json || typeof json !== "object") return {};
  return json as SkillBonuses;
}

function parseSimpleBonus(json: unknown): number {
  if (!json || typeof json !== "object") return 0;
  const obj = json as SimpleBonusValue;
  return typeof obj.value === "number" ? obj.value : 0;
}

// ============================================================================
// Individual Bonus Getters
// ============================================================================

/** Get stat bonus for an ability (e.g., +2 to STR base value) */
export function getStatBonus(pers: PersWithRelations, ability: Ability): number {
  const bonuses = parseStatBonuses((pers as unknown as { statBonuses?: unknown }).statBonuses);
  return bonuses[ability] ?? 0;
}

/** Get modifier bonus for an ability (adds directly to modifier, not stat) */
export function getModifierBonus(pers: PersWithRelations, ability: Ability): number {
  const bonuses = parseStatBonuses((pers as unknown as { statModifierBonuses?: unknown }).statModifierBonuses);
  return bonuses[ability] ?? 0;
}

/** Get save bonus for an ability */
export function getSaveBonus(pers: PersWithRelations, ability: Ability): number {
  const bonuses = parseStatBonuses((pers as unknown as { saveBonuses?: unknown }).saveBonuses);
  return bonuses[ability] ?? 0;
}

/** Get skill bonus */
export function getSkillBonus(pers: PersWithRelations, skill: Skills): number {
  const bonuses = parseSkillBonuses((pers as unknown as { skillBonuses?: unknown }).skillBonuses);
  return bonuses[skill] ?? 0;
}

/** Get simple bonus (HP, AC, speed, etc.) */
export function getSimpleBonus(pers: PersWithRelations, field: 'hp' | 'ac' | 'speed' | 'proficiency' | 'initiative' | 'spellAttack' | 'spellDC'): number {
  const fieldMap: Record<string, string> = {
    hp: 'hpBonuses',
    ac: 'acBonuses',
    speed: 'speedBonuses',
    proficiency: 'proficiencyBonuses',
    initiative: 'initiativeBonuses',
    spellAttack: 'spellAttackBonuses',
    spellDC: 'spellDCBonuses',
  };
  const jsonField = fieldMap[field];
  const json = (pers as unknown as Record<string, unknown>)[jsonField];
  return parseSimpleBonus(json);
}

// ============================================================================
// Final Value Calculators
// ============================================================================

// ============================================================================
// Magic Item Helpers
// ============================================================================

function getActiveMagicItems(pers: PersWithRelations) {
  if (!pers.magicItems) return [];
  return pers.magicItems.filter(pmi => 
    pmi.isEquipped && 
    (!pmi.magicItem?.requiresAttunement || pmi.isAttuned)
  );
}

function getMagicItemACBonus(pers: PersWithRelations, hasArmor: boolean, hasShield: boolean): number {
  const items = getActiveMagicItems(pers);
  let bonus = 0;
  for (const item of items) {
     if (item.magicItem?.bonusToAC) {
        if (item.magicItem.noArmorOrShieldForACBonus) {
           if (!hasArmor && !hasShield) {
              bonus += item.magicItem.bonusToAC;
           }
        } else {
           bonus += item.magicItem.bonusToAC;
        }
     }
  }
  return bonus;
}

function getMagicItemSaveBonus(pers: PersWithRelations, ability: Ability): number {
  const items = getActiveMagicItems(pers);
  let bonus = 0;
  for (const item of items) {
    const saves = item.magicItem?.bonusToSavingThrows as Record<string, number> | null;
    if (saves) {
      if (typeof saves.all === 'number') bonus += saves.all;
      if (typeof saves[ability.toLowerCase()] === 'number') bonus += saves[ability.toLowerCase()];
    }
  }
  return bonus;
}

function getMagicItemRangedDamageBonus(pers: PersWithRelations): number {
    const items = getActiveMagicItems(pers);
    let bonus = 0;
    for (const item of items) {
        if (item.magicItem?.bonusToRangedDamage) {
            bonus += item.magicItem.bonusToRangedDamage;
        }
    }
    return bonus;
}

// ============================================================================
// Feature Helpers
// ============================================================================

export function collectActiveFeatures(pers: Omit<PersWithRelations, "user">): Feature[] {
  const byId = new Map<number, Feature>();
  const add = (feature?: Feature | null) => {
    if (!feature) return;
    byId.set(feature.featureId, feature);
  };

  // Pers-added features (explicit)
  for (const pf of pers.features ?? []) {
    add((pf as any).feature);
  }

  // Race / subrace / variant traits
  for (const t of pers.race?.traits ?? []) add((t as any).feature);
  for (const t of pers.subrace?.traits ?? []) add((t as any).feature);
  for (const rv of pers.raceVariants ?? []) {
    for (const t of rv.traits ?? []) add((t as any).feature);
  }

  // Race choice options (traits)
  for (const opt of pers.raceChoiceOptions ?? []) {
    for (const t of (opt as any).traits ?? []) add((t as any).feature);
  }

  // Base class / subclass features (level-gated)
  for (const cf of pers.class?.features ?? []) {
    if ((cf as any).levelGranted <= pers.level) add((cf as any).feature);
  }
  for (const sf of pers.subclass?.features ?? []) {
    if ((sf as any).levelGranted <= pers.level) add((sf as any).feature);
  }

  // Multiclass features (level-gated by classLevel)
  for (const mc of pers.multiclasses ?? []) {
    const classLevel = (mc as any).classLevel ?? 0;
    for (const cf of (mc as any).class?.features ?? []) {
      if ((cf as any).levelGranted <= classLevel) add((cf as any).feature);
    }
    for (const sf of (mc as any).subclass?.features ?? []) {
      if ((sf as any).levelGranted <= classLevel) add((sf as any).feature);
    }
  }

  // Choice options can grant features (e.g. Fighting Style: Defense)
  for (const opt of pers.choiceOptions ?? []) {
    for (const ofeat of (opt as any).features ?? []) add((ofeat as any).feature);
  }

  // Class optional features chosen for the character
  for (const cof of (pers as any).classOptionalFeatures ?? []) add((cof as any).feature);

  // Feats can grant features
  for (const pf of pers.feats ?? []) {
    for (const f of (pf as any).feat?.grantsFeature ?? []) add(f as Feature);
  }

  return [...byId.values()];
}

function hasJackOfAllTrades(pers: PersWithRelations): boolean {
  return hasJackOfAllTradesFeature(collectActiveFeatures(pers).map((feature) => feature.engName));
}

function getFeatureACBonus(pers: PersWithRelations, hasArmor: boolean, hasShield: boolean): number {
  const features = collectActiveFeatures(pers);
  let bonus = 0;

  for (const feature of features) {
    const gives = feature.givesAC;
    if (typeof gives !== "number" || !Number.isFinite(gives) || gives === 0) continue;

    if (feature.requiresArmorForACBonus && !hasArmor) continue;
    if (feature.noArmorOrShieldForACBonus && (hasArmor || hasShield)) continue;

    bonus += gives;
  }

  return bonus;
}

// ============================================================================
// Final Value Calculators
// ============================================================================

/** Get base stat value for an ability */
function getBaseStat(pers: PersWithRelations, ability: Ability): number {
  const statMap: Record<Ability, number> = {
    STR: pers.str,
    DEX: pers.dex,
    CON: pers.con,
    INT: pers.int,
    WIS: pers.wis,
    CHA: pers.cha,
  };
  return statMap[ability];
}

export type NumberPart = { label: string; value: number };

function sumNumberParts(parts: readonly NumberPart[]): number {
  return parts.reduce((total, part) => total + part.value, 0);
}

function keepBaseAndNonZero(parts: readonly NumberPart[]): NumberPart[] {
  return parts.filter((part, index) => index === 0 || part.value !== 0);
}

export function calculateFinalStat(pers: PersWithRelations, ability: Ability): number {
  return sumNumberParts(explainFinalStat(pers, ability));
}

export function explainFinalStat(pers: PersWithRelations, ability: Ability): NumberPart[] {
  return keepBaseAndNonZero([
    { label: "Базове значення", value: getBaseStat(pers, ability) },
    { label: "Ручний бонус", value: getStatBonus(pers, ability) },
  ]);
}

/**
 * Ті самі шість чисел, але з рядка персонажа, а не з повного графа: сервер бачить `pers` без
 * звʼязків, а передумова мультикласу має рахуватися однаково на сервері й у формі (KR27.2).
 */
export function calculateFinalAbilityScores(pers: {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
  statBonuses?: unknown;
}): Record<Ability, number> {
  const bonuses = parseStatBonuses(pers.statBonuses);
  const base: Record<Ability, number> = {
    STR: pers.str,
    DEX: pers.dex,
    CON: pers.con,
    INT: pers.int,
    WIS: pers.wis,
    CHA: pers.cha,
  };

  return Object.fromEntries(
    (Object.keys(base) as Ability[]).map((ability) => [ability, base[ability] + (bonuses[ability] ?? 0)]),
  ) as Record<Ability, number>;
}

/// Перевірка характеристики — кидок к20, тож штраф виснаження 2024 іде в неї, а не в модифікатор.
export function calculateAbilityCheckBonus(pers: PersWithRelations, ability: Ability): number {
  return calculateFinalModifier(pers, ability) + findD20PenaltyPart(pers).value;
}

/** Calculate final modifier (from modified stat + modifierBonuses) */
export function calculateFinalModifier(pers: PersWithRelations, ability: Ability): number {
  const finalStat = calculateFinalStat(pers, ability);
  const baseMod = getAbilityMod(finalStat);
  return baseMod + getModifierBonus(pers, ability);
}

export function calculateFinalSave(
  pers: PersWithRelations,
  ability: Ability,
  _classSavingThrows?: Ability[] // kept for backward compatibility; not used
): number {
  return sumNumberParts(explainFinalSave(pers, ability));
}

export function explainFinalSave(pers: PersWithRelations, ability: Ability): NumberPart[] {
  const additionalSaves = (pers as unknown as { additionalSaveProficiencies?: Ability[] }).additionalSaveProficiencies ?? [];
  const miscBonuses = (pers as unknown as { miscSaveBonuses?: Record<string, number> }).miscSaveBonuses ?? {};

  return keepBaseAndNonZero([
    { label: `Модифікатор (${abilityTranslations[ability]})`, value: calculateFinalModifier(pers, ability) },
    {
      label: "Майстерність",
      value: calculateSavingThrowProficiencyBonus(additionalSaves.includes(ability), calculateFinalProficiency(pers)),
    },
    { label: "Ручний бонус", value: getSaveBonus(pers, ability) },
    { label: "Інші бонуси", value: miscBonuses[ability] ?? 0 },
    { label: "Магічні предмети", value: getMagicItemSaveBonus(pers, ability) },
    findD20PenaltyPart(pers),
  ]);
}

export function calculateFinalSkill(
  pers: PersWithRelations,
  skill: Skills
): { total: number; proficiency: SkillProficiencyType | "NONE" } {
  return { total: sumNumberParts(explainFinalSkill(pers, skill)), proficiency: findSkillProficiency(pers, skill) };
}

const SKILL_PROFICIENCY_LABELS: Record<SkillProficiencyType | "NONE", string> = {
  NONE: "Майстер на всі руки",
  HALF: "Половина майстерності",
  PROFICIENT: "Майстерність",
  EXPERTISE: "Експертиза",
};

export function explainFinalSkill(pers: PersWithRelations, skill: Skills): NumberPart[] {
  const ability = findSkillAbility(pers, skill);
  const proficiency = findSkillProficiency(pers, skill);
  const proficiencyValue = calculateSkillProficiencyBonus(
    proficiency,
    calculateFinalProficiency(pers),
    proficiency === "NONE" && hasJackOfAllTrades(pers),
  );

  return keepBaseAndNonZero([
    {
      label: ability ? `Модифікатор (${abilityTranslations[ability]})` : "Модифікатор",
      value: ability ? findSkillAbilityModifier(pers, ability) : 0,
    },
    { label: SKILL_PROFICIENCY_LABELS[proficiency], value: proficiencyValue },
    { label: "Ручний бонус", value: getSkillBonus(pers, skill) },
    findD20PenaltyPart(pers),
  ]);
}

/// Первісне знання 2024 дозволяє («can») кинути навичку як перевірку Сили, поки триває Лють, —
/// гравець бере кращу з двох характеристик.
export function findSkillAbility(pers: PersWithRelations, skill: Skills): Ability | undefined {
  const usual = skillAbilityMap[skill]?.toUpperCase() as Ability | undefined;
  const offered = readStateEffects(pers)?.skillAbilityOptions[skill] as Ability | undefined;
  if (!usual || !offered) return usual;
  return findSkillAbilityModifier(pers, offered) > findSkillAbilityModifier(pers, usual) ? offered : usual;
}

function findSkillAbilityModifier(pers: PersWithRelations, ability: Ability): number {
  return getAbilityMod(getBaseStat(pers, ability) + getStatBonus(pers, ability)) + getModifierBonus(pers, ability);
}

export function readStateEffects(pers: PersWithRelations): StateEffects | null {
  return (pers as PersWithRelations & { stateEffects?: StateEffects | null }).stateEffects ?? null;
}

/// Виснаження 2024 зменшує кожен кидок к20 — лист показує це в самому числі, як BG3.
function findD20PenaltyPart(pers: PersWithRelations): NumberPart {
  return { label: "Виснаження", value: -(readStateEffects(pers)?.d20Penalty ?? 0) };
}

function findSkillProficiency(pers: PersWithRelations, skill: Skills): SkillProficiencyType | "NONE" {
  return pers.skills.find((entry) => entry.name === skill)?.proficiencyType ?? "NONE";
}

/** Calculate final proficiency bonus */
export function calculateFinalProficiency(pers: PersWithRelations): number {
  return getProficiencyBonus(pers.level) + getSimpleBonus(pers, "proficiency");
}

export function calculateFinalAC(pers: PersWithRelations): number {
  return sumNumberParts(explainFinalAC(pers));
}

export function explainFinalAC(pers: PersWithRelations): NumberPart[] {
  const input = buildArmorClassInput(pers);
  const baseLabel = findBaseArmorClassLabel(pers, input.baseArmorClassOverride);
  const parts = explainArmorClass(input).map((part) => ({
    label: part.key === "BASE" ? baseLabel : ARMOR_CLASS_PART_LABELS[part.key],
    value: part.value,
  }));
  return keepBaseAndNonZero([...parts, findArmorClassFloorPart(pers, calculateArmorClass(input))]);
}

/// Дубова шкіра не додає, а тримає нижню межу: різниця до межі — окремий рядок розбивки.
function findArmorClassFloorPart(pers: PersWithRelations, armorClass: number): NumberPart {
  const floor = readStateEffects(pers)?.armorClassFloor ?? null;
  return { label: `Дубова шкіра (щонайменше ${floor})`, value: floor !== null && floor > armorClass ? floor - armorClass : 0 };
}

const ARMOR_CLASS_FORMULA_CATEGORIES = new Set([
  "UNARMORED_DEFENSE_MONK",
  "UNARMORED_DEFENSE_BARBARIAN",
  "NATURAL_ARMOR_TORTLE",
  "NATURAL_ARMOR_13_DEX",
  "NATURAL_ARMOR_12_DEX",
  "NATURAL_ARMOR_12_CON",
  "DRACONIC_RESILIENCE",
]);

/// Обладунок мага: «базовий КБ стає 13 + Спритність», якщо персонаж не носить обладунку.
/// Захист без обладунків чи природна броня — теж рядки `armor`, але не обладунок, тож гравець
/// бере кращу з формул.
function findMageArmorBase(pers: PersWithRelations, usualBase: number): number | null {
  const base = readStateEffects(pers)?.unarmoredArmorClassBase ?? null;
  if (base === null || Number.isFinite(pers.overrideBaseAC)) return null;
  const wearsArmor = pers.armors.some((entry) => entry.equipped && !ARMOR_CLASS_FORMULA_CATEGORIES.has(entry.armor.name));
  if (wearsArmor) return null;
  const mageArmor = base + calculateFinalModifier(pers, Ability.DEX);
  return mageArmor > usualBase ? mageArmor : null;
}

const ARMOR_CLASS_PART_LABELS: Record<Exclude<ArmorClassPartKey, "BASE">, string> = {
  SPECIES: "Вид",
  SHIELD: "Щит",
  MANUAL: "Ручний бонус",
  FEATURES: "Риси",
  STATES: "Стани",
  MAGIC_ITEMS: "Магічні предмети",
};

function findBaseArmorClassLabel(pers: PersWithRelations, baseOverride: number | null | undefined): string {
  if (Number.isFinite(pers.overrideBaseAC)) return "Базовий КЗ (вручну)";
  if (Number.isFinite(baseOverride)) return "Обладунок мага (13 + Спритність)";
  const equippedArmor = pers.armors.find((entry) => entry.equipped);
  if (!equippedArmor) return "Без обладунку (10 + Спритність)";
  return `Базовий КЗ: ${armorTranslations[equippedArmor.armor.name as keyof typeof armorTranslations] ?? equippedArmor.armor.name}`;
}

function buildArmorClassInput(pers: PersWithRelations) {
  const equippedArmor = pers.armors.find((entry) => entry.equipped);
  const hasArmor = Boolean(equippedArmor);
  const wearsShield = pers.wearsShield;

  const input = {
    dexterityModifier: calculateFinalModifier(pers, Ability.DEX),
    abilityModifiers: getAbilityModifiers(pers),
    equippedArmor: equippedArmor ? toRuleArmor(equippedArmor) : null,
    baseArmorClassOverride: pers.overrideBaseAC,
    raceStaticArmorClassBonus: (pers as unknown as { raceStaticAcBonus?: number }).raceStaticAcBonus,
    wearsShield,
    shieldArmorClassBonus: pers.additionalShieldBonus,
    simpleArmorClassBonus: getSimpleBonus(pers, "ac"),
    featureArmorClassBonus: getFeatureACBonus(pers, hasArmor, wearsShield),
    stateArmorClassBonus: readStateEffects(pers)?.armorClassBonus ?? 0,
    magicItemArmorClassBonus: getMagicItemACBonus(pers, hasArmor, wearsShield),
  };
  const usualBase = explainArmorClass(input).find((part) => part.key === "BASE")?.value ?? 0;
  return { ...input, baseArmorClassOverride: findMageArmorBase(pers, usualBase) ?? input.baseArmorClassOverride };
}

function getAbilityModifiers(pers: PersWithRelations): Record<AbilityKey, number> {
  return {
    STR: calculateFinalModifier(pers, Ability.STR),
    DEX: calculateFinalModifier(pers, Ability.DEX),
    CON: calculateFinalModifier(pers, Ability.CON),
    INT: calculateFinalModifier(pers, Ability.INT),
    WIS: calculateFinalModifier(pers, Ability.WIS),
    CHA: calculateFinalModifier(pers, Ability.CHA),
  };
}

function toRuleArmor(equippedArmor: PersWithRelations["armors"][number]) {
  const characterArmor = equippedArmor as unknown as {
    abilityBonuses?: AbilityKey[];
    abilityBonusType?: ArmorAbilityBonusType;
  };
  const baseArmor = equippedArmor.armor as unknown as {
    abilityBonuses?: AbilityKey[];
    abilityBonusType?: ArmorAbilityBonusType;
  };

  return {
    baseArmorClass: equippedArmor.armor.baseAC,
    characterOverrideBaseArmorClass: equippedArmor.overrideBaseAC,
    miscArmorClassBonus: equippedArmor.miscACBonus,
    characterAbilityBonuses: Array.isArray(characterArmor.abilityBonuses)
      ? characterArmor.abilityBonuses
      : [],
    armorAbilityBonuses: Array.isArray(baseArmor.abilityBonuses)
      ? baseArmor.abilityBonuses
      : [],
    characterAbilityBonusType: characterArmor.abilityBonusType,
    armorAbilityBonusType: baseArmor.abilityBonusType,
  };
}

export function calculateFinalSpeed(pers: PersWithRelations): number {
  return Math.max(0, sumNumberParts(explainFinalSpeed(pers)));
}

const WALKING_SPEED_PART_LABELS: Record<WalkingSpeedPartKey, string> = {
  REPLACEMENT: "Швидкість звіриної форми",
  SPECIES: "Вид",
  VARIANT: "Варіант виду",
  SUBRACE: "Підвид",
  SPECIES_CHOICES: "Вибір виду",
  FEATURES: "Риси",
  UNARMORED_MOVEMENT: "Рух без обладунків",
  MANUAL: "Ручний бонус",
};

export function explainFinalSpeed(pers: PersWithRelations): NumberPart[] {
  const input = buildWalkingSpeedInput(pers);
  const parts = explainWalkingSpeed(input).map((part) => ({ label: WALKING_SPEED_PART_LABELS[part.key], value: part.value }));
  return keepBaseAndNonZero([...parts, ...findStateSpeedParts(readStateEffects(pers), calculateWalkingSpeed(input))]);
}

/// Спершу додаються бонуси й штрафи станів, тоді множник (Прискорення ×2, виснаження 2014 ÷2),
/// а виснаження 5-го рівня 2014 зводить усе до нуля.
function findStateSpeedParts(effects: StateEffects | null, speed: number): NumberPart[] {
  if (!effects) return [];
  const afterBonus = Math.max(0, speed + effects.speedBonus);
  const afterMultiplier = Math.floor(afterBonus * effects.speedMultiplier);
  return [
    { label: "Стани", value: afterBonus - speed },
    { label: effects.speedMultiplier > 1 ? "Прискорення" : "Виснаження (половина)", value: afterMultiplier - afterBonus },
    { label: "Виснаження (нерухомість)", value: effects.isSpeedZero ? -afterMultiplier : 0 },
  ];
}

function buildWalkingSpeedInput(pers: PersWithRelations) {
  const speedState = pers as PersWithRelations & { walkingSpeedReplacement?: number | null };
  return {
    replacementSpeed: speedState.walkingSpeedReplacement,
    baseSpeed: pers.race?.speed,
    variantSpeedOverride: firstFiniteNumber(pers.raceVariants?.map((variant) => variant.overridesRaceSpeed)),
    subraceSpeedModifier: pers.subrace?.speedModifier,
    choiceSpeedModifiers: pers.raceChoiceOptions?.map((option) => option.modifiesSpeed),
    featureSpeedBonus: sumFeatureSpeedBonus(collectActiveFeatures(pers)),
    unarmoredMovementBonus: findPersUnarmoredMovementBonus(pers),
    manualSpeedBonus: getSimpleBonus(pers, "speed"),
  };
}

function findPersUnarmoredMovementBonus(pers: PersWithRelations): number {
  const monkLevel = findMonkLevel(pers);
  if (monkLevel === 0) return 0;
  return findUnarmoredMovementBonus({
    monkLevel,
    equippedArmorNames: findEquippedArmorNames(pers),
    wearsShield: pers.wearsShield,
  });
}

function findMonkLevel(pers: PersWithRelations): number {
  const levels = buildCharacterLevels({
    characterLevel: pers.level,
    mainClassName: pers.class?.name ?? "",
    multiclasses: (pers.multiclasses ?? []).map((entry) => ({ className: entry.class.name, classLevel: entry.classLevel })),
  });
  return MONK_CLASS_NAMES.reduce((total, className) => total + findClassLevel(levels, className), 0);
}

function findEquippedArmorNames(pers: PersWithRelations): string[] {
  return pers.armors.filter((entry) => entry.equipped).map((entry) => entry.armor.name);
}

export function getPassiveBonus(pers: PersWithRelations, skill: Skills): number {
  const bonuses = pers.passiveBonuses;
  if (!bonuses || typeof bonuses !== "object" || Array.isArray(bonuses)) return 0;
  const value = (bonuses as Record<string, unknown>)[skill];
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

/// Пасивне значення — не кидок к20, тож штраф виснаження 2024 до нього не йде.
export function calculatePassiveSkill(pers: PersWithRelations, skill: Skills): number {
  return sumNumberParts(explainPassiveSkill(pers, skill));
}

export function explainPassiveSkill(pers: PersWithRelations, skill: Skills): NumberPart[] {
  return keepBaseAndNonZero([
    { label: "База", value: 10 },
    { label: "Перевірка навички", value: calculateFinalSkill(pers, skill).total },
    { label: "Спостережливий (риса)", value: findObservantPassiveBonus(pers.feats ?? [], skill) },
    { label: "Ручний бонус", value: getPassiveBonus(pers, skill) },
    { label: "Виснаження пасивного не стосується", value: readStateEffects(pers)?.d20Penalty ?? 0 },
  ]);
}

export function calculateDamageResistances(pers: PersWithRelations) {
  return collectDamageResistances([
    ...collectActiveFeatures(pers),
    { damageResistances: readStateEffects(pers)?.damageResistances ?? [] },
  ]);
}

export function calculateDarkvisionRange(pers: PersWithRelations): number | null {
  return findDarkvisionRange(collectActiveFeatures(pers));
}

function firstFiniteNumber(values: readonly (number | null | undefined)[] | undefined): number | null {
  return values?.find((value): value is number => typeof value === "number" && Number.isFinite(value)) ?? null;
}

export function calculateFinalInitiative(pers: PersWithRelations): number {
  return sumNumberParts(explainFinalInitiative(pers));
}

export function explainFinalInitiative(pers: PersWithRelations): NumberPart[] {
  const proficiencyBonus = calculateFinalProficiency(pers);
  const fromFeatures = findInitiativeProficiencyBonus(collectActiveFeatures(pers), proficiencyBonus);
  const fromJackOfAllTrades = fromFeatures === 0 && appliesJackOfAllTradesToInitiative(pers)
    ? Math.floor(proficiencyBonus / 2)
    : 0;

  return keepBaseAndNonZero([
    { label: "Модифікатор (Спритність)", value: calculateFinalModifier(pers, Ability.DEX) },
    { label: "Ручний бонус", value: getSimpleBonus(pers, "initiative") },
    { label: "Майстерність (риса)", value: fromFeatures },
    { label: "Майстер на всі руки", value: fromJackOfAllTrades },
    { label: "Пильний (риса)", value: findAlertInitiativeBonus(pers.feats ?? []) },
    findD20PenaltyPart(pers),
  ]);
}

// 2014 — «any ability check», а ініціатива є перевіркою Спритності; 2024 звузив до перевірок навичок.
function appliesJackOfAllTradesToInitiative(pers: PersWithRelations): boolean {
  return pers.ruleset === "RULES_2014" && hasJackOfAllTrades(pers);
}

/** Calculate final max HP */
/// Виснаження 2014, 4-й рівень: максимум хітів удвічі менший.
export function calculateFinalMaxHP(pers: PersWithRelations): number {
  const maxHp = pers.maxHp + getSimpleBonus(pers, "hp") + sumFeatureFlatHitPoints(collectActiveFeatures(pers));
  return readStateEffects(pers)?.isMaxHpHalved ? Math.floor(maxHp / 2) : maxHp;
}

/** Calculate spell attack bonus */
export function calculateSpellAttack(pers: PersWithRelations, spellcastingAbility: Ability): number {
  const mod = calculateFinalModifier(pers, spellcastingAbility);
  const pb = calculateFinalProficiency(pers);
  return mod + pb + getSimpleBonus(pers, "spellAttack") + findD20PenaltyPart(pers).value;
}

/** Calculate spell save DC */
export function calculateSpellDC(pers: PersWithRelations, spellcastingAbility: Ability): number {
  const mod = calculateFinalModifier(pers, spellcastingAbility);
  const pb = calculateFinalProficiency(pers);
  return 8 + mod + pb + getSimpleBonus(pers, "spellDC");
}

// ==========================================================================
// Weapon math (shared between UI and PDF)
// ==========================================================================

function getFeatureWeaponAttackBonus(pers: PersWithRelations, weapon: PersWeaponWithWeapon["weapon"]): number {
  if (!weapon) return 0;

  const features = collectActiveFeatures(pers);
  let bonus = 0;

  for (const feature of features) {
    if (typeof feature.bonusToAttackRoll === "number" && Number.isFinite(feature.bonusToAttackRoll)) {
      bonus += feature.bonusToAttackRoll;
    }

    if (weapon.isRanged && typeof feature.bonusToRangedAttackRoll === "number" && Number.isFinite(feature.bonusToRangedAttackRoll)) {
      bonus += feature.bonusToRangedAttackRoll;
    }
  }

  return bonus;
}

function getFeatureWeaponDamageBonus(pers: PersWithRelations, pw: PersWeaponWithWeapon): number {
  const weapon = pw.weapon;
  if (!weapon) return 0;

  const props = weapon.properties ?? [];
  const isThrownWeapon = props.includes(WeaponProperty.THROWN);
  const isTwoHanded = props.includes(WeaponProperty.TWO_HANDED);

  const features = collectActiveFeatures(pers);
  let bonus = 0;

  for (const feature of features) {
    if (weapon.isRanged) {
      if (typeof feature.bonusToRangedDamage === "number" && Number.isFinite(feature.bonusToRangedDamage)) {
        bonus += feature.bonusToRangedDamage;
      }
    } else {
      if (typeof feature.bonusToMeleeDamage === "number" && Number.isFinite(feature.bonusToMeleeDamage)) {
        bonus += feature.bonusToMeleeDamage;
      }

      // Dueling-style style bonus. We can reliably exclude explicitly two-handed weapons.
      // (We can't perfectly detect "empty offhand" or versatile 2H usage from current model.)
      if (!isTwoHanded && typeof feature.bonusToMeleeOneHandedWeaponDamage === "number" && Number.isFinite(feature.bonusToMeleeOneHandedWeaponDamage)) {
        bonus += feature.bonusToMeleeOneHandedWeaponDamage;
      }
    }

    // Thrown Weapon Fighting: best-effort (we can't know if you're using the weapon as thrown vs melee).
    if (isThrownWeapon && typeof feature.bonusToThrownDamage === "number" && Number.isFinite(feature.bonusToThrownDamage)) {
      bonus += feature.bonusToThrownDamage;
    }
  }

  return bonus;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function findWeaponDamageType(pw: PersWeaponWithWeapon): DamageType | undefined {
  return pw.overrideDamageType ?? pw.weapon?.damageType;
}

export function findWeaponRange(pw: PersWeaponWithWeapon): { normal: number; long: number | null } | null {
  const normal = pw.overrideNormalRange ?? pw.weapon?.normalRange;
  if (!normal) return null;
  return { normal, long: pw.overrideLongRange ?? pw.weapon?.longRange ?? null };
}

export function getWeaponAbility(pers: PersWithRelations, pw: PersWeaponWithWeapon): Ability {
  if (pw.customDamageAbility) return pw.customDamageAbility;
  return chooseStateWeaponAbility(pers, pw, findUsualWeaponAbility(pers, pw));
}

/// Робота клинком 2024: зброєю, якою володієш, можна атакувати Інтелектом — лист бере кращу.
function chooseStateWeaponAbility(pers: PersWithRelations, pw: PersWeaponWithWeapon, usual: Ability): Ability {
  const offered = readStateEffects(pers)?.weaponAbilityOption as Ability | null | undefined;
  if (!offered || !pw.isProficient) return usual;
  return calculateFinalModifier(pers, offered) > calculateFinalModifier(pers, usual) ? offered : usual;
}

function findUsualWeaponAbility(pers: PersWithRelations, pw: PersWeaponWithWeapon): Ability {
  const weapon = pw.weapon;
  if (weapon?.isRanged) return Ability.DEX;

  const isFinesse = Boolean(weapon?.properties?.includes(WeaponProperty.FINESSE));
  if (isFinesse || hasDexterousAttacksWith(pers, weapon)) {
    const strMod = calculateFinalModifier(pers, Ability.STR);
    const dexMod = calculateFinalModifier(pers, Ability.DEX);
    return dexMod >= strMod ? Ability.DEX : Ability.STR;
  }

  return Ability.STR;
}

export function calculateWeaponDamageDice(pers: PersWithRelations, pw: PersWeaponWithWeapon): string {
  const manualDamage = findManualDamageDice(pw);
  if (manualDamage) return manualDamage;

  const weaponDamage = String(pw.weapon?.damage || "");
  if (!hasDexterousAttacksWith(pers, pw.weapon)) return weaponDamage;

  const martialArtsDie = findMartialArtsDie(pers.ruleset, findMonkLevel(pers));
  return martialArtsDie ? findMartialArtsDamageDice(weaponDamage, martialArtsDie) : weaponDamage;
}

/// «Додати зброю» роками копіював каталожний кубик у ручне поле — такий кубик ручним не є.
function findManualDamageDice(pw: PersWeaponWithWeapon): string | null {
  const manual = pw.customDamageDice?.trim();
  if (!manual) return null;
  const catalog = pw.weapon?.damage?.trim();
  return catalog && normalizeDice(manual) === normalizeDice(catalog) ? null : manual;
}

function normalizeDice(dice: string): string {
  return dice.toLowerCase().replace(/к/g, "d").replace(/\s+/g, "");
}

function hasDexterousAttacksWith(pers: PersWithRelations, weapon: PersWeaponWithWeapon["weapon"]): boolean {
  if (!weapon || !isMonkWeapon(weapon, pers.ruleset)) return false;
  return canUseDexterousAttacks({
    featureEngNames: collectActiveFeatures(pers).map((feature) => feature.engName),
    equippedArmorNames: findEquippedArmorNames(pers),
    wearsShield: pers.wearsShield,
  });
}

export function calculateWeaponAttackBonus(pers: PersWithRelations, pw: PersWeaponWithWeapon): number {
  const ability = getWeaponAbility(pers, pw);
  const mod = calculateFinalModifier(pers, ability);
  const pb = pw.isProficient ? calculateFinalProficiency(pers) : 0;
  return mod + pb + toNumber(pw.attackBonus, 0) + getFeatureWeaponAttackBonus(pers, pw.weapon) + findD20PenaltyPart(pers).value;
}

export function calculateWeaponDamageBonus(pers: PersWithRelations, pw: PersWeaponWithWeapon): number {
  const ability = getWeaponAbility(pers, pw);
  const mod = calculateFinalModifier(pers, ability);
  let bonus = mod + toNumber(pw.customDamageBonus, 0);

  // Add bonuses granted by active features (e.g., Dueling, Thrown Weapon Fighting)
  bonus += getFeatureWeaponDamageBonus(pers, pw);

  if (ability === Ability.STR) bonus += readStateEffects(pers)?.strengthAttackDamageBonus ?? 0;

  // Add magic item ranged damage bonus if applicable
  if (pw.weapon && pw.weapon.isRanged) {
      bonus += getMagicItemRangedDamageBonus(pers);
  }

  return bonus;
}

// ============================================================================
// Helpers for UI
// ============================================================================

/** Check if any bonus is active for a stat */
export function hasStatBonuses(pers: PersWithRelations, ability: Ability): boolean {
  return getStatBonus(pers, ability) !== 0 ||
         getModifierBonus(pers, ability) !== 0 ||
         getSaveBonus(pers, ability) !== 0;
}

/** Check if skill has bonus */
export function hasSkillBonus(pers: PersWithRelations, skill: Skills): boolean {
  return getSkillBonus(pers, skill) !== 0;
}

/** Check if simple bonus is active */
export function hasSimpleBonus(pers: PersWithRelations, field: 'hp' | 'ac' | 'speed' | 'proficiency' | 'initiative' | 'spellAttack' | 'spellDC'): boolean {
  return getSimpleBonus(pers, field) !== 0;
}
