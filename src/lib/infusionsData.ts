/**
 * Static Artificer Infusions data helpers for SSG pages and client catalogs.
 *
 * Reads from generated 2014 JSON file (TCoE).
 */

import { Ruleset, InfusionTargetType } from "@prisma/client";
import infusionsJson from "./generated/infusions.json";
import { toEntitySlug } from "./slug-utils";

export type InfusionData = {
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minArtificerLevel: number;
  targetType: InfusionTargetType | string;
  requiresAttunement: boolean;
  bonusToAC: number | null;
  bonusToAttackRoll: number | null;
  bonusToDamage: number | null;
  spellAttackBonus: number | null;
  increasesAtLevel10By: number | null;
  speedBonus: number | null;
  description: string;
  shortDescription: string;
  ruleset: Ruleset;
  source: string;
};

const infusions2014: InfusionData[] = (infusionsJson as Array<{
  id: number;
  name: string;
  nameUa: string;
  engName: string;
  minArtificerLevel: number;
  targetType: string;
  requiresAttunement: boolean;
  bonusToAC: number | null;
  bonusToAttackRoll: number | null;
  bonusToDamage: number | null;
  spellAttackBonus: number | null;
  increasesAtLevel10By: number | null;
  speedBonus: number | null;
  description: string;
  shortDescription: string;
  source: string;
}>).map((inf) => ({
  id: inf.id,
  name: inf.name,
  nameUa: inf.nameUa,
  engName: inf.engName,
  minArtificerLevel: inf.minArtificerLevel,
  targetType: inf.targetType as InfusionTargetType,
  requiresAttunement: inf.requiresAttunement,
  bonusToAC: inf.bonusToAC,
  bonusToAttackRoll: inf.bonusToAttackRoll,
  bonusToDamage: inf.bonusToDamage,
  spellAttackBonus: inf.spellAttackBonus,
  increasesAtLevel10By: inf.increasesAtLevel10By,
  speedBonus: inf.speedBonus,
  description: inf.description,
  shortDescription: inf.shortDescription,
  ruleset: "RULES_2014" as Ruleset,
  source: inf.source || "TCoE",
}));

/**
 * Get all Artificer infusions (2014)
 */
export function getAllInfusions(): InfusionData[] {
  return infusions2014;
}

/**
 * Get infusion by ID
 */
export function getInfusionById(id: number): InfusionData | undefined {
  return infusions2014.find((i) => i.id === id);
}

/**
 * Get infusion by ID, slug, English name or Ukrainian name
 */
export function getInfusionByIdOrSlug(idOrSlug: string): InfusionData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getInfusionById(Math.trunc(asNumber));
  }

  const slug = toEntitySlug(trimmed);
  return infusions2014.find(
    (i) =>
      i.engName.toLowerCase() === trimmed.toLowerCase() ||
      toEntitySlug(i.engName) === slug ||
      i.nameUa.toLowerCase() === trimmed.toLowerCase() ||
      i.name.toLowerCase() === trimmed.toLowerCase()
  );
}
