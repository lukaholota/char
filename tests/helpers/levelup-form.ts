/**
 * There is no zod schema for levelUpCharacter's `data` param (typed `any`) — this shape is
 * reverse-engineered from the destructuring in src/lib/actions/levelup.ts. Keep in sync by hand.
 */
export interface LevelUpFormData {
  levelUpPath: "EXISTING" | "MULTICLASS";
  classId: number;
  subclassId?: number;
  customAsi: Array<{ ability: string; value: number }>;
  featId?: number;
  featChoiceSelections: Record<string, number | number[]>;
  classChoiceSelections: Record<string, number | number[]>;
  subclassChoiceSelections: Record<string, number | number[]>;
  classOptionalFeatureSelections: Record<string, boolean>;
  classOptionalFeatureReplacementSelections: Record<
    string,
    { removeChoiceOptionId: number; addChoiceOptionId: number }
  >;
  levelUpSkillSelections: Record<string, string[]>;
  expertiseSchema: { expertises: string[] };
  languagesSchema: { languages: string[] };
  infusionSelections: number[];
  /** KR18.6: повний набір майстерності зброї після цього рівня. Немає ключа — набір не чіпають. */
  weaponMasteryWeaponIds?: number[];
  levelUpHpIncrease?: number;
}

type RequiredFields = Pick<LevelUpFormData, "classId">;

/**
 * Base LevelUpFormData: HP defaults to AVERAGE (omitting levelUpHpIncrease makes the server fall
 * back to Math.floor(hitDie / 2) + 1), no ASI/feat/subclass/choice picks unless overridden. Callers
 * add exactly what a given level requires (ASI at that level, subclass pick, choice pool picks).
 */
export function minimalLevelUpForm(overrides: RequiredFields & Partial<LevelUpFormData>): LevelUpFormData {
  return {
    levelUpPath: "EXISTING",
    customAsi: [],
    featChoiceSelections: {},
    classChoiceSelections: {},
    subclassChoiceSelections: {},
    classOptionalFeatureSelections: {},
    classOptionalFeatureReplacementSelections: {},
    levelUpSkillSelections: {},
    expertiseSchema: { expertises: [] },
    languagesSchema: { languages: [] },
    infusionSelections: [],
    ...overrides,
  };
}
