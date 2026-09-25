import { Ability, ArmorType, Language, Size, WeaponCategory, WeaponType, Skills } from "@prisma/client";

import {
  LanguageTranslations,
  SizeTranslations,
  armorTranslations,
  attributesUkrFull,
  engEnumSkills,
  featTranslations,
  weaponTranslations,
  subraceTranslations,
  variantTranslations,
  sourceTranslations,
  toolTranslations,
  armorTypeTranslations,
  weaponTypeTranslations,
  backgroundTranslations,
  spellSchoolTranslations,
  damageTypeTranslations,
  raceTranslations,
  classTranslations,
  equipmentCategoryTranslations,
  spellcastingTypeTranslations,
  weaponPropertyTranslations,
  expertiseTranslations,
  magicItemTypeTranslations,
  rarityTranslations,
} from "@/lib/refs/translation";
import {
  MulticlassReqs,
  SkillProficiencies,
  WeaponProficiencies,
  WeaponProficienciesSpecial,
} from "@/lib/types/model-types";
import { describeSkillChoice, formatAnySkillsLabel, normalizeSkillProficiencies } from "@/rules/proficiency";
import { findSubclassName } from "@/lib/refs/subclass-name";

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const abilityTranslations = attributesUkrFull;

const ALL_SKILLS = Object.values(Skills);

const skillTranslations: Record<Skills, string> = Object.fromEntries(
  engEnumSkills.map(({ eng, ukr }) => [eng, ukr])
) as Record<Skills, string>;

export const prettifyEnum = (value?: string | number | null) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .split("_")
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
};

export const translateValue = (value?: string | number | null): string => {
  if (value === undefined || value === null) return "";
  const key = String(value);

  if ((abilityTranslations as Record<string, string>)[key]) return abilityTranslations[key as Ability];
  if (SizeTranslations[key]) return SizeTranslations[key];
  if (LanguageTranslations[key]) return LanguageTranslations[key];
  if (armorTranslations[key as keyof typeof armorTranslations]) return armorTranslations[key as keyof typeof armorTranslations];
  if (weaponTranslations[key as keyof typeof weaponTranslations])
    return weaponTranslations[key as keyof typeof weaponTranslations];
  if ((skillTranslations as Record<string, string>)[key]) return skillTranslations[key as Skills];
  if (raceTranslations[key as keyof typeof raceTranslations]) return raceTranslations[key as keyof typeof raceTranslations];
  if (classTranslations[key as keyof typeof classTranslations]) return classTranslations[key as keyof typeof classTranslations];
  if (subraceTranslations[key as keyof typeof subraceTranslations]) return subraceTranslations[key as keyof typeof subraceTranslations];
  if (variantTranslations[key as keyof typeof variantTranslations]) return variantTranslations[key as keyof typeof variantTranslations];
  const subclassName = findSubclassName(key);
  if (subclassName) return subclassName;
  if (sourceTranslations[key as keyof typeof sourceTranslations]) return sourceTranslations[key as keyof typeof sourceTranslations];
  if (featTranslations[key]) return featTranslations[key];
  if (toolTranslations[key as keyof typeof toolTranslations]) return toolTranslations[key as keyof typeof toolTranslations];
  if (armorTypeTranslations[key as keyof typeof armorTypeTranslations]) return armorTypeTranslations[key as keyof typeof armorTypeTranslations];
  if (weaponTypeTranslations[key as keyof typeof weaponTypeTranslations]) return weaponTypeTranslations[key as keyof typeof weaponTypeTranslations];
  if (backgroundTranslations[key as keyof typeof backgroundTranslations]) return backgroundTranslations[key as keyof typeof backgroundTranslations];
  if (expertiseTranslations[key as keyof typeof expertiseTranslations]) return expertiseTranslations[key as keyof typeof expertiseTranslations];
  if (equipmentCategoryTranslations[key as keyof typeof equipmentCategoryTranslations]) return equipmentCategoryTranslations[key as keyof typeof equipmentCategoryTranslations];
  if (weaponPropertyTranslations[key as keyof typeof weaponPropertyTranslations]) return weaponPropertyTranslations[key as keyof typeof weaponPropertyTranslations];
  if (spellSchoolTranslations[key as keyof typeof spellSchoolTranslations]) return spellSchoolTranslations[key as keyof typeof spellSchoolTranslations];
  if (damageTypeTranslations[key as keyof typeof damageTypeTranslations]) return damageTypeTranslations[key as keyof typeof damageTypeTranslations];
  if (spellcastingTypeTranslations[key as keyof typeof spellcastingTypeTranslations]) return spellcastingTypeTranslations[key as keyof typeof spellcastingTypeTranslations];
  if (magicItemTypeTranslations[key as keyof typeof magicItemTypeTranslations]) return magicItemTypeTranslations[key as keyof typeof magicItemTypeTranslations];
  if (rarityTranslations[key as keyof typeof rarityTranslations]) return rarityTranslations[key as keyof typeof rarityTranslations];

  return prettifyEnum(value);
};

