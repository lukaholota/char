import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, classChoiceOptionIdsAtLevel, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { LevelUpSequence } from "./types";

export const sequence: LevelUpSequence = {
  id: "fighter-style-replacement",
  why: "Fighter 1→4 із Martial Versatility: персонаж починає з Dueling, а на 4 рівні приймає опційну заміну бойового стилю та міняє його на Archery. Фіксує ClassOptionalFeatureReplacesFeature: відʼєднання старої ChoiceOption, підʼєднання нової та збереження прийнятої опції.",
  maxLevel: 4,
  async startForm() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
    ]);
    const [duelingId] = await classChoiceOptionIdsAtLevel(cls.classId, 1, (co) => co.optionNameEng === "Dueling");
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      classChoiceSelections: { "0": duelingId },
    });
  },
  async buildLevelUpData(nextLevel) {
    const cls = await classByName(Classes.FIGHTER_2014);
    const data: {
      classId: number;
      customAsi?: Array<{ ability: string; value: number }>;
      classOptionalFeatureSelections?: Record<string, boolean>;
      classOptionalFeatureReplacementSelections?: Record<string, { removeChoiceOptionId: number; addChoiceOptionId: number }>;
    } = { classId: cls.classId };

    if (nextLevel === 4) {
      const [[duelingId], [archeryId], replacement] = await Promise.all([
        classChoiceOptionIdsAtLevel(cls.classId, 1, (co) => co.optionNameEng === "Dueling"),
        classChoiceOptionIdsAtLevel(cls.classId, 1, (co) => co.optionNameEng === "Archery"),
        prisma.classOptionalFeature.findFirstOrThrow({
          where: {
            classId: cls.classId,
            replacesFightingStyle: true,
            grantedOnLevels: { has: 4 },
          },
        }),
      ]);

      data.customAsi = [
        { ability: "STR", value: 1 },
        { ability: "CON", value: 1 },
      ];
      data.classOptionalFeatureSelections = { [replacement.optionalFeatureId]: true };
      data.classOptionalFeatureReplacementSelections = {
        [replacement.optionalFeatureId]: { removeChoiceOptionId: duelingId, addChoiceOptionId: archeryId },
      };
    }

    return data;
  },
};
