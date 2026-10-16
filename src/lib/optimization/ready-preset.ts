import { z } from "zod";
import { SkillsEnum, type Skill } from "@/lib/types/enums";
import { ToolCategory } from "@/lib/prisma-enums";
import { fullCharacterSchema, type PersFormData } from "@/lib/zod/schemas/persCreateSchema";
import type { CreatorContent } from "@/server/db/creator-content-query";
import type { BuildRecipe } from "./types";
import { buildLevelOneDraft } from "./build-assembly";
import { countRemainingBuildPoints } from "./build-draft";
import { idSchema } from "./schema";
import { buildReadyPresetOptions } from "./ready-preset-options";
import { buildPresetEquipment } from "./ready-preset-equipment";
import { buildReadyPresetSkillChoices } from "./ready-preset-skills";
import { isSavedPresetValid } from "./ready-preset-validation";
import { buildPresetSpellSelection, readyPresetSpellsSchema } from "./ready-preset-spells";
import { buildPresetRacialAbilityDraft } from "./ready-preset-racial-abilities";
import { findPresetClassSelections, findPresetRaceSelections, findPresetSubclassSelection } from "./ready-preset-identity";

export const readyPresetSchema = z.object({
  buildId: idSchema, revisionId: idSchema, title: z.string().min(1), description: z.string().min(1),
  articleSlug: idSchema, subraceKey: z.string().min(1).nullable(),
  racialAbilities: z.array(z.enum(["STR", "DEX", "CON", "INT", "WIS", "CHA"])),
  racialAbilityRules: z.literal("tasha").optional(),
  freeRaceSkills: z.literal(true).optional(),
  portraitSrc: z.string().regex(/^\/images\/presets\/[a-zA-Z0-9_-]+\.(webp|png|jpg)$/).nullable().optional(),
  skills: z.object({ selectedClass: z.array(z.enum(SkillsEnum)), race: z.array(z.enum(SkillsEnum)), background: z.array(z.enum(SkillsEnum)), subclass: z.array(z.enum(SkillsEnum)).optional() }).strict(),
  backgroundCustomization: z.strictObject({ tools: z.array(z.nativeEnum(ToolCategory)) }).optional(),
  expertise: z.array(z.enum(SkillsEnum)), classOptions: z.array(z.string().min(1)), languages: z.array(z.string().min(1)),
  raceOptions: z.array(z.string().min(1)).default([]), subclassOptions: z.array(z.string().min(1)).default([]),
  platformChoices: z.array(z.enum(["classOptions", "subclassOptions", "raceOptions"])).optional(),
  equipment: z.array(z.strictObject({ group: z.number().int().positive(), option: z.string().regex(/^[a-z]$/), weapons: z.array(z.string().min(1)) })),
  featOptionName: z.union([z.string().min(1), z.array(z.string().min(1)).min(2)]).nullable(), skillSection: idSchema, featSection: idSchema.nullable(), equipmentSection: idSchema,
  abilityExplanation: z.string().min(1), skillExplanation: z.string().min(1), equipmentExplanation: z.string().min(1),
  spells: readyPresetSpellsSchema.optional(),
}).strict();
export type ReadyPreset = z.infer<typeof readyPresetSchema>;

export function buildReadyPresetDraft(recipe: BuildRecipe, preset: ReadyPreset, content: CreatorContent): PersFormData {
  if (recipe.ruleset !== "RULES_2014" || recipe.buildId !== preset.buildId || recipe.revisionId !== preset.revisionId) throw new Error("Ready preset revision mismatch");
  const catalog = buildReadyPresetCatalog(content);
  const start = completeStartingIdentity(buildLevelOneDraft(recipe, catalog), preset, recipe.details!.subclassKey, content);
  const skillsSchema = buildPresetSkillsSchema(preset);
  const featChoiceSelections = findPresetFeatOption(start, preset, content);
  const options = buildReadyPresetOptions({ ...applyPresetBackgroundCustomization(start, preset, []), skillsSchema, featChoiceSelections }, content);
  const skillChoices = buildReadyPresetSkillChoices(preset.skills, options.skills);
  const draft = fullCharacterSchema.parse({ ...applyPresetBackgroundCustomization(start, preset, skillChoices.choices.background), name: "", skills: skillChoices.skills,
    points: countRemainingBuildPoints(recipe.details!.abilityScores),
    skillsSchema,
    featChoiceSelections, classChoiceSelections: findPresetClassSelections(findStartingClass(start, content), preset.classOptions),
    expertiseSchema: { expertises: preset.expertise }, languagesSchema: { languages: preset.languages },
    equipmentSchema: buildPresetEquipment(preset.equipment, options.equipmentGroups),
    ...buildPresetSpellSelection(preset.spells, options.spells),
  });
  if (!isSavedPresetValid(draft, draft, options)) throw new Error(`Incomplete ready preset: ${preset.buildId}`);
  return draft;
}