export const formatList = (values?: Array<string | number> | null, fallback = "—") => {
  if (!values || values.length === 0) return fallback;
  return values.map((item) => translateValue(item)).join(", ");
};

export const formatSize = (values?: Size[] | null, fallback = "—") => {
  if (!values || values.length === 0) return fallback;
  return values.map((item) => translateValue(item)).join(", ");
};

export const formatSkillProficiencies = (skills?: SkillProficiencies | null) => {
  const normalized = normalizeSkillProficiencies(skills, ALL_SKILLS);
  if (!normalized) return "—";

  const choice = describeSkillChoice(normalized, ALL_SKILLS);
  if (choice.type === "fixed") return formatList(choice.skills);
  if (choice.type === "any") return formatAnySkillsLabel(choice.choiceCount);
  return `Обери ${choice.choiceCount}: ${formatList(choice.options)}`;
};

export const formatToolProficiencies = (tools?: string[] | null, chooseCount?: number | null) => {
  const parts: string[] = [];

  if (tools && tools.length) {
    parts.push(formatList(tools));
  }

  const toChoose = typeof chooseCount === "number" && Number.isFinite(chooseCount) ? Math.max(0, Math.trunc(chooseCount)) : 0;
  if (toChoose > 0) {
    parts.push(toChoose === 1 ? "Інструменти на вибір" : `Інструменти на вибір (${toChoose})`);
  }

  return parts.length ? parts.join(" • ") : "—";
};

export const formatLanguages = (languages?: Language[] | null, toChoose?: number | null) => {
  const hasLanguages = languages && languages.length;
  if (hasLanguages && toChoose) {
    return `${formatList(languages)} • обери ще ${toChoose}`;
  }
  if (hasLanguages) return formatList(languages);
  if (toChoose) return `Обери ${toChoose}`;
  return "—";
};

export const formatWeaponProficiencies = (
  profs?:
    | WeaponProficiencies
    | WeaponProficienciesSpecial
    | WeaponType[]
    | WeaponCategory[]
    | null,
  special?: WeaponProficienciesSpecial | null
) => {
  if (!profs) return "—";

  if (Array.isArray(profs)) {
    return formatList(profs);
  }

  const parts: string[] = [];
  const seen = new Set<string>();
  const addPart = (value?: string) => {
    if (!value || value === "—") return;
    if (seen.has(value)) return;
    seen.add(value);
    parts.push(value);
  };

  const category = (profs as WeaponProficiencies).category;
  const type = (profs as WeaponProficiencies).type;
  const specific = (profs as WeaponProficienciesSpecial).specific;

  if (category?.length) addPart(formatList(category));
  if (type?.length) addPart(formatList(type));
  if (specific?.length) addPart(formatList(specific));

  if (special?.specific?.length) addPart(formatList(special.specific));

  return parts.length ? parts.join(" • ") : "—";
};

