import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

import classesCatalog from "@/lib/generated/classes.json";
import { buildClassTable } from "@/rules/class-table";
import { picksAtLevelForGroup } from "@/lib/logic/choicePoolRules";
import {
  BLOOD_HUNTER_RULESETS,
  buildBloodHunterPlan,
  readBloodHunterSource,
  readBloodHunterTranslation,
  type BloodHunterPlan,
  type BloodHunterTranslation,
} from "../../prisma/seed/bloodHunter";

/// O45 — носій Мисливця за кровʼю: джерело англійською, два переклади, і все, що мусить сходитися
/// числами між таблицею класу, пулами виборів, лічильниками й каталогом.
const source = readBloodHunterSource();
const translations = Object.fromEntries(BLOOD_HUNTER_RULESETS.map((ruleset) => [ruleset, readBloodHunterTranslation(ruleset)])) as Record<
  (typeof BLOOD_HUNTER_RULESETS)[number],
  BloodHunterTranslation
>;
const plans = BLOOD_HUNTER_RULESETS.map((ruleset) => buildBloodHunterPlan(source, translations[ruleset], ruleset));

function findGroup(key: string) {
  const group = [...source.choiceGroups, ...source.subclasses.flatMap((subclass) => subclass.choiceGroups ?? [])].find((entry) => entry.key === key);
  if (!group) throw new Error(`Немає групи ${key}`);
  return group;
}

function findFeature(key: string) {
  const feature = [...source.features, ...source.subclasses.flatMap((subclass) => subclass.features)].find((entry) => entry.key === key);
  if (!feature) throw new Error(`Немає риси ${key}`);
  return feature;
}

function countAtLevel(steps: Record<string, number>, level: number): number {
  return Object.entries(steps)
    .filter(([from]) => Number(from) <= level)
    .reduce((sum, [, picks]) => sum + picks, 0);
}

function readUsesAtLevel(uses: unknown, level: number): number | "UNLIMITED" | null {
  if (!Array.isArray(uses)) return null;
  const reached = (uses as Array<{ lvl: number; uses: number | "UNLIMITED" }>).filter((step) => step.lvl <= level);
  return reached.length ? reached[reached.length - 1].uses : null;
}

function stripLinks(text: string): string {
  return text.replace(/<a [^>]*>(.*?)<\/a>/g, "$1");
}

function collectPlanEngNames(plan: BloodHunterPlan): string[] {
  const optionFeatures = (groups: BloodHunterPlan["choiceGroups"]) => groups.flatMap((group) => group.options.map((option) => option.feature.engName));
  return [
    ...plan.features.map((feature) => feature.engName),
    ...optionFeatures(plan.choiceGroups),
    ...plan.subclasses.flatMap((subclass) => [...subclass.features.map((feature) => feature.engName), ...optionFeatures(subclass.choiceGroups)]),
  ];
}

