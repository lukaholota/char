import { FeatureDisplayType, RestType } from "@prisma/client";

import type { CharacterFeatureGroupKey, CharacterFeatureItem, CharacterFeaturesGroupedResult } from "@/lib/actions/pers";
import { FeatureSource } from "@/lib/utils/features";
import { translatePdfText } from "./translatePdfText";

function normalizeDisplayTypes(input: unknown): FeatureDisplayType[] {
  if (Array.isArray(input)) {
    const values = input.filter(Boolean) as FeatureDisplayType[];
    return values.length > 0 ? values : [FeatureDisplayType.PASSIVE];
  }
  if (typeof input === "string" && input.length > 0) {
    return [input as FeatureDisplayType];
  }
  return [FeatureDisplayType.PASSIVE];
}

function getPrimaryDisplayType(displayTypes: FeatureDisplayType[]): FeatureDisplayType {
  const normalized = normalizeDisplayTypes(displayTypes);
  if (normalized.includes(FeatureDisplayType.ACTION)) return FeatureDisplayType.ACTION;
  if (normalized.includes(FeatureDisplayType.BONUSACTION)) return FeatureDisplayType.BONUSACTION;
  if (normalized.includes(FeatureDisplayType.REACTION)) return FeatureDisplayType.REACTION;
  return FeatureDisplayType.PASSIVE;
}

function toPrimaryGroupKey(primaryType: FeatureDisplayType): CharacterFeatureGroupKey {
  switch (primaryType) {
    case FeatureDisplayType.ACTION:
      return "actions";
    case FeatureDisplayType.BONUSACTION:
      return "bonusActions";
    case FeatureDisplayType.REACTION:
      return "reactions";
    default:
      return "passive";
  }
}

export function groupCharacterFeaturesForPdf(pers: {
  level: number;
  features?: Array<{ feature: { featureId: number; name: string; shortDescription?: string | null; description: string; displayType: unknown; usesCountDependsOnProficiencyBonus: boolean; usesCount: number | null; limitedUsesPer: RestType | null } } & { usesRemaining?: number | null }>;
  feats?: Array<{ featId: number; feat: { name: string; description: string }; choices?: Array<{ choiceOptionId: number; choiceOption?: { groupName: string; optionName: string } | null }> }>;
  choiceOptions?: Array<{ choiceOptionId: number; groupName: string; optionName: string }>;
  raceChoiceOptions?: Array<{ optionId: number; choiceGroupName: string; optionName: string; description?: string | null }>;
}): CharacterFeaturesGroupedResult {
  const buckets: CharacterFeaturesGroupedResult = {
    passive: [],
    actions: [],
    bonusActions: [],
    reactions: [],
  };

  const proficiencyBonus = (level: number) => {
    if (!Number.isFinite(level) || level <= 0) return 2;
    return 2 + Math.floor((level - 1) / 4);
  };

  const push = (item: Omit<CharacterFeatureItem, "primaryType" | "displayTypes"> & { displayTypes: FeatureDisplayType[] }) => {
    const displayTypes = normalizeDisplayTypes(item.displayTypes);
    const primaryType = getPrimaryDisplayType(displayTypes);
    const key = toPrimaryGroupKey(primaryType);
    buckets[key].push({
      ...item,
      displayTypes,
      primaryType,
    });
  };

  for (const pf of pers.features ?? []) {
    const f = pf.feature;

    const usesPer = (() => {
      if (f.usesCountDependsOnProficiencyBonus) return proficiencyBonus(pers.level);
      if (typeof f.usesCount === "number") return f.usesCount;
      return null;
    })();

    push({
      key: `PERS:feature:${f.featureId}`,
      featureId: f.featureId,
      name: f.name,
      shortDescription: f.shortDescription ?? null,
      description: f.description,
      displayTypes: normalizeDisplayTypes(f.displayType),
      source: "PERS" as FeatureSource,
      sourceName: f.name,
      usesRemaining: (pf as any).usesRemaining ?? null,
      usesPer,
      restType: f.limitedUsesPer ?? null,
    });
  }

  for (const co of pers.choiceOptions ?? []) {
    const groupName = translatePdfText(co.groupName);
    const optionName = translatePdfText(co.optionName);
    const sourceName = groupName;
    push({
      key: `CHOICE:${co.groupName}:option:${co.choiceOptionId}`,
      name: optionName,
      description: `${groupName}: ${optionName}`,
      displayTypes: [FeatureDisplayType.PASSIVE],
      source: "CHOICE" as FeatureSource,
      sourceName,
    });
  }

  for (const rco of pers.raceChoiceOptions ?? []) {
    const groupName = translatePdfText(rco.choiceGroupName);
    const optionName = translatePdfText(rco.optionName);
    const sourceName = groupName;
    push({
      key: `RACE_CHOICE:${rco.choiceGroupName}:option:${rco.optionId}`,
      name: optionName,
      description: rco.description ? translatePdfText(rco.description) : `${groupName}: ${optionName}`,
      displayTypes: [FeatureDisplayType.PASSIVE],
      source: "RACE_CHOICE" as FeatureSource,
      sourceName,
    });
  }

  for (const pf of pers.feats ?? []) {
    const featName = pf.feat.name;
    const displayTypes = [FeatureDisplayType.PASSIVE];

    if (!pf.choices || pf.choices.length === 0) {
      push({
        key: `FEAT:${pf.featId}`,
        name: featName,
        description: pf.feat.description,
        displayTypes,
        source: "FEAT" as FeatureSource,
        sourceName: featName,
      });
      continue;
    }

    for (const choice of pf.choices) {
      if (!choice.choiceOption) continue;

      const groupName = translatePdfText(choice.choiceOption.groupName);
      const optionName = translatePdfText(choice.choiceOption.optionName);
      push({
        key: `FEAT:${pf.featId}:choice:${choice.choiceOptionId}`,
        name: optionName,
        description: `${groupName}: ${optionName}`,
        displayTypes,
        source: "FEAT" as FeatureSource,
        sourceName: featName,
      });
    }
  }

  return buckets;
}
