import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName, subclassByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { LevelUpSequence } from "./types";

const ASI_LEVELS = new Set([4, 8, 12, 16]);

export const sequence: LevelUpSequence = {
  id: "artificer-1-to-18",
  why: "Артифайсер 1→18 — емпірична перевірка знахідки з розвідки KR2.3: інфузії обробляються лише на classLevelAfter===2 (levelup.ts:1357-1399), тоді як TCoE дає ще на 6/10/14/18. Golden-знімки на цих рівнях мають показати, чи росте persInfusions чи лишається заморожений на 4 з 2 рівня. Alchemist обраний як підклас, бо не має жодних subclassChoiceOptions — жодних додаткових зобовʼязань, крім самих інфузій.",
  maxLevel: 18,
  async startForm() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.ARTIFICER_2014),
      backgroundByName(BackgroundCategory.GUILD_ARTISAN),
    ]);
    return minimalForm({ raceId: race.raceId, classId: cls.classId, backgroundId: background.backgroundId });
  },
  async buildLevelUpData(nextLevel) {
    const cls = await classByName(Classes.ARTIFICER_2014);
    const data: { classId: number; subclassId?: number; customAsi?: Array<{ ability: string; value: number }>; infusionSelections?: number[] } = {
      classId: cls.classId,
    };

    if (nextLevel === 3) {
      const alchemist = await subclassByName(cls.classId, Subclasses.ALCHEMIST);
      data.subclassId = alchemist.subclassId;
    }

    if (ASI_LEVELS.has(nextLevel)) {
      data.customAsi = [
        { ability: "INT", value: 1 },
        { ability: "CON", value: 1 },
      ];
    }

    if (nextLevel === 2) {
      const eligible = await prisma.infusion.findMany({
        where: { minArtificerLevel: { lte: 2 } },
        orderBy: { infusionId: "asc" },
        take: 4,
        select: { infusionId: true },
      });
      data.infusionSelections = eligible.map((i) => i.infusionId);
    }

    return data;
  },
};
