/**
 * Static background data helpers for SSG pages and client catalogs.
 *
 * Reads the generated 2014 JSON (produced from the database) or the normalized 2024 JSON.
 */

import { Ruleset } from "@/lib/prisma-enums";
import backgrounds2014Json from "@/lib/generated/backgrounds.json";
import backgrounds2024Json from "../../data/2024/normalized/backgrounds.json";
import { skillTranslations, toolTranslations } from "@/lib/refs/translation";
import { getBackgroundImagePath } from "@/lib/assets/image-manifest";
import { toEntitySlug } from "@/lib/slug-utils";
import { getDescriptionSnippet } from "@/lib/seo-utils";
import { getAllFeats } from "@/lib/featsData";

export type BackgroundSkill = {
  enum: string;
  nameUa: string;
};

export type BackgroundEquipmentItem = {
  name: string;
  quantity: number;
};

type RawOriginFeat = { engName: string; nameUa: string };

export type BackgroundOriginFeat = {
  engName: string;
  nameUa: string;
  description: string | null;
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
  grantsGoldInstead: number | null;
  specialAbilityName: string | null;
  abilityOptions: string[];
  originFeat: BackgroundOriginFeat | null;
  imageSrc: string | null;
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
  originFeat?: RawOriginFeat | null;
  equipmentPackage?: BackgroundEquipmentItem[];
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
  grantsGoldInstead: null,
  specialAbilityName: b.specialAbilityName,
  abilityOptions: [],
  originFeat: null,
  imageSrc: getBackgroundImagePath(b.key),
  ruleset: "RULES_2014" as Ruleset,
}));

/// Партія походжень несе лише назву риси, а гравцеві на сторінці потрібен її текст —
/// беремо його з каталогу рис за англійською назвою, як робить пошук. Клас у дужках
/// («Magic Initiate (Cleric)») задає саме походження, а риса в каталозі одна на всі класи.
function describeOriginFeat(originFeat?: RawOriginFeat | null): BackgroundOriginFeat | null {
  if (!originFeat) return null;

  const feats = getAllFeats("RULES_2024");
  const withoutVariant = originFeat.engName.replace(/\s*\([^)]*\)\s*$/, "");
  const feat =
    feats.find((candidate) => candidate.engName === originFeat.engName) ??
    feats.find((candidate) => candidate.engName === withoutVariant);

  return { ...originFeat, description: feat?.description ?? null };
}

const backgrounds2024: BackgroundData[] = (backgrounds2024Json as Raw2024Background[]).map((b, index) => {
  const toolLabel = b.toolProficiency?.nameUa || b.toolProficiency?.engText || "";
  const key = b.engName.toUpperCase().replace(/[^A-Z0-9]+/g, "_");

  return {
    backgroundId: 20000 + index + 1,
    key,
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
    equipmentItems: b.equipmentPackage ?? [],
    grantsGoldInstead: b.grantsGoldInstead ?? null,
    specialAbilityName: null,
    abilityOptions: b.abilityOptions ?? [],
    originFeat: describeOriginFeat(b.originFeat),
    imageSrc: getBackgroundImagePath(key),
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