describe("O45 — таблиця класу й пули виборів сходяться", () => {
  it("відомі криваві прокляття на кожному рівні = сума виборів групи «Криваві прокляття»", () => {
    const curses = findGroup("blood-curses");
    for (let level = 1; level <= 20; level++) {
      expect(countAtLevel(curses.picksAtLevel, level), `рівень ${level}`).toBe(countAtLevel(stepsToPicks(source.classTable.bloodCursesKnown), level));
    }
  });

  it("обряди: 1 на 2, +1 на 7 і 14; три базові, три лише з 14 рівня", () => {
    const rites = findGroup("crimson-rites");
    expect(rites.picksAtLevel).toEqual({ "2": 1, "7": 1, "14": 1 });
    expect(rites.options.filter((option) => !option.prerequisites).map((option) => option.key)).toEqual(["flame", "frozen", "storm"]);
    expect(rites.options.filter((option) => option.prerequisites?.level === 14)).toHaveLength(3);
  });

  it("Криваве наврочення: 1 / 2 з 6 / 3 з 13 / 4 з 17, відновлення на короткому відпочинку", () => {
    const maledict = findFeature("blood-maledict");
    expect(maledict.limitedUsesPer).toBe("SHORT_REST");
    expect([1, 5, 6, 12, 13, 16, 17, 20].map((level) => readUsesAtLevel(maledict.usesCountSpecial, level))).toEqual([1, 1, 2, 2, 3, 3, 4, 4]);
  });

  it("Знавець проклять: на кожному рівні ордену — наврочень на одне більше, і пул той самий", () => {
    const maledict = findFeature("blood-maledict");
    const specialist = findFeature("curse-specialist");
    expect(specialist.usesPoolKey).toBe(maledict.usesPoolKey);
    for (let level = 3; level <= 20; level++) {
      expect(readUsesAtLevel(specialist.usesCountSpecial, level), `рівень ${level}`).toBe(Number(readUsesAtLevel(maledict.usesCountSpecial, level)) + 1);
    }
  });

  it("заміна прокляття й формули — рівно на тих рівнях, де вивчається нове, крім першого", () => {
    for (const replacement of source.choiceReplacements) {
      const learnLevels = Object.keys(findGroup(replacement.groupKey).picksAtLevel).map(Number).sort((a, b) => a - b);
      expect(replacement.levels, replacement.key).toEqual(learnLevels.slice(1));
    }
  });

  it("мутагенне ремесло: відомі формули = сума виборів, мутагенів за відпочинок = лічильник риси", () => {
    const mutant = source.subclasses.find((subclass) => subclass.enum === "ORDER_OF_THE_MUTANT")! as (typeof source.subclasses)[number] & {
      mutagencraftTable: Record<string, { mutagensCreated: number; formulasKnown: number }>;
    };
    const mutagens = findGroup("mutagens");
    const craft = findFeature("mutagencraft");

    for (const [level, row] of Object.entries(mutant.mutagencraftTable)) {
      expect(countAtLevel(mutagens.picksAtLevel, Number(level)), `формул на ${level}`).toBe(row.formulasKnown);
      expect(readUsesAtLevel(craft.usesCountSpecial, Number(level)), `мутагенів на ${level}`).toBe(row.mutagensCreated);
    }
  });

  it("мутагени з рівневою вимогою: Відновлення з 7, Ефір, Жорстокість і Точність з 11", () => {
    const gated = findGroup("mutagens").options.filter((option) => option.prerequisites).map((option) => [option.key, option.prerequisites!.level]);
    expect(gated).toEqual([
      ["aether", 11],
      ["cruelty", 11],
      ["precision", 11],
      ["reconstruction", 7],
    ]);
  });

  it("правила пулів білдера дорівнюють picksAtLevel носія на кожному рівні", () => {
    const uk = translations.RULES_2014;
    const expectPool = (scope: "class" | "subclass", owner: Record<string, string>, groupName: string, picks: Record<string, number>) => {
      for (let level = 1; level <= 20; level++) {
        expect(picksAtLevelForGroup({ scope, groupName, levelAfter: level, ...owner }), `${groupName} на ${level}`).toBe(picks[String(level)] ?? 0);
      }
    };

    for (const className of ["BLOOD_HUNTER_2014", "BLOOD_HUNTER_2024"]) {
      for (const group of source.choiceGroups) expectPool("class", { className }, uk.choiceGroups[group.key].groupName, group.picksAtLevel);
    }
    for (const subclass of source.subclasses) {
      for (const group of subclass.choiceGroups ?? []) {
        expectPool("subclass", { subclassName: subclass.enum }, uk.subclasses[subclass.enum].choiceGroups![group.key].groupName, group.picksAtLevel);
      }
    }
  });

  it("риси орденів приходять лише на 3, 7, 11, 15 і 18 рівнях, і кожен рівень має хоч одну", () => {
    for (const subclass of source.subclasses) {
      const levels = new Set(subclass.features.map((feature) => feature.level));
      expect([...levels].sort((a, b) => a - b), subclass.enum).toEqual([3, 7, 11, 15, 18]);
    }
  });

  it("таблиця класу в каталозі показує кубик гемокрафту й відомі прокляття з носія", () => {
    const table = buildClassTable({ name: "BLOOD_HUNTER_2014", ruleset: "RULES_2014", spellcastingType: "NONE", features: [] }, []);
    const column = (key: string) => table.columns.findIndex((entry) => entry.key === key);

    for (const row of table.rows) {
      expect(row.cells[column("hemocraft_die")], `рівень ${row.level}`).toBe(`к${stepValue(source.classTable.hemocraftDie, row.level).replace("1d", "")}`);
      expect(row.cells[column("blood_curses_known")], `рівень ${row.level}`).toBe(String(stepValue(source.classTable.bloodCursesKnown, row.level)));
    }
  });
});

