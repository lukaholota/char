import type { PersFormData } from "@/lib/zod/schemas/persCreateSchema";

export const EMPTY_BRANCH_CHOICES: Partial<PersFormData> = {
  subclassId: undefined,
  classChoiceSelections: {},
  subclassChoiceSelections: {},
  classOptionalFeatureSelections: {},
  customAsi: [],
  featId: undefined,
  featChoiceSelections: {},
  levelUpSkillSelections: {},
  expertiseSchema: { expertises: [] },
  languagesSchema: { languages: [] },
  levelUpHpIncrease: undefined,
};
