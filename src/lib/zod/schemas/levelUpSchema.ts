import { z } from "zod";

const numericSelection = z.union([z.coerce.number(), z.array(z.coerce.number())]);
const numericSelections = z.record(z.string(), numericSelection).catch({});

export const levelUpInputSchema = z.object({
  levelUpPath: z.enum(["EXISTING", "MULTICLASS"]).catch("EXISTING"),
  classId: z.coerce.number().optional(),
  subclassId: z.coerce.number().optional(),
  customAsi: z.array(z.object({ ability: z.string().optional(), value: z.union([z.string(), z.number()]).optional() })).catch([]),
  featId: z.coerce.number().optional(),
  featChoiceSelections: numericSelections,
  classChoiceSelections: numericSelections,
  subclassChoiceSelections: numericSelections,
  classOptionalFeatureSelections: z.record(z.string(), z.boolean()).catch({}),
  classOptionalFeatureReplacementSelections: z.record(
    z.string(),
    z.object({ removeChoiceOptionId: z.coerce.number(), addChoiceOptionId: z.coerce.number() }),
  ).catch({}),
  levelUpSkillSelections: z.record(z.string(), z.array(z.string())).catch({}),
  expertiseSchema: z.object({ expertises: z.array(z.string()).catch([]) }).catch({ expertises: [] }),
  languagesSchema: z.object({ languages: z.array(z.string()).catch([]) }).catch({ languages: [] }),
  infusionSelections: z.array(z.coerce.number()).catch([]),
  weaponMasteryWeaponIds: z.array(z.coerce.number()).optional(),
  levelUpHpIncrease: z.number().optional().catch(undefined),
}).passthrough();

export type LevelUpInput = z.infer<typeof levelUpInputSchema>;

export function parseLevelUpInput(input: unknown): LevelUpInput {
  return levelUpInputSchema.parse(input ?? {});
}
