/**
 * Static feat data helpers for SSG pages and client catalogs.
 *
 * Reads from generated 2014 JSON file or normalized 2024 JSON.
 */

import { Ruleset } from "@prisma/client";
import feats2014Json from "@/lib/generated/feats.json";
import feats2024Json from "../../data/2024/normalized/feats.json";

export type FeatBenefit = {
  name: string;
  description: string;
};

export type FeatCategoryType = "ORIGIN" | "GENERAL" | "EPIC_BOON" | "FIGHTING_STYLE";
export type FeatCategory = FeatCategoryType;

export type FeatData = {
  featId: number;
  name: string;
  engName: string;
  source: string;
  description: string;
  shortDescription: string;
  category: FeatCategoryType | string | null;
  isRepeatable: boolean;
  prerequisite: string | null;
  benefits: FeatBenefit[];
  ruleset: Ruleset;
};

type Raw2024Feat = {
  ruleset?: string;
  engName: string;
  name: string;
  category?: string;
  prerequisite?: string | null;
  isRepeatable?: boolean;
  benefits?: FeatBenefit[];
  benefitsEng?: Array<{ name: string; description: string }>;
  description?: string;
  source?: string;
};

const feats2014: FeatData[] = (feats2014Json as Array<{
  featId: number;
  name: string;
  engName: string;
  source: string;
  description: string;
  shortDescription: string;
  category?: string | null;
  isRepeatable?: boolean;
  prerequisiteLevel?: number | null;
  prerequisiteFeat?: string | null;
  prerequisiteSpellcasting?: boolean;
}>).map((f, index) => {
  const prereqs: string[] = [];
  if (f.prerequisiteLevel) prereqs.push(`Рівень ${f.prerequisiteLevel}+`);
  if (f.prerequisiteFeat) prereqs.push(`Риса: ${f.prerequisiteFeat}`);
  if (f.prerequisiteSpellcasting) prereqs.push("Здатність накладати хоча б одне заклинання");

  return {
    featId: f.featId || index + 1,
    name: f.name,
    engName: f.engName,
    source: f.source || "PHB",
    description: f.description || "",
    shortDescription: f.shortDescription || "",
    category: (f.category as FeatCategoryType) || null,
    isRepeatable: Boolean(f.isRepeatable),
    prerequisite: prereqs.length > 0 ? prereqs.join(", ") : null,
    benefits: [],
    ruleset: "RULES_2014" as Ruleset,
  };
});

const feats2024: FeatData[] = (feats2024Json as Raw2024Feat[]).map((f, index) => {
  const benefits = f.benefits ?? [];
  let description = f.description ?? "";
  if (!description && benefits.length > 0) {
    description = benefits.map((b) => `**${b.name}**\n${b.description}`).join("\n\n");
  }

  return {
    featId: 20000 + index + 1,
    name: f.name,
    engName: f.engName,
    source: f.source || "PHB_2024",
    description: description || f.engName,
    shortDescription: description.slice(0, 240),
    category: (f.category as FeatCategoryType) || "GENERAL",
    isRepeatable: Boolean(f.isRepeatable),
    prerequisite: f.prerequisite ?? null,
    benefits,
    ruleset: "RULES_2024" as Ruleset,
  };
});

/**
 * Get all feats for a given ruleset (defaults to RULES_2014)
 */
export function getAllFeats(ruleset: Ruleset = "RULES_2014"): FeatData[] {
  return ruleset === "RULES_2024" ? feats2024 : feats2014;
}

/**
 * Get feat by ID for a specific ruleset
 */
export function getFeatById(id: number, ruleset: Ruleset = "RULES_2014"): FeatData | undefined {
  const list = getAllFeats(ruleset);
  return list.find((f) => f.featId === id);
}

/**
 * Get feat by ID or slug/name for a specific ruleset
 */
export function getFeatByIdOrSlug(idOrSlug: string, ruleset: Ruleset = "RULES_2014"): FeatData | undefined {
  const trimmed = idOrSlug.trim();
  const asNumber = Number(trimmed);

  if (Number.isFinite(asNumber)) {
    return getFeatById(Math.trunc(asNumber), ruleset);
  }

  const list = getAllFeats(ruleset);
  return list.find(
    (f) =>
      f.engName.toLowerCase() === trimmed.toLowerCase() ||
      f.name.toLowerCase() === trimmed.toLowerCase()
  );
}