export const formatArmorProficiencies = (armor?: readonly string[] | null) => {
  if (!armor?.length) return "—";
  // Avoid ambiguity with Size.MEDIUM translation (“Середній”).
  // ArmorType.MEDIUM should be “Середні обладунки”.
  return armor
    .map((a) => armorTypeTranslations[a as unknown as keyof typeof armorTypeTranslations] ?? String(a))
    .join(", ");
};

export const formatAbilityList = (abilities?: Ability[] | null) => formatList(abilities);

export const formatMulticlassReqs = (reqs?: MulticlassReqs | null) => {
  if (!reqs) return "—";

  // `and` — форма монаха, паладина й слідопита 2024; читається так само, як `required` у 2014.
  const everyOf = reqs.and?.length ? reqs.and : reqs.required;
  if (everyOf?.length) {
    return `Характеристика ${reqs.score}+ у: ${formatList(everyOf)}`;
  }

  if (reqs.choice?.length) {
    return `Характеристика ${reqs.score}+ в одній з: ${formatList(reqs.choice)}`;
  }

  return `Потрібно ${reqs.score}+ у характеристиці`;
};

export const formatRaceAC = (ac?: any | null) => {
  if (!ac) return "10";
  if ("consistentBonus" in ac) {
    return `+${ac.consistentBonus} до КБ`;
  }
  const bonus = ac.bonus ? ` + ${ac.bonus}` : "";
  return `База ${ac.base}${bonus}`;
};

export const normalizeRaceASI = (asi?: any | null) => {
  if (!asi || typeof asi !== "object") return asi;

  // If this is NOT a RaceASI-like structure (no basic/tasha), keep as-is.
  const looksLikeRaceASI = "basic" in asi || "tasha" in asi || "flexible" in asi;
  if (!looksLikeRaceASI) {
    const abilityKeys = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
    const entries = Object.entries(asi).filter(
      ([k, v]) => abilityKeys.includes(String(k).toUpperCase()) && typeof v === "number" && Number(v) !== 0
    );
    if (!entries.length) return asi;

    const simple = Object.fromEntries(
      entries.map(([k, v]) => [String(k).toUpperCase(), Number(v)])
    );

    const byValue = new Map<number, number>();
    for (const [, v] of entries) {
      const n = Number(v);
      if (!Number.isFinite(n) || n === 0) continue;
      byValue.set(n, (byValue.get(n) ?? 0) + 1);
    }

    const tashaGroups = Array.from(byValue.entries())
      .sort((a, b) => b[0] - a[0])
      .map(([value, count]) => ({
        groupName: `+${value} до ${count}`,
        value,
        choiceCount: count,
        unique: true,
      }));

    return {
      basic: { simple, flexible: { groups: [] } },
      tasha: { flexible: { groups: tashaGroups } },
    };
  }

  // clone (avoid mutating the source object from prisma/json)
  let next: any;
  try {
    next = JSON.parse(JSON.stringify(asi));
  } catch {
    next = { ...asi };
  }

  // Support legacy-ish shape: { flexible: { groups } } as "basic"
  if (!next.basic && next.flexible?.groups) {
    next.basic = { simple: {}, flexible: next.flexible };
  }

  // If only tasha is present, treat it as basic too (MPMM / new sources fallback)
  if (!next.basic && next.tasha?.flexible) {
    next.basic = { simple: {}, flexible: next.tasha.flexible };
  }

  // Ensure basic.simple exists when basic exists
  if (next.basic && !next.basic.simple) {
    next.basic.simple = {};
  }

  return next;
};

const ABILITY_KEYS = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];

type FlexibleGroup = { groupName: string; value: number; choiceCount: number };

function collectPlainAsiEntries(asi: Record<string, unknown>): [string, number][] {
  return Object.entries(asi)
    .filter(
      ([key, value]) =>
        ABILITY_KEYS.includes(String(key).toUpperCase()) && typeof value === "number" && Number(value) !== 0
    )
    .map(([key, value]) => [String(key).toUpperCase(), Number(value)]);
}

function isPlainAsiMap(asi: object): boolean {
  return !("basic" in asi) && !("tasha" in asi) && !("flexible" in asi);
}

