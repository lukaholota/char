import { BackgroundCategory, Classes, Races, Subclasses } from "@prisma/client";
import {
  backgroundByName,
  classByName,
  classChoiceOptionIdsAtLevel,
  raceByName,
  subclassByName,
  subclassChoiceOptionIdsAtLevel,
} from "../../helpers/seed-lookup";
import { minimalForm } from "../../helpers/build-form";
import type { LevelUpSequence } from "./types";

const ROGUE_LEVELS = 4;
const ROGUE_ASI_LEVELS = new Set([4]);
const FIGHTER_ASI_CLASS_LEVELS = new Set([4, 6, 8, 12, 14, 16]);
const MANEUVER_NAMES_AT_FIGHTER_LEVEL: Record<number, string[]> = {
  3: ["Trip Attack (Maneuver)", "Precision Attack (Maneuver)", "Riposte (Maneuver)"],
  7: ["Disarming Attack (Maneuver)", "Menacing Attack (Maneuver)"],
  10: ["Parry (Maneuver)", "Evasive Footwork (Maneuver)"],
  15: ["Feinting Attack (Maneuver)", "Goading Attack (Maneuver)"],
};

export const sequence: LevelUpSequence = {
  id: "rogue4-fighter16-multiclass",
  why: "Rogue 1→4 → MULTICLASS Fighter 1→16 (char 5→20) — закриває дірку, яку власник знайшов при перегляді 4/4 наявних мультикласових послідовностей: усі досі обрані підкласи (Champion, Alchemist, Life Domain, Beast Master, Fiend, Wild Magic, Evocation, Oath of Devotion) навмисно без власного choicePoolRules.ts-пулу, тож жоден тест ще не бачив, як пул вибору ПІДКЛАСУ росте, коли клас узятий через MULTICLASS, а не з 1 рівня персонажа. Battle Master (Fighter) — обраний саме тому, що має вибір 'Маневри майстра бою' з класLevelAfter-порогами {3:3,7:2,10:2,15:2} (choicePoolRules.ts, звірено з файлу, а не по памʼяті — PHB дає ті самі пороги, але тут важливо, що пороги рахуються від власного рівня класу Fighter, який у цій послідовності завжди дорівнює character-level мінус 4, а не character-level напряму). Підклас узятий на Fighter class-level 3 = character level 7, тобто вже всередині мультикласового стану — саме сценарій 'ongoing pool, reached via MULTICLASS boundary', якого бракувало.",
  maxLevel: 20,
  async startForm() {
    const [race, cls, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.ROGUE_2014),
      backgroundByName(BackgroundCategory.CRIMINAL),
    ]);
    return minimalForm({ raceId: race.raceId, classId: cls.classId, backgroundId: background.backgroundId });
  },
  async buildLevelUpData(nextLevel) {
    if (nextLevel <= ROGUE_LEVELS) {
      const cls = await classByName(Classes.ROGUE_2014);
      const data: { classId: number; subclassId?: number; customAsi?: Array<{ ability: string; value: number }> } = {
        classId: cls.classId,
      };

      if (nextLevel === 3) {
        const assassin = await subclassByName(cls.classId, Subclasses.ASSASSIN);
        data.subclassId = assassin.subclassId;
      }

      if (ROGUE_ASI_LEVELS.has(nextLevel)) {
        data.customAsi = [
          { ability: "DEX", value: 1 },
          { ability: "INT", value: 1 },
        ];
      }

      return data;
    }

    const fighterClassLevel = nextLevel - ROGUE_LEVELS;
    const cls = await classByName(Classes.FIGHTER_2014);
    const data: {
      classId: number;
      levelUpPath?: "MULTICLASS";
      subclassId?: number;
      customAsi?: Array<{ ability: string; value: number }>;
      classChoiceSelections?: Record<string, number>;
      subclassChoiceSelections?: Record<string, number[]>;
    } = { classId: cls.classId };

    if (fighterClassLevel === 1) {
      data.levelUpPath = "MULTICLASS";
      const [duelingId] = await classChoiceOptionIdsAtLevel(cls.classId, 1, (co) => co.optionNameEng === "Dueling");
      data.classChoiceSelections = { "Бойовий стиль": duelingId };
    }

    if (fighterClassLevel === 3) {
      const battleMaster = await subclassByName(cls.classId, Subclasses.BATTLE_MASTER);
      data.subclassId = battleMaster.subclassId;
    }

    const maneuverNames = MANEUVER_NAMES_AT_FIGHTER_LEVEL[fighterClassLevel];
    if (maneuverNames) {
      const battleMaster = await subclassByName(cls.classId, Subclasses.BATTLE_MASTER);
      const maneuverIds = await subclassChoiceOptionIdsAtLevel(
        battleMaster.subclassId,
        fighterClassLevel,
        (co) => maneuverNames.includes(co.optionNameEng),
      );
      data.subclassChoiceSelections = { "Маневри майстра бою": maneuverIds };
    }

    if (FIGHTER_ASI_CLASS_LEVELS.has(fighterClassLevel)) {
      data.customAsi = [
        { ability: "STR", value: 1 },
        { ability: "CON", value: 1 },
      ];
    }

    return data;
  },
};
