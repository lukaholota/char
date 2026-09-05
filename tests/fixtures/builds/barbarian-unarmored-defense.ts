import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "barbarian-unarmored-defense",
  why: "Без спорядженої броні: бʼє в try/catch-блок character.ts:1143-1247, гілку cls.name === 'BARBARIAN_2014' → UNARMORED_DEFENSE_BARBARIAN. Цей try/catch мовчки ковтає помилки БД — golden фіксує, що зараз доїжджає, щоб рефакторинг це не зламав непомітно.",
  async form() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.BARBARIAN_2014),
      backgroundByName(BackgroundCategory.OUTLANDER),
    ]);
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
    });
  },
};
