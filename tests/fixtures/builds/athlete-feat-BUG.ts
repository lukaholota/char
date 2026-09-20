import { BackgroundCategory, Classes, Feats, Races } from "@prisma/client";
import { backgroundByName, classByName, featByName, featChoiceOptionIds, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "athlete-feat-BUG",
  why: "Характеризація BUG-004 (виправлено 2026-09-15). Атлет мав дві дубльовані групи вибору; лишилась робоча «Характеристика ATHLETE», і її опція несе ефект ASI у колонках, а не в назві. Білд бере «ATHLETE Ability (Strength)» і фіксує +1: STR 16 → 17. Ідентифікатор і KNOWN_BUGS лишено як слід історії: еталон зрушив лише назвою вибору. Деталі — docs/KNOWN-BUGS.md BUG-004.",
  knownBugs: ["BUG-004"],
  async form() {
    const [race, cls, background, athlete] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
      featByName(Feats.ATHLETE),
    ]);
    const strChoiceIds = await featChoiceOptionIds(Feats.ATHLETE, (co) => co.optionNameEng === "ATHLETE Ability (Strength)");
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      featId: athlete.featId,
      featChoiceSelections: strChoiceIds.length ? { "0": strChoiceIds[0] } : {},
    });
  },
};
