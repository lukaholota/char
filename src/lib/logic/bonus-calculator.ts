/**
 * Bonus calculation helpers
 * All functions handle null/undefined JSON fields gracefully
 */

import { Ability, Skills, SkillProficiencyType, ArmorType, WeaponProperty } from "@prisma/client";
import type { Feature } from "@prisma/client";
import { PersWithRelations, PersWeaponWithWeapon } from "@/lib/actions/pers";
import { getAbilityMod, getProficiencyBonus, skillAbilityMap } from "./utils";
import { StatBonuses, SkillBonuses, SimpleBonusValue } from "@/lib/types/model-types";

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

function collectActiveFeatures(pers: PersWithRelations): Feature[] {
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

/** Calculate final stat value (base + statBonuses) */
export function calculateFinalStat(pers: PersWithRelations, ability: Ability): number {
  return getBaseStat(pers, ability) + getStatBonus(pers, ability);
}

/** Calculate final modifier (from modified stat + modifierBonuses) */
export function calculateFinalModifier(pers: PersWithRelations, ability: Ability): number {
  const finalStat = calculateFinalStat(pers, ability);
  const baseMod = getAbilityMod(finalStat);
  return baseMod + getModifierBonus(pers, ability);
}

/** Calculate final save (modifier + proficiency if proficient + saveBonuses) */
export function calculateFinalSave(
  pers: PersWithRelations,
  ability: Ability,
  _classSavingThrows?: Ability[] // kept for backward compatibility; not used
): number {
  const mod = calculateFinalModifier(pers, ability);
  const additionalSaves = (pers as any).additionalSaveProficiencies as Ability[] ?? [];
  const isProficient = additionalSaves.includes(ability);
  const pb = isProficient ? calculateFinalProficiency(pers) : 0;
  const saveBonus = getSaveBonus(pers, ability);
  
  // Also add misc save bonuses from existing field
  const miscBonuses = (pers as unknown as { miscSaveBonuses?: Record<string, number> }).miscSaveBonuses ?? {};
  const miscBonus = miscBonuses[ability] ?? 0;
  
  // Add Magic Item bonuses
  const magicItemBonus = getMagicItemSaveBonus(pers, ability);

  return mod + pb + saveBonus + miscBonus + magicItemBonus;
}

/** Calculate final skill modifier */
export function calculateFinalSkill(
  pers: PersWithRelations,
  skill: Skills
): { total: number; proficiency: SkillProficiencyType | "NONE" } {
  // Get ability for this skill
  const abilityKey = skillAbilityMap[skill];
  const ability = abilityKey?.toUpperCase() as Ability;
  
  // Get ability score
  const abilityScore = ability ? getBaseStat(pers, ability) + getStatBonus(pers, ability) : 10;
  const abilityMod = getAbilityMod(abilityScore);
  const modBonus = ability ? getModifierBonus(pers, ability) : 0;
  
  // Get proficiency
  const persSkill = pers.skills.find((ps) => ps.name === skill);
  const proficiency = persSkill?.proficiencyType ?? "NONE";
  
  const pb = calculateFinalProficiency(pers);
  let total = abilityMod + modBonus;
  
  if (proficiency === SkillProficiencyType.HALF) total += Math.floor(pb / 2);
  if (proficiency === SkillProficiencyType.PROFICIENT) total += pb;
  if (proficiency === SkillProficiencyType.EXPERTISE) total += pb * 2;
  
  // Add skill bonus
  total += getSkillBonus(pers, skill);
  
  return { total, proficiency };
}

/** Calculate final proficiency bonus */
export function calculateFinalProficiency(pers: PersWithRelations): number {
  return getProficiencyBonus(pers.level) + getSimpleBonus(pers, "proficiency");
}

/** Calculate final AC */
export function calculateFinalAC(pers: PersWithRelations): number {
  const dexMod = calculateFinalModifier(pers, Ability.DEX);
  
  // 1. Find equipped armor
  const equippedArmor = pers.armors.find(a => a.equipped);
  
  let baseAC = 10 + dexMod; // default unarmored
  
  const hasArmor = !!equippedArmor;
  const hasShield = pers.wearsShield;

  if (equippedArmor) {
    const armorBase = equippedArmor.overrideBaseAC ?? equippedArmor.armor.baseAC;
    const armorType = equippedArmor.armor.armorType;
    
    let dexBonus = dexMod;
    if (armorType === ArmorType.MEDIUM) {
      dexBonus = Math.min(dexMod, 2);
    } else if (armorType === ArmorType.HEAVY) {
      dexBonus = 0;
    }
    
    baseAC = armorBase + dexBonus + (equippedArmor.miscACBonus ?? 0);
  }
  
  // 2. Add shield
  if (hasShield) {
    baseAC += 2 + pers.additionalShieldBonus;
  }
  
  // 3. Add custom AC bonuses from simple bonus system
  baseAC += getSimpleBonus(pers, "ac");

  // 3.5 Add AC bonuses granted by active features (e.g., Defense)
  baseAC += getFeatureACBonus(pers, hasArmor, hasShield);

  // 4. Add Magic Items AC bonus
  baseAC += getMagicItemACBonus(pers, hasArmor, hasShield);

  return baseAC;
}

/** Calculate final speed (base 30 + bonuses) */
export function calculateFinalSpeed(pers: PersWithRelations): number {
  // TODO: Get from race when race has speed field
  return 30 + getSimpleBonus(pers, "speed");
}

/** Calculate final initiative */
export function calculateFinalInitiative(pers: PersWithRelations): number {
  const dexMod = calculateFinalModifier(pers, Ability.DEX);
  return dexMod + getSimpleBonus(pers, "initiative");
}

/** Calculate final max HP */
export function calculateFinalMaxHP(pers: PersWithRelations): number {
  return pers.maxHp + getSimpleBonus(pers, "hp");
}

/** Calculate spell attack bonus */
export function calculateSpellAttack(pers: PersWithRelations, spellcastingAbility: Ability): number {
  const mod = calculateFinalModifier(pers, spellcastingAbility);
  const pb = calculateFinalProficiency(pers);
  return mod + pb + getSimpleBonus(pers, "spellAttack");
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

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return fallback;
}

export function getWeaponAbility(pers: PersWithRelations, pw: PersWeaponWithWeapon): Ability {
  if (pw.customDamageAbility) return pw.customDamageAbility;

  const weapon = pw.weapon;
  if (weapon?.isRanged) return Ability.DEX;

  const isFinesse = Boolean(weapon?.properties?.includes(WeaponProperty.FINESSE));
  if (isFinesse) {
    const strMod = calculateFinalModifier(pers, Ability.STR);
    const dexMod = calculateFinalModifier(pers, Ability.DEX);
    return dexMod >= strMod ? Ability.DEX : Ability.STR;
  }

  return Ability.STR;
}

export function calculateWeaponAttackBonus(pers: PersWithRelations, pw: PersWeaponWithWeapon): number {
  const ability = getWeaponAbility(pers, pw);
  const mod = calculateFinalModifier(pers, ability);
  const pb = pw.isProficient ? calculateFinalProficiency(pers) : 0;
  return mod + pb + toNumber(pw.attackBonus, 0);
}

export function calculateWeaponDamageBonus(pers: PersWithRelations, pw: PersWeaponWithWeapon): number {
  const ability = getWeaponAbility(pers, pw);
  const mod = calculateFinalModifier(pers, ability);
  let bonus = mod + toNumber(pw.customDamageBonus, 0);

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
