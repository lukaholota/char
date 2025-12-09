import { Ability, ArmorType, Language, WeaponCategory, WeaponType } from "@prisma/client";

import { MulticlassReqs, SkillProficiencies, ToolProficiencies, WeaponProficiencies } from "@/lib/types/model-types";

const capitalize = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1).toLowerCase();

export const prettifyEnum = (value?: string | number | null) => {
  if (value === undefined || value === null) return "";
  return String(value)
    .split("_")
    .filter(Boolean)
    .map(capitalize)
    .join(" ");
};

export const formatList = (
  values?: Array<string | number> | null,
  fallback = "—"
) => {
  if (!values || values.length === 0) return fallback;
  return values.map((item) => prettifyEnum(item)).join(", ");
};

export const formatSkillProficiencies = (skills?: SkillProficiencies | null) => {
  if (!skills) return "—";
  if (Array.isArray(skills)) {
    return formatList(skills);
  }

  const { options, choiceCount, chooseAny } = skills;
  const count = choiceCount ?? options.length;

  if (chooseAny) {
    return `Choose any ${count}`;
  }

  if (!options.length) return `Choose ${count}`;
  return `Choose ${count}: ${formatList(options)}`;
};

export const formatToolProficiencies = (
  tools?: ToolProficiencies | null,
  chooseCount?: number | null
) => {
  const parts: string[] = [];

  if (tools && tools.length) {
    parts.push(formatList(tools));
  }

  if (chooseCount) {
    parts.push(`Choose ${chooseCount}`);
  }

  return parts.length ? parts.join(" • ") : "—";
};

export const formatLanguages = (
  languages?: Language[] | null,
  toChoose?: number | null
) => {
  const hasLanguages = languages && languages.length;
  if (hasLanguages && toChoose) {
    return `${formatList(languages)} • Choose ${toChoose}`;
  }
  if (hasLanguages) return formatList(languages);
  if (toChoose) return `Choose ${toChoose}`;
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

export const formatArmorProficiencies = (armor?: ArmorType[] | null) =>
  formatList(armor);

export const formatAbilityList = (abilities?: Ability[] | null) =>
  formatList(abilities);

export const formatMulticlassReqs = (
  reqs?: MulticlassReqs | (MulticlassReqs & { choice?: Ability[] }) | null
) => {
  if (!reqs) return "—";

  const choice = (reqs as any).choice as Ability[] | undefined;
  const required = (reqs as any).required as Ability[] | undefined;

  if (choice?.length) {
    return `Score ${reqs.score}+ in one of: ${formatList(choice)}`;
  }

  if (required?.length) {
    return `Score ${reqs.score}+ in ${formatList(required)}`;
  }

  return `Score ${reqs.score}+`;
};
