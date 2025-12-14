import { Ability, ArmorType, Language, Size, WeaponCategory, WeaponType, Skills } from "@prisma/client";

import {
  LanguageTranslations,
  SizeTranslations,
  armorTranslations,
  attributesUkrFull,
  engEnumSkills,
  weaponTranslations,
} from "@/lib/refs/translation";
import { MulticlassReqs, SkillProficiencies, ToolProficiencies, WeaponProficiencies } from "@/lib/types/model-types";

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

const abilityTranslations = attributesUkrFull;

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

const translateValue = (value?: string | number | null): string => {
  if (value === undefined || value === null) return "";
  const key = String(value);

  if ((abilityTranslations as Record<string, string>)[key]) return abilityTranslations[key as Ability];
  if (SizeTranslations[key]) return SizeTranslations[key];
  if (LanguageTranslations[key]) return LanguageTranslations[key];
  if (armorTranslations[key as keyof typeof armorTranslations]) return armorTranslations[key as keyof typeof armorTranslations];
  if (weaponTranslations[key as keyof typeof weaponTranslations])
    return weaponTranslations[key as keyof typeof weaponTranslations];
  if ((skillTranslations as Record<string, string>)[key]) return skillTranslations[key as Skills];

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
  if (!skills) return "—";
  if (Array.isArray(skills)) {
    return formatList(skills);
  }

  const { options, choiceCount, chooseAny } = skills;
  const count = choiceCount ?? options.length;

  if (chooseAny) {
    return `Обери будь-які ${count}`;
  }

  if (!options.length) return `Обери ${count}`;
  return `Обери ${count}: ${formatList(options)}`;
};

export const formatToolProficiencies = (tools?: ToolProficiencies | null, chooseCount?: number | null) => {
  const parts: string[] = [];

  if (tools && tools.length) {
    parts.push(formatList(tools));
  }

  if (chooseCount) {
    parts.push(`Обери ${chooseCount}`);
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
  profs?: WeaponProficiencies | WeaponType[] | WeaponCategory[] | null
) => {
  if (!profs) return "—";

  if (Array.isArray(profs)) {
    return formatList(profs);
  }

  const parts: string[] = [];

  if (profs.category?.length) {
    parts.push(formatList(profs.category));
  }
  if (profs.type?.length) {
    parts.push(formatList(profs.type));
  }

  return parts.length ? parts.join(" • ") : "—";
};

export const formatArmorProficiencies = (armor?: ArmorType[] | null) => formatList(armor);

export const formatAbilityList = (abilities?: Ability[] | null) => formatList(abilities);

export const formatMulticlassReqs = (reqs?: MulticlassReqs | (MulticlassReqs & { choice?: Ability[] }) | null) => {
  if (!reqs) return "—";

  const choice = (reqs as any).choice as Ability[] | undefined;
  const required = (reqs as any).required as Ability[] | undefined;

  if (choice?.length) {
    return `Характеристика ${reqs.score}+ в одній з: ${formatList(choice)}`;
  }

  if (required?.length) {
    return `Характеристика ${reqs.score}+ у: ${formatList(required)}`;
  }

  return `Потрібно ${reqs.score}+ у характеристиці`;
};
