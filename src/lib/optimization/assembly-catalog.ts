import type { CreatorContent } from "@/server/db/creator-content-query";
import { buildSpellSlug } from "@/lib/spell-link";
import { SkillsEnum } from "@/lib/types/enums";
import { normalizeSkillProficiencies } from "@/rules/proficiency";
import { readExpertiseGrant, type ExpertiseGrant } from "@/rules/expertise-selections";
import { findReplacedChoiceGroup } from "@/rules/choice-replacement";

export type AssemblyChoiceOption = { id: number; groupName: string; nameEng: string; levelsGranted: readonly number[]; prerequisites: unknown };
export type AssemblyReplacementFeature = { id: number; group: string; levelsGranted: readonly number[] };
export type AssemblyFeature = {
  featureId: number;
  engName: string;
  levelGranted: number;
  skillChoice: { options: readonly string[]; count: number } | null;
  expertiseGrant: ExpertiseGrant | null;
};
export type AssemblySubclass = { key: string; id: number; choiceOptions: AssemblyChoiceOption[]; features: AssemblyFeature[] };
export type AssemblyClass = {
  key: string;
  id: number;
  subclassLevel: number;
  abilityScoreUpLevels: readonly number[];
  subclasses: AssemblySubclass[];
  choiceOptions: AssemblyChoiceOption[];
  replacementFeatures: AssemblyReplacementFeature[];
  features: AssemblyFeature[];
};
export type AssemblyFeat = { key: string; id: number; choiceOptions: AssemblyChoiceOption[] };

export type AssemblyInfusion = { id: number; engName: string; minArtificerLevel: number };

export type AssemblyCatalog = {
  classes: AssemblyClass[];
  feats: AssemblyFeat[];
  infusions: AssemblyInfusion[];
  spellIdsByKey: ReadonlyMap<string, number>;
};

type ChoiceOptionRow = { choiceOptionId: number; levelsGranted?: number[] | null; choiceOption: { groupName: string | null; optionNameEng: string; prerequisites?: unknown } };
type OptionalFeatureRow = Parameters<typeof findReplacedChoiceGroup>[0] & { optionalFeatureId: number; grantedOnLevels?: number[] | null };
type FeatureRow = { levelGranted: number; feature: { featureId: number; engName: string; skillProficiencies: unknown; skillExpertises: unknown } };

export function buildAssemblyCatalog(content: CreatorContent, spells: readonly { spellId: number; engName: string }[]): AssemblyCatalog {
  return {
    classes: content.classes.map((characterClass) => ({
      key: characterClass.name,
      id: characterClass.classId,
      subclassLevel: characterClass.subclassLevel,
      abilityScoreUpLevels: characterClass.abilityScoreUpLevels,
      choiceOptions: characterClass.classChoiceOptions.map(toAssemblyChoiceOption),
      replacementFeatures: characterClass.classOptionalFeatures.flatMap(toReplacementFeature),
      features: characterClass.features.map(toAssemblyFeature),
      subclasses: characterClass.subclasses.map((subclass) => ({
        key: subclass.name,
        id: subclass.subclassId,
        choiceOptions: subclass.subclassChoiceOptions.map(toAssemblyChoiceOption),
        features: subclass.features.map(toAssemblyFeature),
      })),
    })),
    feats: content.feats.map((feat) => ({ key: feat.name, id: feat.featId, choiceOptions: feat.featChoiceOptions.map(toAssemblyChoiceOption) })),
    infusions: content.infusions.map((infusion) => ({ id: infusion.infusionId, engName: infusion.engName, minArtificerLevel: infusion.minArtificerLevel })),
    spellIdsByKey: new Map(spells.map((spell) => [buildSpellSlug(spell.engName), spell.spellId])),
  };
}

function toAssemblyChoiceOption(row: ChoiceOptionRow): AssemblyChoiceOption {
  return { id: row.choiceOptionId, groupName: row.choiceOption.groupName ?? "", nameEng: row.choiceOption.optionNameEng, levelsGranted: row.levelsGranted ?? [], prerequisites: row.choiceOption.prerequisites ?? null };
}

function toReplacementFeature(row: OptionalFeatureRow): AssemblyReplacementFeature[] {
  const group = findReplacedChoiceGroup(row);
  return group ? [{ id: row.optionalFeatureId, group, levelsGranted: row.grantedOnLevels ?? [] }] : [];
}

function toAssemblyFeature(row: FeatureRow): AssemblyFeature {
  const skills = normalizeSkillProficiencies(row.feature.skillProficiencies, SkillsEnum);
  return {
    featureId: row.feature.featureId,
    engName: row.feature.engName,
    levelGranted: row.levelGranted,
    skillChoice: skills?.type === "choice" ? { options: skills.options, count: skills.choiceCount } : null,
    expertiseGrant: readExpertiseGrant(row.feature.skillExpertises),
  };
}
