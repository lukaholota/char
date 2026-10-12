import { BackgroundCategory, Classes, Feats, Races, Skills } from "@prisma/client";
import { backgroundByName, classByName, featByName, featChoiceOptionIds, raceByName } from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { Build } from "./types";

export const build: Build = {
  id: "prodigy-feat",
  why: "Раса-обмежена риса (Prodigy, XGtE: лише Human/Half-Elf/Half-Orc, race.raceRestriction) із двочастинним вибором (навичка + експертиза в НІЙ ЖЕ). Перевірено проти сідів: усі ChoiceOption цієї риси мають effectKind=null — character.ts іде виключно легасі-шляхом extractSkillsFromChoiceOption/extractExpertisesFromChoiceOption (текстовий парсинг optionNameEng), тож ця риса тримає ту гілку окремо від Skill Expert (де effectKind заповнений). Опцій на інструмент/мову в сідах немає взагалі — golden це теж зафіксує (немає що втрачати, бо немає що обирати).",
  async form() {
    const [race, cls, background, prodigy] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.ROGUE_2014),
      backgroundByName(BackgroundCategory.URCHIN),
      featByName(Feats.PRODIGY),
    ]);
    const [proficiencyIds, expertiseIds] = await Promise.all([
      featChoiceOptionIds(Feats.PRODIGY, (co) => co.optionNameEng.includes("Proficiency (ATHLETICS)")),
      featChoiceOptionIds(Feats.PRODIGY, (co) => co.optionNameEng.includes("Expertise (ATHLETICS)")),
    ]);
    return minimalForm({
      raceId: race.raceId,
      classId: cls.classId,
      backgroundId: background.backgroundId,
      featId: prodigy.featId,
      featChoiceSelections: {
        proficiency: proficiencyIds[0],
        expertise: expertiseIds[0],
      },
      skills: [Skills.SLEIGHT_OF_HAND, Skills.STEALTH],
      expertiseSchema: { expertises: [Skills.SLEIGHT_OF_HAND, Skills.STEALTH] },
    });
  },
};
