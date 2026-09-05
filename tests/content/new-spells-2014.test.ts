import { describe, expect, it } from "vitest";
import {
  NewSpell2014,
  readNewSpells2014Batches,
  readNewSpells2014Ready,
  readNewSpells2014Spells,
} from "../../prisma/seed/newSpells2014";
import {
  collectUkrainianDice,
  compareSpellFacts,
  readCastingTimeFromUkrainian,
  readClassFromUkrainian,
  readComponentsFromUkrainian,
  readDurationFromUkrainian,
  readRangeFromUkrainian,
  readSchoolFromUkrainian,
  SpellFacts,
} from "../../scripts/5etools/spell-facts";
import { readFactsFromSource } from "../../scripts/5etools/source-spell-facts";
import {
  findEditionBySource,
  findLooseNameKey,
  readSpellClassIndex,
  readSpells,
  SourceSpell,
} from "../../scripts/5etools/schema";

const EXPECTED_BATCHES = [
  [
    "Distort Value",
    "Fast Friends",
    "Gift of Gab",
    "Incite Greed",
    "Jim's Glowing Coin",
    "Jim's Magic Missile",
    "Motivational Speech",
    "Borrowed Knowledge",
    "Kinetic Jaunt",
    "Silvery Barbs",
    "Vortex Warp",
    "Wither and Bloom",
    "Antagonize",
  ],
  [
    "Flock of Familiars",
    "Galder's Speedy Courier",
    "Galder's Tower",
    "Air Bubble",
    "Create Spelljamming Helm",
    "Spirit of Death",
    "Spray of Cards",
    "Create Magen",
    "Frost Fingers",
    "Gate Seal",
    "Warp Sense",
    "Linked Glyphs",
    "Encode Thoughts",
  ],
];

/// Порожньо: усі словникові терміни KR17.3 ратифіковані власником 2026-08-24 і лежать у
/// `dictionary.json`. Перелік лишається, бо він і є сторожем — запис, відкладений без
/// названого blocker-а, має валити гейт, а не тихо зникати з каталогу.
const EXPECTED_BLOCKERS: string[] = [];

/// Ключ enum-у `Source` не завжди дорівнює коду книги в корпусі: проєкт завів свої значення
/// раніше, ніж прийшов 5etools. Псевдоніми перелічені поіменно, щоб мовчазна підміна книги
/// падала тестом, а не доїжджала в базу.
const SOURCE_ALIASES: Record<string, string> = {
  AI: "AI",
  SCC: "SCC",
  BMT: "BOMT",
  LLK: "LLK",
  AAG: "AAG",
  IDRotF: "IDROTF",
  SatO: "SatO",
  "AitFR-AVT": "AitFR_AVT",
  GGR: "GGTR",
};

const batches = readNewSpells2014Batches();
const ready = readNewSpells2014Ready();
const sourceSpells = readSpells();
const classIndex = readSpellClassIndex();

describe("KR17.3 — відсутні заклинання 2014", () => {
  it("пінить рівно наступні 13 відсутніх заклинань у стабільному порядку кожної партії", () => {
    expect(batches.map((batch) => batch.spells.map((spell) => spell.engName))).toEqual(
      EXPECTED_BATCHES,
    );
  });

  it("відкладає лише відомі словникові blockers", () => {
    const blocked = readNewSpells2014Spells()
      .filter((spell) => spell.status === "blocked-term")
      .map((spell) => `${spell.engName}: ${spell.blocker}`);

    expect(blocked).toEqual(EXPECTED_BLOCKERS);
  });

  it("звіряє всі ready-поля й класи з pinned 5etools", () => {
    const problems = ready.flatMap(findFactProblems);
    expect(problems).toEqual([]);
  });

  it("лишає перелік класів порожнім лише там, де корпус його не подає", () => {
    const withoutClasses = ready.filter((spell) => spell.classes.length === 0);
    expect(withoutClasses.map((spell) => spell.engName)).toEqual(["Encode Thoughts"]);
    expect(withoutClasses.map((spell) => readExpectedClasses(spell))).toEqual([[]]);
  });

  it("зберігає exact source або документований project alias", () => {
    expect(ready.map((spell) => `${spell.pinnedSource}:${spell.source}`)).toEqual(
      ready.map((spell) => `${spell.pinnedSource}:${SOURCE_ALIASES[spell.pinnedSource]}`),
    );
  });

  /// Форму «хіт…» звужено до цілого слова тим самим виразом, що в
  /// `spells-2024-terminology.test.ts`: `хіт\S*` ловив ратифікований словником розмір
  /// «Крихітний», тобто давав фальшиве спрацювання, а не знаходив знятий термін.
  it("не заносить у новий переклад зняті терміни", () => {
    const withdrawn =
      /чарунк|комірк|пункт\S* здоров|(?<![\p{L}])хіт(?:и|ів|ами|ам|ах|ом|у|а)?(?![\p{L}])|пошкодж|ушкодж|спаскид|урон/iu;
    expect(
      ready.filter((spell) => withdrawn.test(spell.description)).map((spell) => spell.engName),
    ).toEqual([]);
  });
});

function findFactProblems(spell: NewSpell2014): string[] {
  const source = findSourceSpell(spell);
  const expectedClasses = readExpectedClasses(spell);
  const mismatches = compareSpellFacts(readBatchFacts(spell), readFactsFromSource(source, expectedClasses, spell.engName));
  return mismatches.map((mismatch) => `${spell.engName}: ${mismatch.field}`);
}

function findSourceSpell(spell: NewSpell2014): SourceSpell {
  const source = sourceSpells.find(
    (candidate) =>
      candidate.source === spell.pinnedSource &&
      findLooseNameKey(candidate.nameEng) === findLooseNameKey(spell.engName),
  );
  if (!source) throw new Error(`${spell.engName}: немає pinned оригіналу`);
  return source;
}

function readExpectedClasses(spell: NewSpell2014): string[] {
  const key = `${spell.pinnedSource}|${findLooseNameKey(spell.engName)}`;
  return [
    ...new Set(
      (classIndex.get(key) ?? [])
        .filter((entry) => findEditionBySource(entry.source) === "RULES_2014")
        .map((entry) => entry.name),
    ),
  ].sort();
}

function readBatchFacts(spell: NewSpell2014): SpellFacts {
  return {
    level: spell.level,
    school: readSchoolFromUkrainian(spell.school, spell.engName),
    castingTime: readCastingTimeFromUkrainian(spell.castingTime, spell.engName),
    range: readRangeFromUkrainian(spell.range, spell.engName),
    components: readComponentsFromUkrainian(spell.components),
    duration: readDurationFromUkrainian(spell.duration, spell.engName),
    concentration: spell.hasConcentration === "так",
    ritual: spell.hasRitual === "так",
    classes: spell.classes
      .map(readClassFromUkrainian)
      .filter((name): name is string => name !== null)
      .sort(),
    dice: collectUkrainianDice(spell.description),
  };
}
