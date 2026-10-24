import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

export function isCreationStepCompleted(stepId: string, data: Partial<PersFormData> | null | undefined): boolean {
  if (!data) return false;
  switch (stepId) {
    case "race": return !!data.raceId;
    case "raceDetails": return !!(data.subraceId || data.raceVariantId);
    case "raceChoices": return Object.keys(data.raceChoiceSelections || {}).length > 0;
    case "speciesFeatChoices": return Object.keys(data.speciesFeatChoiceSelections || {}).length > 0;
    case "class": return !!data.classId;
    case "subclass": return !!data.subclassId;
    case "subclassChoices": return Object.keys(data.subclassChoiceSelections || {}).length > 0;
    case "classChoices": return Object.keys(data.classChoiceSelections || {}).length > 0;
    case "classOptional": return Object.keys(data.classOptionalFeatureSelections || {}).length > 0;
    case "weaponMastery": return (data.weaponMasteryWeaponIds || []).length > 0;
    case "spells": return Boolean(data.classSpells?.preparedIds?.length || data.classSpells?.cantripIds?.length || data.classSpells?.spellbookIds?.length);
    case "background": return !!data.backgroundId;
    case "asi": return !!data.asiSystem;
    case "skills": return (data.skills || []).length > 0;
    case "expertise": return !!data.expertiseSchema?.expertises?.length;
    case "languages": return !!data.languagesSchema?.languages?.length;
    case "feat": return !!data.featId;
    case "featChoices": return Object.keys(data.featChoiceSelections || {}).length > 0;
    case "backgroundFeat": return !!data.backgroundFeatId;
    case "backgroundFeatChoices": return Object.keys(data.backgroundFeatChoiceSelections || {}).length > 0;
    case "featSpells": return Object.values(data.featSpellSelections || {}).some((spellIds) => (spellIds ?? []).length > 0);
    case "raceSpells": return (data.raceSpellIds || []).length > 0;
    case "equipment": return !!data.equipmentSchema?.choiceGroupToId;
    case "name": return (data.name?.length ?? 0) <= 100;
    default: return false;
  }
}

/** Вперед — лише туди, де вже були, або коли всі попередні кроки заповнені: інакше «Створити» на кроці імені падає з неповною чернеткою. */
export function canJumpForwardTo(input: {
  steps: readonly { id: string }[]; stepOrder: number; highestStepCompleted: number; data: Partial<PersFormData> | null | undefined;
}): boolean {
  if (input.stepOrder <= input.highestStepCompleted + 1) return true;
  return input.steps.slice(0, input.stepOrder - 1).every((step) => isCreationStepCompleted(step.id, input.data));
}