describe("O45 — два переклади, один текст", () => {
  it("кожна риса, вибір і орден джерела мають переклад, і переклад не має зайвих ключів", () => {
    for (const uk of Object.values(translations)) {
      expect(Object.keys(uk.features).sort()).toEqual(source.features.map((feature) => feature.key).sort());
      for (const group of source.choiceGroups) expect(Object.keys(uk.choiceGroups[group.key].options).sort()).toEqual(group.options.map((option) => option.key).sort());
      for (const subclass of source.subclasses) {
        const text = uk.subclasses[subclass.enum];
        expect(Object.keys(text.features).sort(), subclass.enum).toEqual(subclass.features.map((feature) => feature.key).sort());
        for (const group of subclass.choiceGroups ?? []) expect(Object.keys(text.choiceGroups![group.key].options).sort()).toEqual(group.options.map((option) => option.key).sort());
      }
    }
  });

  it("без посилань тексти 2014 і 2024 однакові — термін правиться в обох файлах разом", () => {
    const { adaptationNote: _note, ...class2024 } = translations.RULES_2024.class;
    const normalize = (uk: object) => JSON.parse(stripLinks(JSON.stringify(uk)));
    expect(normalize({ ...translations.RULES_2024, class: class2024 })).toEqual(normalize(translations.RULES_2014));
    expect(translations.RULES_2024.class.adaptationNote).toBeTruthy();
  });

  it("назви рис і варіантів унікальні й влазять у varchar(100)", () => {
    for (const plan of plans) {
      const names = collectPlanEngNames(plan);
      expect(names.filter((name, index) => names.indexOf(name) !== index), plan.ruleset).toEqual([]);
      expect(names.filter((name) => name.length > 100), plan.ruleset).toEqual([]);
      const options = [...plan.choiceGroups, ...plan.subclasses.flatMap((subclass) => subclass.choiceGroups)].flatMap((group) => group.options.map((option) => option.optionNameEng));
      expect(options.filter((name, index) => options.indexOf(name) !== index), plan.ruleset).toEqual([]);
    }
  });

  it("2024 має Майстерність зброї на 1, риси на 4/8/12/16 і Епічний Дар на 19; 2014 — ні", () => {
    const [plan2014, plan2024] = plans;
    const levelOf = (plan: BloodHunterPlan, suffix: string) => plan.features.find((feature) => feature.engName.includes(suffix))?.level ?? null;

    expect([levelOf(plan2024, "Weapon Mastery"), levelOf(plan2024, "Epic Boon")]).toEqual([1, 19]);
    expect([levelOf(plan2014, "Weapon Mastery"), levelOf(plan2014, "Epic Boon")]).toEqual([null, null]);
    expect(plan2014.classRow.abilityScoreUpLevels).toEqual([4, 8, 12, 16, 19]);
    expect(plan2024.classRow.abilityScoreUpLevels).toEqual([4, 8, 12, 16]);
    expect(plan2014.sharedFeatureLinks).toEqual([{ engName: "Ability Score Improvement", level: 4 }]);
  });
});

describe("O45 — стартове спорядження 2024", () => {
  const SRD_NAME_BY_ROW: Record<string, string> = {
    STUDDED_LEATHER: "Studded Leather Armor",
    LONGSWORD: "Longsword",
    LIGHT_CROSSBOW: "Light Crossbow",
    EXPLORERS_PACK: "Explorer's Pack",
    "Болти": "Bolts",
    "Футляр для арбалетних болтів": "Case, Crossbow Bolt",
    "Приладдя алхіміка": "Alchemist's Supplies",
  };

  it("пакет A коштує стільки ж, скільки варіант B, за цінами SRD 2024 — як у решти класів", () => {
    const equipment = readFileSync("data/2024/srd/equipment.md", "utf-8");
    const priceOf = (srdName: string) => readSrdPrice(equipment, srdName);
    const rows = source.startingEquipment.RULES_2024;
    const valueOf = (option: string) =>
      rows
        .filter((row) => row.option === option)
        .reduce((sum, row) => {
          if (row.item === "зм") return sum + (row.quantity ?? 1);
          const key = row.weapon ?? row.armor ?? row.pack ?? row.item ?? "";
          if (!SRD_NAME_BY_ROW[key]) throw new Error(`Немає ціни для ${key}`);
          return sum + priceOf(SRD_NAME_BY_ROW[key]);
        }, 0);

    expect(valueOf("b")).toBe(150);
    expect(valueOf("a")).toBe(valueOf("b"));
  });
});

function readSrdPrice(equipment: string, srdName: string): number {
  const escaped = srdName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const heading = equipment.match(new RegExp(`(?:\\*\\*|#### )${escaped} \\((\\d+) GP\\)`));
  if (heading) return Number(heading[1]);
  const row = equipment.match(new RegExp(`<td>${escaped}</td>[\\s\\S]*?<td>(\\d+) GP</td>`));
  if (!row) throw new Error(`Немає ціни «${srdName}» у SRD`);
  return Number(row[1]);
}

describe("O45 — каталог дорівнює носію", () => {
  it("опис класу й орденів у каталозі — текст перекладу своєї редакції", () => {
    for (const plan of plans) {
      const entry = (classesCatalog as Array<{ key: string; description: string | null; subclasses: Array<{ key: string; description: string | null }> }>).find(
        (item) => item.key === plan.classRow.name,
      );
      expect(entry, plan.ruleset).toBeDefined();
      expect(entry!.description).toBe(plan.classRow.description);
      for (const subclass of plan.subclasses) {
        expect(entry!.subclasses.find((item) => item.key === subclass.name)?.description, subclass.name).toBe(subclass.description);
      }
    }
  });
});

function stepValue<T>(steps: Record<string, T>, level: number): T {
  const reached = Object.keys(steps)
    .map(Number)
    .filter((from) => from <= level)
    .sort((a, b) => a - b);
  return steps[String(reached[reached.length - 1])];
}

function stepsToPicks(steps: Record<string, number>): Record<string, number> {
  let previous = 0;
  return Object.fromEntries(
    Object.entries(steps).map(([level, total]) => {
      const picks = total - previous;
      previous = total;
      return [level, picks];
    }),
  );
}
