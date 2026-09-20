import {
  armorTypeTranslations,
  attributesUkrShort,
  damageTypeTranslations,
  weaponPropertyTranslations,
} from "@/lib/refs/translation";

export type WeaponStats = {
  damage: string;
  damageType: string;
  properties: string[];
  versatileDamage: string | null;
  normalRange: number | null;
  longRange: number | null;
  isRanged: boolean;
};

export type ArmorStats = {
  armorType: string;
  baseAC: number;
  abilityBonusType: string;
  strengthReq: number | null;
  stealthDisadvantage: boolean;
};

/// «1к6 + СИЛ, дробяча шкода · універсальна (1к8)» — те, що гравець мусив би шукати в книзі,
/// щоб вирішити між двома варіантами спорядження.
export const describeWeaponStats = (weapon: WeaponStats): string =>
  [describeWeaponHit(weapon), ...weapon.properties.map((property) => describeWeaponProperty(weapon, property))]
    .filter(Boolean)
    .join(" · ");

export const describeArmorStats = (armor: ArmorStats): string => {
  if (armor.armorType === "SHIELD") return "+2 до КБ";

  return [
    lowercaseFirst(armorTypeTranslations[armor.armorType] ?? armor.armorType),
    `КБ ${formatArmorClass(armor)}`,
    armor.strengthReq ? `Сила ${armor.strengthReq}` : "",
    armor.stealthDisadvantage ? "перешкода на Непомітність" : "",
  ]
    .filter(Boolean)
    .join(" · ");
};

export const formatArmorClass = (armor: Pick<ArmorStats, "armorType" | "baseAC" | "abilityBonusType">): string => {
  if (armor.armorType === "SHIELD") return "+2";
  if (armor.abilityBonusType === "FULL") return `${armor.baseAC} + Мод. СПР`;
  if (armor.abilityBonusType === "MAX2") return `${armor.baseAC} + Мод. СПР (макс. +2)`;
  return `${armor.baseAC}`;
};

export const formatDiceUkr = (value: string): string => value.replace(/(\d)\s*[dD]\s*(\d)/g, "$1к$2");

const describeWeaponHit = (weapon: WeaponStats): string => {
  if (!/\d/.test(weapon.damage)) return "";
  const damageType = damageTypeTranslations[weapon.damageType];
  const hit = `${formatDiceUkr(weapon.damage)} + ${findAttackAbility(weapon)}`;
  return damageType ? `${hit}, ${lowercaseFirst(damageType)} шкода` : hit;
};

const findAttackAbility = (weapon: WeaponStats): string => {
  if (weapon.properties.includes("FINESSE")) return `${attributesUkrShort.STR} або ${attributesUkrShort.DEX}`;
  if (weapon.isRanged && !weapon.properties.includes("THROWN")) return attributesUkrShort.DEX;
  return attributesUkrShort.STR;
};

const describeWeaponProperty = (weapon: WeaponStats, property: string): string => {
  const label = lowercaseFirst(weaponPropertyTranslations[property] ?? property);
  if (property === "VERSATILE" && weapon.versatileDamage) return `${label} (${formatDiceUkr(weapon.versatileDamage)})`;
  if ((property === "THROWN" || property === "AMMUNITION") && weapon.normalRange) {
    return `${label} (${weapon.normalRange}/${weapon.longRange ?? weapon.normalRange} фт)`;
  }
  return label;
};

const lowercaseFirst = (value: string): string => value.charAt(0).toLocaleLowerCase("uk") + value.slice(1);
