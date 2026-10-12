import { BackgroundCategory, Classes, Races, Skills } from "@prisma/client";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "bard-full-caster",
  why: "Повний кастер на 1 рівні (calculateCasterLevel → SPELL_SLOT_PROGRESSION.FULL) (Бард 2014 отримує Експертизу з 3-го рівня, тож на 1-му її немає).",
  async form() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.BARD_2014),
      backgroundByName(BackgroundCategory.ENTERTAINER),
    ]);
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      skills: [Skills.PERFORMANCE, Skills.PERSUASION],
    });
  },
};
