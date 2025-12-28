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
  subclassTranslations,
  sourceTranslations,
  toolTranslations,
  armorTypeTranslations,
  weaponTypeTranslations,
  backgroundTranslations,
  spellSchoolTranslations,
  damageTypeTranslations,
  raceTranslations,
  classTranslations,
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
  if (subclassTranslations[key as keyof typeof subclassTranslations]) return subclassTranslations[key as keyof typeof subclassTranslations];
  if (sourceTranslations[key as keyof typeof sourceTranslations]) return sourceTranslations[key as keyof typeof sourceTranslations];
  if (featTranslations[key]) return featTranslations[key];
  if (toolTranslations[key as keyof typeof toolTranslations]) return toolTranslations[key as keyof typeof toolTranslations];
  if (armorTypeTranslations[key as keyof typeof armorTypeTranslations]) return armorTypeTranslations[key as keyof typeof armorTypeTranslations];
  if (weaponTypeTranslations[key as keyof typeof weaponTypeTranslations]) return weaponTypeTranslations[key as keyof typeof weaponTypeTranslations];
  if (backgroundTranslations[key as keyof typeof backgroundTranslations]) return backgroundTranslations[key as keyof typeof backgroundTranslations];
  if (spellSchoolTranslations[key as keyof typeof spellSchoolTranslations]) return spellSchoolTranslations[key as keyof typeof spellSchoolTranslations];
  if (damageTypeTranslations[key as keyof typeof damageTypeTranslations]) return damageTypeTranslations[key as keyof typeof damageTypeTranslations];

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

export const formatRaceAC = (ac?: any | null) => {
  if (!ac) return "10";
  if ("consistentBonus" in ac) {
    return `+${ac.consistentBonus} до КБ`;
  }
  const bonus = ac.bonus ? ` + ${ac.bonus}` : "";
  return `База ${ac.base}${bonus}`;
};

export const formatASI = (asi?: any | null) => {
  if (!asi) return "—";

  const fixedEntries = Object.entries(asi.basic?.simple || {});
  const basicFlexible = asi.basic?.flexible?.groups || [];
  const tashaFlexible = asi.tasha?.flexible?.groups || [];

  const parts: string[] = [];

  if (fixedEntries.length) {
    parts.push(
      `Фіксовано: ${fixedEntries
        .map(([stat, value]) => `${translateValue(String(stat).toUpperCase())} +${value}`)
        .join(", ")}`
    );
  }

  if (basicFlexible.length) {
    parts.push(
      `Гнучко: ${basicFlexible
        .map(
          (group: any) =>
            `${group.groupName} (+${group.value}, оберіть ${group.choiceCount})`
        )
        .join("; ")}`
    );
  }

  if (tashaFlexible.length) {
    parts.push(
      `За Та́шею: ${tashaFlexible
        .map(
          (group: any) =>
            `${group.groupName} (+${group.value}, оберіть ${group.choiceCount})`
        )
        .join("; ")}`
    );
  }

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
