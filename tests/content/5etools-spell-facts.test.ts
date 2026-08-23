import { readFileSync } from "fs";
import { join } from "path";
import { describe, expect, it } from "vitest";
import { spellSchoolTranslations } from "@/lib/refs/translation";

import { readSpellClassIndexFrom, readSpellsFrom } from "../../scripts/5etools/schema";
import { readFactsFromSource } from "../../scripts/5etools/source-spell-facts";
import {
  collectUkrainianDice,
  compareSpellFacts,
  isBaseClass,
  RATIFIED_SCHOOL_WORDS,
  readCastingTimeFromUkrainian,
  readComponentsFromUkrainian,
  readDurationFromUkrainian,
  readRangeFromUkrainian,
  readSchoolFromUkrainian,
  SpellFacts,
} from "../../scripts/5etools/spell-facts";

const FIXTURE_DIR = join(process.cwd(), "tests/fixtures/5etools");

function readFixture(name: string): unknown {
  return JSON.parse(readFileSync(join(FIXTURE_DIR, `${name}.json`), "utf-8"));
}

const spells = readSpellsFrom(readFixture("spells-slice"), "spells-slice");
const classIndex = readSpellClassIndexFrom(readFixture("spell-sources-slice"), "sources-slice");

function findSpell(source: string) {
  const found = spells.find((spell) => spell.source === source);
  if (!found) throw new Error(`Немає у зрізі: ${source}`);
  return found;
}

const BASE_FACTS: SpellFacts = {
  level: 0,
  school: "N",
  castingTime: "1 action",
  range: "touch",
  components: "VS",
  duration: "instant",
  concentration: false,
  ritual: false,
  classes: ["Wizard"],
  dice: ["1d10"],
};

describe("KR16.2 — розбір нашого запису українською", () => {
  /// До рішення власника 2026-08-23 розбір приймав дві форми назв шкіл — словникову й ту, що
  /// лежить у даних. Тепер форма одна, і друга мусить падати, а не тихо проходити.
  it("читає школу тільки ратифікованим словом, а на старій формі падає", () => {
    expect(readSchoolFromUkrainian("Захист", "тест")).toBe("A");
    expect(RATIFIED_SCHOOL_WORDS.A).toBe("Захист");
    expect(RATIFIED_SCHOOL_WORDS.A).toBe(spellSchoolTranslations.ABJURATION);
    expect(() => readSchoolFromUkrainian("Огородження", "тест")).toThrow(/невідома школа/);
    expect(() => readSchoolFromUkrainian("Кулінарія", "тест")).toThrow(/невідома школа/);
  });

  it("відкидає умову реакції, а не ламається на «або» всередині неї", () => {
    expect(
      readCastingTimeFromUkrainian(
        "1 бонусна дія, яку ви здійснюєте одразу після влучення по цілі зброєю ближнього бою або Беззбройним ударом",
        "тест"
      )
    ).toBe("1 bonus");
    expect(readCastingTimeFromUkrainian("1 дія або 8 годин", "тест")).toBe("1 action or 8 hour");
    expect(readCastingTimeFromUkrainian("1 хвилина або ритуал", "тест")).toBe("1 minute");
  });

  it("падає на нерозпізнаному часі створення замість вигадати збіг", () => {
    expect(() => readCastingTimeFromUkrainian("на світанку", "Тест")).toThrow(
      /не розібрано час створення/
    );
  });

  it("зводить дальність, зокрема область на себе", () => {
    expect(readRangeFromUkrainian("Дотик", "тест")).toBe("touch");
    expect(readRangeFromUkrainian("120 футів", "тест")).toBe("120 feet");
    expect(readRangeFromUkrainian("На себе (15-футовий конус)", "тест")).toBe("self (15-foot cone)");
    expect(readRangeFromUkrainian("На себе", "тест")).toBe("self");
    /// Форма 2024: «Випромінювання радіусом N футів». Слово «радіусом» стоїть у ній завжди,
    /// тому випромінювання мусить розпізнаватися раніше за радіус — інакше XPHB-заклинання
    /// на кшталт `Thunderclap` читалося б як `radius` і давало розбіжність на порожньому місці.
    expect(readRangeFromUkrainian("На себе (Випромінювання радіусом 5 футів)", "тест")).toBe(
      "self (5-foot emanation)"
    );
    expect(readRangeFromUkrainian("Область видимості", "тест")).toBe("sight");
  });

  it("читає компоненти з голови рядка, не чіпаючи матеріали в дужках", () => {
    expect(readComponentsFromUkrainian("В, С, М (свята вода та Срібло)")).toBe("VSM");
    expect(readComponentsFromUkrainian("В")).toBe("V");
    expect(readComponentsFromUkrainian("С, М (перо)")).toBe("SM");
  });

  it("зводить тривалість, зокрема концентрацію й розвіювання", () => {
    expect(readDurationFromUkrainian("Миттєво", "тест")).toBe("instant");
    expect(readDurationFromUkrainian("Концентрація, до 1 хвилини", "тест")).toBe(
      "concentration, up to 1 minute"
    );
    expect(readDurationFromUkrainian("Доки не розвіють", "тест")).toBe("until dispelled");
    expect(readDurationFromUkrainian("До розвіювання або спрацювання", "тест")).toBe(
      "until dispelled or triggered"
    );
  });

  it("не бачить кубика в слові «як», але бачить голе «к8»", () => {
    expect(collectUkrainianDice("переносити більш як 10 фунтів")).toEqual([]);
    expect(collectUkrainianDice("перетворюється на к8")).toEqual(["1d8"]);
    expect(collectUkrainianDice("2к6 ушкоджень, потім ще 1к4")).toEqual(["1d4", "2d6"]);
  });

  it("знає, що підклас — не клас", () => {
    expect(isBaseClass("Чародій")).toBe(true);
    expect(isBaseClass("Коло спор")).toBe(false);
  });
});

