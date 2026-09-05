import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { backgroundByName, classByName, classChoiceOptionIdsAtLevel, raceByName, subclassByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { LevelUpSequence } from "./types";

const ASI_LEVELS = new Set([4, 8, 12, 16, 19]);
const METAMAGIC_LEVELS: Record<number, string[]> = {
  3: ["Careful Spell", "Distant Spell"],
  10: ["Empowered Spell"],
  17: ["Extended Spell"],
};

export const sequence: LevelUpSequence = {
  id: "sorcerer-1-to-20",
  why: "Одноклассовий Sorcerer 1→20 — повний кастер, підклас на 1 рівні (Wild Magic — жодних subclassChoiceOptions, на відміну від Draconic Bloodline із 10 опціями на 1 рівні). Метамагія (SORCERER_METAMAGIC у choicePoolRules.ts) — так само як Warlock-виклики, ClassChoiceOption самого класу, незалежний від підкласу: явний вибір на 3 (2 піки), 10 (+1) і 17 (+1) рівнях обовʼязковий незалежно від того, який Sorcerous Origin обрано.",
  maxLevel: 20,
  async startForm() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.SORCERER_2014),
      backgroundByName(BackgroundCategory.NOBLE),
    ]);
    const wildMagic = await subclassByName(cls.classId, Subclasses.WILD_MAGIC);
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      subclassId: wildMagic.subclassId,
    });
  },
  async buildLevelUpData(nextLevel) {
    const cls = await classByName(Classes.SORCERER_2014);
    const data: {
      classId: number;
      customAsi?: Array<{ ability: string; value: number }>;
      classChoiceSelections?: Record<string, number[]>;
    } = { classId: cls.classId };

    const metamagicNames = METAMAGIC_LEVELS[nextLevel];
    if (metamagicNames) {
      const metamagicIds = await classChoiceOptionIdsAtLevel(cls.classId, nextLevel, (co) =>
        metamagicNames.includes(co.optionNameEng),
      );
      data.classChoiceSelections = { Метамагія: metamagicIds };
    }

    if (ASI_LEVELS.has(nextLevel)) {
      data.customAsi = [
        { ability: "CHA", value: 1 },
        { ability: "CON", value: 1 },
      ];
    }

    return data;
  },
};
