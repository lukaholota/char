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
    case "spells": return Boolean(data.classSpells?.preparedIds?.length);
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
    case "equipment": return !!data.equipmentSchema?.choiceGroupToId;
    case "name": return !!data.name;
    default: return false;
  }
}