/// Шість однакових бонусів — це «+1 до всіх», а не шість слів через кому.
function formatFixedEntries(entries: [string, number][]): string {
  const values = new Set(entries.map(([, value]) => value));
  if (entries.length === ABILITY_KEYS.length && values.size === 1) {
    return `+${entries[0][1]} до всіх`;
  }
  return entries.map(([stat, value]) => `${translateValue(stat)} +${value}`).join(", ");
}

function formatFlexibleGroups(groups: FlexibleGroup[]): string {
  return groups.map((group) => `${group.groupName} (+${group.value}, оберіть ${group.choiceCount})`).join("; ");
}

type AsiParts = {
  fixed: [string, number][];
  basicFlexible: FlexibleGroup[];
  tashaFlexible: FlexibleGroup[];
  hasOwnBasic: boolean;
};

/// `normalizeRaceASI` дзеркалить `tasha` у `basic`, коли свого `basic` немає, — конструктору
/// це потрібно, щоб дати вибір. Для підпису це той самий бонус двома рядками, тож гнучку
/// групу basic показуємо лише тоді, коли вона була в джерелі.
function collectAsiParts(asi: any): AsiParts {
  const normalized = normalizeRaceASI(asi);
  const hasOwnBasic = Boolean(asi?.basic) || Boolean(asi?.flexible);

  return {
    fixed: Object.entries(normalized?.basic?.simple || {}).map(([stat, value]) => [
      String(stat).toUpperCase(),
      Number(value),
    ]),
    basicFlexible: hasOwnBasic ? normalized?.basic?.flexible?.groups || [] : [],
    tashaFlexible: normalized?.tasha?.flexible?.groups || [],
    hasOwnBasic,
  };
}

export const formatASI = (asi?: any | null) => {
  if (!asi) return "—";

  if (typeof asi === "object" && isPlainAsiMap(asi)) {
    const entries = collectPlainAsiEntries(asi);
    return entries.length ? `Фіксовано: ${formatFixedEntries(entries)}` : "—";
  }

  const { fixed, basicFlexible, tashaFlexible } = collectAsiParts(asi);
  const parts: string[] = [];

  if (fixed.length) parts.push(`Фіксовано: ${formatFixedEntries(fixed)}`);
  if (basicFlexible.length) parts.push(`Гнучко: ${formatFlexibleGroups(basicFlexible)}`);
  if (tashaFlexible.length) parts.push(`За Ташею: ${formatFlexibleGroups(tashaFlexible)}`);

  return parts.join(" • ") || "—";
};

/// Підпис для каталогу рас (рішення власника 2026-09-02): без варіанта «за Ташею» — читач
/// каталогу дивиться правило раси, а не опції конструктора. Раса, у якої гнучкий бонус і є
/// правилом (MPMM, Фізбан, Custom Lineage), показує його як «Гнучко».
export const formatCatalogASI = (asi?: any | null) => {
  if (!asi) return "—";

  if (typeof asi === "object" && isPlainAsiMap(asi)) return formatASI(asi);

  const { fixed, basicFlexible, tashaFlexible, hasOwnBasic } = collectAsiParts(asi);
  const flexible = hasOwnBasic ? basicFlexible : tashaFlexible;
  const parts: string[] = [];

  if (fixed.length) parts.push(`Фіксовано: ${formatFixedEntries(fixed)}`);
  if (flexible.length) parts.push(`Гнучко: ${flexible.map((group) => group.groupName).join(", ")}`);

  return parts.join(" • ") || "—";
};

export const formatSpeeds = (entity: any) => {
  const speeds = [
    { label: "Ходьба", value: entity.speed },
    { label: "Лазіння", value: entity.climbSpeed },
    { label: "Плавання", value: entity.swimSpeed },
    { label: "Політ", value: entity.flightSpeed },
    { label: "Риття", value: entity.burrowSpeed },
  ].filter((item) => (item.value ?? 0) > 0 || (item.label === "Ходьба" && item.value != null));

  return speeds
    .map((item) => `${item.label}: ${item.value} фт`)
    .join(" • ");
};
