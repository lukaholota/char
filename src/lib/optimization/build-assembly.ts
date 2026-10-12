import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { BuildRecipe, OptimizationRuleset } from "./types";

export type BuildCatalog = {
  classes: { key: string; id: number }[];
  races: { key: string; id: number; variants: { key: string; id: number }[] }[];
  backgrounds: { key: string; id: number }[];
  feats: { key: string; id: number }[];
};

export function buildLevelOneDraft(recipe: BuildRecipe, catalog: BuildCatalog): Partial<PersFormData> {
  const details = recipe.details;
  if (!details) throw new Error(`No starting snapshot: ${recipe.buildId}`);
  const race = catalog.races.find((entry) => entry.key === details.raceKey);
  const variant = race?.variants.find((entry) => entry.key === details.variantKey);
  return {
    ruleset: recipe.ruleset,
    classId: requireCatalogId(catalog.classes, recipe.startingClassKey),
    ...(race ? { raceId: race.id } : {}),
    ...(variant ? { raceVariantId: variant.id } : {}),
    backgroundId: requireCatalogId(catalog.backgrounds, details.backgroundKey),
    ...(details.featKey ? { featId: requireCatalogId(catalog.feats, details.featKey) } : {}),
    asiSystem: "POINT_BUY", asi: details.abilityScores, points: 0, isDefaultASI: true,
    ...buildStartingAbilityChoices(recipe.ruleset, Boolean(variant)),
  };
}

function buildStartingAbilityChoices(ruleset: OptimizationRuleset, hasVariant: boolean): Partial<PersFormData> {
  if (ruleset === "RULES_2024") return { backgroundAsiChoice: { mode: "+2/+1", plusTwo: "DEX", plusOne: "WIS" } };
  if (!hasVariant) return {};
  return { racialBonusChoiceSchema: { basicChoices: [{ groupIndex: 0, choiceCount: 2, selectedAbilities: ["DEX", "WIS"] }], tashaChoices: [] } };
}

function requireCatalogId(entries: { key: string; id: number }[], key: string): number {
  const entry = entries.find((candidate) => candidate.key === key);
  if (!entry) throw new Error(`Missing catalog key: ${key}`);
  return entry.id;
}

export function findBuildCreatorStep(data: Partial<PersFormData>): string {
  if (!data.raceId) return "race";
  if (data.ruleset === "RULES_2024") return "raceChoices";
  return "asi";
}
