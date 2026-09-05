import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "monk-unarmored-defense",
  why: "Без спорядженої броні: бʼє в try/catch-блок character.ts:1143-1247, гілку cls.name === 'MONK_2014' → UNARMORED_DEFENSE_MONK. Монах на 1 рівні без підкласу (2014: підклас з 3 рівня) — окремо тримає вісь 'без підкласу на створенні'.",
  async form() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.MONK_2014),
      backgroundByName(BackgroundCategory.HERMIT),
    ]);
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
    });
  },
};
