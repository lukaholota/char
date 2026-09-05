import { BackgroundCategory, Classes, Races, Skills } from "@prisma/client";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "rogue-expertise",
  why: "Некастер (SpellcastingType.NONE) з Expertise на 1 рівні. Перевірено проти реальних сідів: Rogue 'Expertise' у ClassFeature має mechanicType PASSIVE, не CHOICE_EXPERTISE — тобто вибір навички під експертизу йде виключно через вільне поле expertiseSchema, без привʼязки до класу. Цей білд фіксує саме це.",
  async form() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.ROGUE_2014),
      backgroundByName(BackgroundCategory.CRIMINAL),
    ]);
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      skills: [Skills.STEALTH, Skills.SLEIGHT_OF_HAND],
      expertiseSchema: { expertises: [Skills.STEALTH, Skills.SLEIGHT_OF_HAND] },
    });
  },
};
