/**
 * Static armor data helpers for SSG pages and client catalogs.
 *
 * Reads from generated 2014 JSON file or normalized 2024 JSON.
 */

import { Ruleset, ArmorType, AbilityBonusType } from "@prisma/client";
import armor2014Json from "./generated/armor.json";
import armor2024Json from "../../data/2024/normalized/armor.json";
import { toEntitySlug } from "./slug-utils";

export type ArmorData = {
  id: number;
  code: string;
  name: string;
  nameUa: string;
  engName: string;
  armorType: ArmorType | string;
  baseAC: number;
  abilityBonusType: AbilityBonusType | string;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  weight: string;
  cost: string;
  donDoffTime: string;
  isStandardEquipment: boolean;
  ruleset: Ruleset;
  source: string;
};

const armor2014: ArmorData[] = (armor2014Json as Array<{
  id: number;
  code: string;
  name: string;
  nameUa: string;
  engName: string;
  armorType: string;
  baseAC: number;
  abilityBonusType: string;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  weight: string;
  cost: string;
  donDoffTime: string;
  isStandardEquipment: boolean;
  source: string;
}>).map((a) => ({
  id: a.id,
  code: a.code,
  name: a.name,
  nameUa: a.nameUa,
  engName: a.engName,
  armorType: a.armorType as ArmorType,
  baseAC: a.baseAC,
  abilityBonusType: a.abilityBonusType as AbilityBonusType,
  strengthReq: a.strengthReq,
  stealthDisadvantage: a.stealthDisadvantage,
  weight: a.weight,
  cost: a.cost,
  donDoffTime: a.donDoffTime,
  isStandardEquipment: a.isStandardEquipment,
  ruleset: "RULES_2014" as Ruleset,
  source: a.source || "PHB_2014",
}));

const armor2024: ArmorData[] = (armor2024Json as Array<{
  id: number;
  code: string;
  name: string;
  nameUa: string;
  engName: string;
  armorType: string;
  baseAC: number;
  abilityBonusType: string;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
  weight: string;
  cost: string;
  donDoffTime: string;
  isStandardEquipment: boolean;
  source: string;
}>).map((a) => ({
  id: a.id,
  code: a.code,
  name: a.name,
  nameUa: a.nameUa,
  engName: a.engName,
  armorType: a.armorType as ArmorType,
  baseAC: a.baseAC,
  abilityBonusType: a.abilityBonusType as AbilityBonusType,
  strengthReq: a.strengthReq,
  stealthDisadvantage: a.stealthDisadvantage,
  weight: a.weight,
  cost: a.cost,
  donDoffTime: a.donDoffTime,
  isStandardEquipment: a.isStandardEquipment,
  ruleset: "RULES_2024" as Ruleset,
  source: a.source || "PHB_2024",
}));

/**
 * Get all armors for a given ruleset (defaults to RULES_2014)
 */
export function getAllArmors(ruleset: Ruleset = "RULES_2014"): ArmorData[] {
  return ruleset === "RULES_2024" ? armor2024 : armor2014;
}

/**
 * Get armor by ID for a specific ruleset
 */
export function getArmorById(id: number, ruleset: Ruleset = "RULES_2014"): ArmorData | undefined {
  const list = getAllArmors(ruleset);
  return list.find((a) => a.id === id);
}

/**
 * Get armor by ID, slug, code or English name
 */
export function getArmorByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): ArmorData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getArmorById(Math.trunc(asNumber), ruleset);
  }

  const slug = toEntitySlug(trimmed);
  const list = getAllArmors(ruleset);
  return list.find(
    (a) =>
      a.code.toLowerCase() === trimmed.toLowerCase() ||
      a.engName.toLowerCase() === trimmed.toLowerCase() ||
      toEntitySlug(a.engName) === slug ||
      a.nameUa.toLowerCase() === trimmed.toLowerCase() ||
      a.name.toLowerCase() === trimmed.toLowerCase()
  );
}
