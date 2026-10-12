import { z } from "zod";
import { idSchema, levelDecisionFields, refineLevelDecisions } from "./schema";
import type { BuildProgressionStep, BuildRecipe, LevelDecisions } from "./types";

const FIRST_PROGRESSION_LEVEL = 2;
const MAX_CHARACTER_LEVEL = 20;
const text = z.string().min(1);

export const specLevelSchema = refineLevelDecisions(z.strictObject({
  level: z.number().int().min(FIRST_PROGRESSION_LEVEL).max(MAX_CHARACTER_LEVEL),
  classKey: text.optional(),
  subclassKey: text.optional(),
  section: idSchema.optional(),
  ...levelDecisionFields,
}));

export const specLevelsSchema = z.array(specLevelSchema).min(1).superRefine((levels, context) => {
  levels.forEach((entry, position) => {
    const expected = FIRST_PROGRESSION_LEVEL + position;
    if (entry.level !== expected) context.addIssue({ code: "custom", path: [position, "level"], message: `levels мають йти підряд з 2-го рівня без пропусків: на цьому місці очікується рівень ${expected}, а записано ${entry.level}` });
  });
});

export type SpecLevel = z.infer<typeof specLevelSchema>;

export function listSpecLevelSectionIds(levels: readonly SpecLevel[] | undefined): { field: string; sectionId: string }[] {
  return (levels ?? []).flatMap((entry) => (entry.section ? [{ field: `levels[${entry.level}].section`, sectionId: entry.section }] : []));
}

export function buildProgressionSteps(input: {
  startingClassKey: string;
  levels: readonly SpecLevel[];
  levelTableSection: string;
  createSourceRef: (sectionId: string) => BuildRecipe["sourceRefs"][number];
}): BuildProgressionStep[] {
  const classLevels = new Map<string, number>([[input.startingClassKey, 1]]);
  return input.levels.map((entry) => {
    const classKey = entry.classKey ?? input.startingClassKey;
    const classLevel = (classLevels.get(classKey) ?? 0) + 1;
    classLevels.set(classKey, classLevel);
    return {
      characterLevel: entry.level,
      classKey,
      classLevel,
      sourceRefs: [input.createSourceRef(entry.section ?? input.levelTableSection)],
      choiceIds: [],
      ...(entry.subclassKey ? { subclassKey: entry.subclassKey } : {}),
      decisions: pickLevelDecisions(entry),
    };
  });
}

function pickLevelDecisions(entry: SpecLevel): LevelDecisions {
  const { level: _level, classKey: _classKey, subclassKey: _subclassKey, section: _section, ...decisions } = entry;
  return decisions;
}
