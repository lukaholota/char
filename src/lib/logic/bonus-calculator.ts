/**
 * Bonus calculation helpers
 * All functions handle null/undefined JSON fields gracefully
 */

import { Ability, Skills, SkillProficiencyType, ArmorType } from "@prisma/client";
import { PersWithRelations } from "@/lib/actions/pers";
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
  classSavingThrows: Ability[] // Renamed parameter to avoid conflict with local variable
): number {
  const mod = calculateFinalModifier(pers, ability);
  const additionalSaves = (pers as any).additionalSaveProficiencies as Ability[] ?? [];
  const isProficient = classSavingThrows.includes(ability) || additionalSaves.includes(ability);
  const pb = isProficient ? calculateFinalProficiency(pers) : 0;
  const saveBonus = getSaveBonus(pers, ability);
  
  // Also add misc save bonuses from existing field
  const miscBonuses = (pers as unknown as { miscSaveBonuses?: Record<string, number> }).miscSaveBonuses ?? {};
  const miscBonus = miscBonuses[ability] ?? 0;
  
  return mod + pb + saveBonus + miscBonus;
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
  if (pers.wearsShield) {
    baseAC += 2 + pers.additionalShieldBonus;
  }
  
  // 3. Add custom AC bonuses from simple bonus system
  return baseAC + getSimpleBonus(pers, "ac");
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
