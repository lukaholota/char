import { BackgroundCategory, Classes, Feats, Races, Skills } from "@prisma/client";
import {
  backgroundByName,
  classByName,
  classChoiceOptionIdsAtLevel,
  featByName,
  featChoiceOptionIds,
  firstRaceVariantForRace,
  raceByName,
} from "../../helpers/seed-lookup";
import { flexibleGroupsFromAsi, pickAbilitiesForGroups } from "../../helpers/asi-shapes";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "longest-path",
  why: "Найдовший реальний шлях конструктора (raceVariantId + subraceId одночасно неможливі — схема забороняє, KR2.1 журнал 2026-08-13): варіант раси з вибором ASI + клас з ClassChoiceOption на 1 рівні + походження з рисою + риса з тричастинним вибором + експертиза + мови. Один білд, що навмисно комбінує максимум осей одночасно, а не тримає їх ізольовано, як решта матриці.",
  async form() {
    const [race, cls, background, skillExpert] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      backgroundByName(BackgroundCategory.REWARDED),
      featByName(Feats.SKILL_EXPERT),
    ]);
    const variant = await firstRaceVariantForRace(race.raceId);
    const groups = flexibleGroupsFromAsi(variant.overridesRaceASI, "basic");

    const [fightingStyleIds, asiIds, profIds, expertiseIds, luckyFeat] = await Promise.all([
      classChoiceOptionIdsAtLevel(cls.classId, 1),
      featChoiceOptionIds(Feats.SKILL_EXPERT, (co) => co.effectKind === "ASI" && co.effectAbility === "STR"),
      featChoiceOptionIds(Feats.SKILL_EXPERT, (co) => co.effectKind === "SKILL_PROFICIENCY" && co.effectSkill === "PERCEPTION"),
      featChoiceOptionIds(Feats.SKILL_EXPERT, (co) => co.effectKind === "SKILL_EXPERTISE" && co.effectSkill === "PERCEPTION"),
      featByName(Feats.LUCKY),
    ]);

    return minimalForm({
      raceId: race.raceId,
      raceVariantId: variant.raceVariantId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      backgroundFeatId: luckyFeat.featId,
      featId: skillExpert.featId,
      featChoiceSelections: {
        asi: asiIds[0],
        skillProficiency: profIds[0],
        skillExpertise: expertiseIds[0],
      },
      classChoiceSelections: fightingStyleIds.length ? { "0": fightingStyleIds[0] } : {},
      racialBonusChoiceSchema: { basicChoices: pickAbilitiesForGroups(groups), tashaChoices: [] },
      skills: [Skills.PERCEPTION],
      languagesSchema: { languages: ["Ельфійська"] },
    });
  },
};