describe("KR16.2 — розбір запису 5etools", () => {
  it("читає XPHB-варіант заклинання так, як його надруковано", () => {
    const facts = readFactsFromSource(findSpell("XPHB"), ["Sorcerer"], "Chill Touch|XPHB");

    expect(facts.range).toBe("touch");
    expect(facts.castingTime).toBe("1 action");
    expect(facts.duration).toBe("instant");
    expect(facts.components).toBe("VS");
    expect(facts.dice).toContain("1d10");
    expect(facts.concentration).toBe(false);
  });

  it("читає 2014-варіант того самого заклинання інакше", () => {
    const facts = readFactsFromSource(findSpell("PHB"), [], "Chill Touch|PHB");

    expect(facts.range).toBe("120 feet");
    expect(facts.dice).toContain("1d8");
  });

  it("падає на невідомому типі дальності замість прочитати його як звичайну", () => {
    const broken = readSpellsFrom(
      {
        spell: [
          {
            name: "Вигадка",
            source: "XPHB",
            level: 1,
            school: "V",
            time: [{ number: 1, unit: "action" }],
            range: { type: "спіраль", distance: { type: "feet", amount: 10 } },
            components: { v: true },
            duration: [{ type: "instant" }],
          },
        ],
      },
      "зріз"
    );

    expect(() => readFactsFromSource(broken[0], [], "Вигадка")).toThrow(/невідомий тип range/);
  });

  it("бере класи і з `class`, і з `classVariant`, позначаючи другі", () => {
    const aid = classIndex.get("PHB|aid");
    const toll = classIndex.get("XGE|tollthedead");

    expect(aid?.filter((entry) => !entry.isVariant).map((entry) => entry.name)).toEqual([
      "Cleric",
      "Paladin",
      "Artificer",
    ]);
    expect(aid?.filter((entry) => entry.isVariant).map((entry) => entry.name)).toEqual([
      "Bard",
      "Ranger",
    ]);
    expect(toll?.every((entry) => entry.isVariant)).toBe(true);
  });
});

describe("KR16.2 — порівняння фактів", () => {
  it("мовчить, коли все збігається", () => {
    expect(compareSpellFacts(BASE_FACTS, { ...BASE_FACTS })).toEqual([]);
  });

  it("називає рівно ті поля, що розійшлися", () => {
    const mismatches = compareSpellFacts(BASE_FACTS, {
      ...BASE_FACTS,
      range: "120 feet",
      dice: ["1d8"],
    });

    expect(mismatches.map((mismatch) => mismatch.field)).toEqual(["range", "dice"]);
    expect(mismatches[0]).toEqual({ field: "range", ours: "touch", theirs: "120 feet" });
  });

  it("не рахує класи за розбіжність, коли джерело їх не подає", () => {
    const theirs = { ...BASE_FACTS, classes: [] };

    expect(compareSpellFacts(BASE_FACTS, theirs).map((m) => m.field)).toEqual(["classes"]);
    expect(compareSpellFacts(BASE_FACTS, theirs, { compareClasses: false })).toEqual([]);
  });

  /// `{@scaledamage 2d8|4-9|1d10}` в `Ice Storm` показує 1d10, а 2d8 — це база, яку 5etools
  /// лишив від редакції 2014 (у XPHB базові ушкодження 2d10). Кубики джерела треба брати з
  /// розкладеного тексту, інакше звірка вимагає від перекладу кубика, якого в правилі немає.
  it("бере кубики джерела з розкладеного тексту, а не з бази @scaledamage", () => {
    const iceStorm = {
      kind: "spell" as const,
      nameEng: "Ice Storm",
      source: "XPHB",
      page: 287,
      edition: "RULES_2024" as const,
      level: 4,
      school: "V",
      raw: {
        entries: ["A creature takes {@damage 2d10} Bludgeoning damage and {@damage 4d6} Cold damage."],
        entriesHigherLevel: [
          { entries: ["The Bludgeoning damage increases by {@scaledamage 2d8|4-9|1d10}."] },
        ],
        time: [{ number: 1, unit: "action" }],
        range: { type: "point", distance: { type: "feet", amount: 300 } },
        components: { v: true, s: true, m: "a mitten" },
        duration: [{ type: "instant" }],
      },
    };

    expect(readFactsFromSource(iceStorm, [], "Ice Storm|XPHB").dice).toEqual([
      "1d10",
      "2d10",
      "4d6",
    ]);
  });

  it("ловить дефект `Chill Touch` наскрізь: наш 2024-запис проти XPHB", () => {
    const ours: SpellFacts = {
      level: 0,
      school: readSchoolFromUkrainian("Некромантія", "Chill Touch"),
      castingTime: readCastingTimeFromUkrainian("1 дія", "Chill Touch"),
      range: readRangeFromUkrainian("120 футів", "Chill Touch"),
      components: readComponentsFromUkrainian("В, С"),
      duration: readDurationFromUkrainian("1 раунд", "Chill Touch"),
      concentration: false,
      ritual: false,
      classes: ["Sorcerer", "Warlock", "Wizard"],
      dice: ["1d8", "2d8", "3d8", "4d8"],
    };

    const theirs = readFactsFromSource(
      findSpell("XPHB"),
      ["Sorcerer", "Warlock", "Wizard"],
      "Chill Touch|XPHB"
    );

    expect(compareSpellFacts(ours, theirs).map((mismatch) => mismatch.field)).toEqual([
      "range",
      "duration",
      "dice",
    ]);
  });
});
