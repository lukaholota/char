/**
 * Static background data helpers for SSG pages and client catalogs.
 *
 * Reads the generated 2014 JSON (produced from the database) or the normalized 2024 JSON.
 */

import { Ruleset } from "@prisma/client";
import backgrounds2014Json from "@/lib/generated/backgrounds.json";
import backgrounds2024Json from "../../data/2024/normalized/backgrounds.json";
import { skillTranslations, toolTranslations } from "@/lib/refs/translation";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";

export type BackgroundSkill = {
  enum: string;
  nameUa: string;
};

export type BackgroundEquipmentItem = {
  name: string;
  quantity: number;
};

export type BackgroundOriginFeat = {
  engName: string;
  nameUa: string;
};

export type BackgroundData = {
  backgroundId: number;
  key: string;
  slug: string;
  name: string;
  engName: string;
  source: string;
  shortDescription: string;
  description: string;
  skills: BackgroundSkill[];
  skillChoiceCount: number;
  tools: string[];
  languagesToChooseCount: number;
  equipmentItems: BackgroundEquipmentItem[];
  equipmentEngText: string | null;
  grantsGoldInstead: number | null;
  specialAbilityName: string | null;
  abilityOptions: string[];
  originFeat: BackgroundOriginFeat | null;
  ruleset: Ruleset;
};

type Raw2014Background = {
  backgroundId: number;
  key: string;
  name: string;
  engName: string;
  source: string;
  description: string;
  skillProficiencies: string[];
  skillChoiceCount: number;
  toolProficiencies: string[];
  languagesToChooseCount: number;
  items: BackgroundEquipmentItem[];
  specialAbilityName: string | null;
};

type Raw2024Background = {
  engName: string;
  name: string;
  shortDescription?: string;
  description?: string;
  abilityOptions?: string[];
  skillProficiencies?: Array<{ enum: string; nameUa: string }>;
  toolProficiency?: { nameUa?: string; engText?: string } | null;
  originFeat?: BackgroundOriginFeat | null;
  equipmentEngText?: string;
  grantsGoldInstead?: number | null;
  source?: string;
};

function findSkillLabel(skillEnum: string): string {
  return skillTranslations[skillEnum] ?? skillEnum;
}

function findToolLabel(toolEnum: string): string {
  return toolTranslations[toolEnum] ?? toolEnum;
}

const backgrounds2014: BackgroundData[] = (backgrounds2014Json as Raw2014Background[]).map((b) => ({
  backgroundId: b.backgroundId,
  key: b.key,
  slug: toEntitySlug(b.engName),
  name: b.name,
  engName: b.engName,
  source: b.source || "PHB",
  shortDescription: getDescriptionSnippet(b.description || "", 180),
  description: b.description || "",
  skills: (b.skillProficiencies ?? []).map((skill) => ({ enum: skill, nameUa: findSkillLabel(skill) })),
  skillChoiceCount: b.skillChoiceCount ?? 0,
  tools: (b.toolProficiencies ?? []).map(findToolLabel),
  languagesToChooseCount: b.languagesToChooseCount ?? 0,
  equipmentItems: b.items ?? [],
  equipmentEngText: null,
  grantsGoldInstead: null,
  specialAbilityName: b.specialAbilityName,
  abilityOptions: [],
  originFeat: null,
  ruleset: "RULES_2014" as Ruleset,
}));

const backgrounds2024: BackgroundData[] = (backgrounds2024Json as Raw2024Background[]).map((b, index) => {
  const toolLabel = b.toolProficiency?.nameUa || b.toolProficiency?.engText || "";

  return {
    backgroundId: 20000 + index + 1,
    key: b.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_"),
    slug: toEntitySlug(b.engName),
    name: b.name,
    engName: b.engName,
    source: b.source || "PHB_2024",
    shortDescription: b.shortDescription || getDescriptionSnippet(b.description || "", 180),
    description: b.description || "",
    skills: (b.skillProficiencies ?? []).map((skill) => ({
      enum: skill.enum,
      nameUa: skill.nameUa || findSkillLabel(skill.enum),
    })),
    skillChoiceCount: 0,
    tools: toolLabel ? [toolLabel] : [],
    languagesToChooseCount: 0,
    equipmentItems: [],
    equipmentEngText: b.equipmentEngText || null,
    grantsGoldInstead: b.grantsGoldInstead ?? null,
    specialAbilityName: null,
    abilityOptions: b.abilityOptions ?? [],
    originFeat: b.originFeat ?? null,
    ruleset: "RULES_2024" as Ruleset,
  };
});

export function getAllBackgrounds(ruleset: Ruleset = "RULES_2014"): BackgroundData[] {
  return ruleset === "RULES_2024" ? backgrounds2024 : backgrounds2014;
}

export function getBackgroundById(id: number, ruleset: Ruleset = "RULES_2014"): BackgroundData | undefined {
  return getAllBackgrounds(ruleset).find((b) => b.backgroundId === id);
}

export function getBackgroundByIdOrSlug(
  idOrSlug: string,
  ruleset: Ruleset = "RULES_2014"
): BackgroundData | undefined {
  const trimmed = idOrSlug.trim();
  if (!trimmed) return undefined;

  const asNumber = Number(trimmed);
  if (Number.isFinite(asNumber)) {
    return getBackgroundById(Math.trunc(asNumber), ruleset);
  }

  const slug = toEntitySlug(trimmed);
  const lowered = trimmed.toLowerCase();

  return getAllBackgrounds(ruleset).find(
    (b) =>
      b.slug === slug ||
      b.key.toLowerCase() === lowered ||
      b.engName.toLowerCase() === lowered ||
      b.name.toLowerCase() === lowered
  );
}

export function getAllBackgroundSources(ruleset: Ruleset = "RULES_2014"): string[] {
  return Array.from(new Set(getAllBackgrounds(ruleset).map((b) => b.source))).sort();
}