export function buildPresetSkillsSchema(preset: Pick<ReadyPreset, "skills" | "freeRaceSkills">) {
  return { isTasha: preset.freeRaceSkills === true, tashaChoices: [], basicChoices: preset.skills, choiceOptions: {} };
}

export function applyPresetBackgroundCustomization(start: Partial<PersFormData>, preset: Pick<ReadyPreset, "backgroundCustomization">, skills: Skill[]): Partial<PersFormData> {
  if (!preset.backgroundCustomization) return start;
  return { ...start, backgroundCustomization: { skills, tools: preset.backgroundCustomization.tools } };
}

function buildReadyPresetCatalog(content: CreatorContent) {
  return {
    classes: content.classes.map((entry) => ({ key: entry.name, id: entry.classId })),
    races: content.races.map((entry) => ({ key: entry.name, id: entry.raceId, variants: entry.raceVariants.map((variant) => ({ key: variant.name, id: variant.raceVariantId })) })),
    backgrounds: content.backgrounds.map((entry) => ({ key: entry.name, id: entry.backgroundId })),
    feats: content.feats.map((entry) => ({ key: entry.name, id: entry.featId })),
  };
}

function completeStartingIdentity(start: Partial<PersFormData>, preset: ReadyPreset, subclassKey: string | undefined, content: CreatorContent) {
  const characterClass = findStartingClass(start, content);
  const race = content.races.find((entry) => entry.raceId === start.raceId);
  if (!race || !characterClass) throw new Error("Preset needs a supported starting class and race");
  const subrace = race.subraces.find((entry) => entry.name === preset.subraceKey);
  if (preset.subraceKey && !subrace) throw new Error(`Missing preset subrace: ${preset.subraceKey}`);
  const variant = race.raceVariants.find((entry) => entry.raceVariantId === start.raceVariantId);
  return { ...start, raceVariantId: start.raceVariantId ?? null, ...(subrace ? { subraceId: subrace.subraceId } : {}), ...buildPresetRacialAbilityDraft({ race, variant, subrace }, preset),
    raceChoiceSelections: findPresetRaceSelections(race, subrace?.subraceId, preset.raceOptions), classChoiceSelections: findPresetClassSelections(characterClass, preset.classOptions),
    ...findPresetSubclassSelection(characterClass, subclassKey, preset.subclassOptions) };
}

function findPresetFeatOption(start: Partial<PersFormData>, preset: ReadyPreset, content: CreatorContent) {
  const feat = content.feats.find((entry) => entry.featId === start.featId);
  if (!feat) {
    if (preset.featOptionName) throw new Error("Preset feat option has no feat");
    return {};
  }
  if (!feat.featChoiceOptions.length && !preset.featOptionName) return {};
  const names = listPresetFeatOptionNames(preset);
  const options = names.map((name) => feat.featChoiceOptions.find((entry) => entry.choiceOption.optionNameEng === name));
  if (!names.length || options.some((option) => !option)) throw new Error(`Missing preset feat option: ${names.join(", ") || null}`);
  const ids = options.map((option) => option!.choiceOptionId);
  return { [options[0]!.choiceOption.groupName]: ids.length === 1 ? ids[0] : ids };
}

export function listPresetFeatOptionNames(preset: Pick<ReadyPreset, "featOptionName">): string[] {
  return preset.featOptionName === null ? [] : [preset.featOptionName].flat();
}

function findStartingClass(start: Partial<PersFormData>, content: CreatorContent) {
  return content.classes.find((entry) => entry.classId === start.classId)!;
}
