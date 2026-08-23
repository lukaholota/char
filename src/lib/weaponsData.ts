/**
 * Static weapon data helpers for SSG pages and client catalogs.
 *
 * Reads from generated 2014 JSON file or normalized 2024 JSON.
 */

import { Ruleset, WeaponType, DamageType, WeaponProperty, WeaponMastery } from "@prisma/client";
import weapons2014Json from "./generated/weapons.json";
import weapons2024Json from "../../data/2024/normalized/weapons.json";
import { weaponTranslations } from "./refs/translation";
import { toEntitySlug } from "./slug-utils";

export type WeaponData = {
  id: number;
  code: string;
  name: string;
  nameUa: string;
  engName: string;
  damage: string;
  damageType: DamageType | string;
  weaponType: WeaponType | string;
  properties: (WeaponProperty | string)[];
  normalRange: number | null;
  longRange: number | null;
  versatileDamage: string | null;
  isRanged: boolean;
  isAdditional: boolean;
  mastery?: WeaponMastery | string | null;
  masteryNameUa?: string | null;
  weight?: string | null;
  cost?: string | null;
  ruleset: Ruleset;
  source: string;
};

const weapons2014: WeaponData[] = (weapons2014Json as Array<{
  id: number;
  code: string;
  name: string;
  nameUa: string;
  engName: string;
  damage: string;
  damageType: string;
  weaponType: string;
  properties: string[];
  normalRange: number | null;
  longRange: number | null;
  versatileDamage: string | null;
  isRanged: boolean;
  isAdditional: boolean;
  source: string;
}>).map((w) => ({
  id: w.id,
  code: w.code,
  name: w.name,
  nameUa: w.nameUa,
  engName: w.engName,
  damage: w.damage,
  damageType: w.damageType as DamageType,
  weaponType: w.weaponType as WeaponType,
  properties: w.properties as WeaponProperty[],
  normalRange: w.normalRange,
  longRange: w.longRange,
  versatileDamage: w.versatileDamage,
  isRanged: w.isRanged,
  isAdditional: w.isAdditional,
  mastery: null,
  masteryNameUa: null,
  weight: null,
  cost: null,
  ruleset: "RULES_2014" as Ruleset,
  source: w.source || "PHB_2014",
}));

function parsePropertiesString(raw: string): WeaponProperty[] {
  const props: WeaponProperty[] = [];
  const lower = raw.toLowerCase();
  if (lower.includes("finesse")) props.push(WeaponProperty.FINESSE);
  if (lower.includes("versatile")) props.push(WeaponProperty.VERSATILE);
  if (lower.includes("light")) props.push(WeaponProperty.LIGHT);
  if (lower.includes("heavy")) props.push(WeaponProperty.HEAVY);
  if (lower.includes("reach")) props.push(WeaponProperty.REACH);
  if (lower.includes("two-handed")) props.push(WeaponProperty.TWO_HANDED);
  if (lower.includes("thrown")) props.push(WeaponProperty.THROWN);
  if (lower.includes("ammunition")) props.push(WeaponProperty.AMMUNITION);
  if (lower.includes("loading")) props.push(WeaponProperty.LOADING);
  if (lower.includes("special")) props.push(WeaponProperty.SPECIAL);
  return props;
}

const weapons2024: WeaponData[] = (weapons2024Json as Array<{
  ruleset?: string;
  engName: string;
  damage: string;
  damageType: string;
  properties: string;
  mastery: string | null;
  masteryNameUa: string | null;
  weight: string;
  cost: string;
  weaponCategory: string;
  isRanged: boolean;
  source: string;
}>).map((w, index) => {
  const code = w.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const ua = (weaponTranslations as Record<string, string>)[code] || w.engName;
  const props = parsePropertiesString(w.properties || "");

  let normalRange: number | null = null;
  let longRange: number | null = null;
  const rangeMatch = (w.properties || "").match(/Range\s+(\d+)\/(\d+)/i);
  if (rangeMatch) {
    normalRange = parseInt(rangeMatch[1], 10);
    longRange = parseInt(rangeMatch[2], 10);
  }

  let versatileDamage: string | null = null;
  const versMatch = (w.properties || "").match(/Versatile\s*\(([^)]+)\)/i);
  if (versMatch) {
    versatileDamage = versMatch[1];
  }

  return {
    id: 20000 + index + 1,
    code,
    name: `${ua} [${w.engName}]`,
    nameUa: ua,
    engName: w.engName,
    damage: w.damage,
    damageType: w.damageType as DamageType,
    weaponType: w.weaponCategory === "SIMPLE" ? WeaponType.SIMPLE_WEAPON : WeaponType.MARTIAL_WEAPON,
    properties: props,
    normalRange,
    longRange,
    versatileDamage,
    isRanged: Boolean(w.isRanged),
    isAdditional: false,
    mastery: (w.mastery as WeaponMastery) ?? null,
    masteryNameUa: w.masteryNameUa ?? null,
    weight: w.weight,
    cost: w.cost,
    ruleset: "RULES_2024" as Ruleset,
    source: w.source || "PHB_2024",
  };
});

/**
 * Get all weapons for a given ruleset (defaults to RULES_2014)
 */
export function getAllWeapons(ruleset: Ruleset = "RULES_2014"): WeaponData[] {
  return ruleset === "RULES_2024" ? weapons2024 : weapons2014;
}

/**
 * Get weapon by ID for a specific ruleset
 */
export function getWeaponById(id: number, ruleset: Ruleset = "RULES_2014"): WeaponData | undefined {
  const list = getAllWeapons(ruleset);
  return list.find((w) => w.id === id);
}

/**
 * Get weapon by ID, slug, code or English name
 */
export function getWeaponByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): WeaponData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getWeaponById(Math.trunc(asNumber), ruleset);
  }

  const slug = toEntitySlug(trimmed);
  const list = getAllWeapons(ruleset);
  return list.find(
    (w) =>
      w.code.toLowerCase() === trimmed.toLowerCase() ||
      w.engName.toLowerCase() === trimmed.toLowerCase() ||
      toEntitySlug(w.engName) === slug ||
      w.nameUa.toLowerCase() === trimmed.toLowerCase() ||
      w.name.toLowerCase() === trimmed.toLowerCase()
  );
}
