/**
 * KR17.1 — звірка **прози** каталогу 2024 з XPHB.
 *
 * Звірка полів (`differs-from-2014.test.ts`) не бачить, що написано в описі. `Darkvision`
 * тримав темний зір 60 футів замість 150, і жоден тест не впав: поле «дальність» у нього
 * «Дотик», і воно правильне.
 *
 * Тут звіряються ознаки, що переживають переклад, — числа з одиницями, кубики, стани, типи
 * дій, характеристика ряткидка, типи шкоди — і звіряються **двосторонньо**: зайве в нас
 * важить не менше за відсутнє.
 */

import { describe, expect, it } from "vitest";
import catalog2024 from "../../data/2024/normalized/spells.json";
import { ALIGNED_WITH_XPHB } from "./aligned-with-xphb";
import { findLooseNameKey, readSpells, SourceSpell } from "../../scripts/5etools/schema";
import {
  collectSourceProseFacts,
  collectUkrainianProseFacts,
  compareProseFacts,
  ProseFactMismatch,
} from "../../scripts/5etools/prose-facts";

type CatalogRow = { engName: string; description: string };

const catalog = catalog2024 as CatalogRow[];

const sourceByName = new Map(
  readSpells()
    .filter((spell) => spell.edition === "RULES_2024")
    .map((spell) => [findLooseNameKey(spell.nameEng), spell])
);

/// Законні розбіжності — поіменно й з причиною, а не порогом «дозволено N відсотків».
/// Порогу тут бути не може: він ховає саме той клас дефекту, заради якого писалася звірка.
const KNOWN_PROSE_GAPS_2024: Record<string, string> = {
  "Leomund's Secret Chest":
    "XPHB пише розміри словами — «3 feet by 2 feet by 2 feet»; наш текст стискає їх у " +
    "«(3×2×2 фути)». Величини ті самі, запис інший",
};

function findProseMismatches(row: CatalogRow): ProseFactMismatch[] {
  const counterpart = sourceByName.get(findLooseNameKey(row.engName));
  if (!counterpart) throw new Error(`${row.engName}: немає відповідника в XPHB`);

  return compareProseFacts(
    collectUkrainianProseFacts(row.description, row.engName),
    collectSourceProseFacts(counterpart, row.engName)
  );
}

function describeMismatches(row: CatalogRow): string {
  return `${row.engName}: ${findProseMismatches(row)
    .map((mismatch) => `${mismatch.kind} ${mismatch.value} (${mismatch.side})`)
    .join("; ")}`;
}

function findRow(engName: string): CatalogRow {
  const row = catalog.find((candidate) => candidate.engName === engName);
  if (!row) throw new Error(`${engName}: немає в каталозі 2024`);
  return row;
}

describe("проза звірених партій не розходиться з XPHB", () => {
  for (const [batch, names] of Object.entries(ALIGNED_WITH_XPHB)) {
    it(`${batch}: жоден звірений запис не втратив і не набув ознаки`, () => {
      const broken = names
        .filter((engName) => !(engName in KNOWN_PROSE_GAPS_2024))
        .map(findRow)
        .filter((row) => findProseMismatches(row).length > 0)
        .map(describeMismatches);

      expect(broken).toEqual([]);
    });
  }

  it("названі прогалини тексту досі існують — інакше їх пора прибрати з переліку", () => {
    const healed = Object.keys(KNOWN_PROSE_GAPS_2024).filter(
      (engName) => findProseMismatches(findRow(engName)).length === 0
    );

    expect(healed).toEqual([]);
  });
});

/// Мовчазне «не знаю такого терміна» — найгірший можливий результат: ознака зникає з обох
/// боків, і звірка бадьоро каже, що все гаразд. Ці перевірки і є те, що тримає розбирач
/// голосним.
describe("розбирач ознак падає на нерозпізнаному", () => {
  function buildSpell(entries: string[]): SourceSpell {
    return {
      kind: "spell",
      nameEng: "Проба",
      source: "XPHB",
      page: null,
      edition: "RULES_2024",
      level: 1,
      school: "V",
      raw: { entries },
    };
  }

  it("стан, якого немає в dictionary.json, зупиняє розбір", () => {
    expect(() =>
      collectSourceProseFacts(buildSpell(["gains the {@condition Bewildered|XPHB} condition"]), "Проба")
    ).toThrow(/Bewildered/u);
  });

  it("дія, якої немає в dictionary.json, зупиняє розбір", () => {
    expect(() =>
      collectSourceProseFacts(buildSpell(["takes the {@action Parry|XPHB} action"]), "Проба")
    ).toThrow(/Parry/u);
  });

  it("невідомий тег розмітки зупиняє розбір", () => {
    expect(() =>
      collectSourceProseFacts(buildSpell(["deals {@bogus 1d6} damage"]), "Проба")
    ).toThrow(/bogus/u);
  });
});

describe("ознаки читаються з обох боків", () => {
  it("число з одиницею впізнається і англійською, і українською", () => {
    const ours = collectUkrainianProseFacts("Ціль дістає темний зір на 150 футів.", "Проба");

    expect(ours).toContainEqual({ kind: "measure", value: "150 foot" });
  });

  it("характеристика ряткидка читається з української", () => {
    const ours = collectUkrainianProseFacts("Ціль робить рятівний кидок Статури.", "Проба");

    expect(ours).toContainEqual({ kind: "save", value: "Constitution" });
  });

  it("назва дії відрізняється від однокорінного звичайного слова великою літерою", () => {
    const action = collectUkrainianProseFacts("Істота бере дію Сховатися.", "Проба");
    const prose = collectUkrainianProseFacts("Ціль не може сховатися від вас.", "Проба");

    expect(action).toContainEqual({ kind: "action", value: "Hide" });
    expect(prose).toEqual([]);
  });

  it("тип шкоди читається лише впритул до слова «шкода»", () => {
    const damage = collectUkrainianProseFacts("Ціль отримує 2к6 некротичних ушкоджень.", "Проба");

    expect(damage).toContainEqual({ kind: "damageType", value: "Necrotic" });
  });

  it("зайве в нас видно так само, як відсутнє", () => {
    const mismatches = compareProseFacts(
      [{ kind: "measure", value: "60 foot" }],
      [{ kind: "measure", value: "150 foot" }]
    );

    expect(mismatches).toEqual([
      { kind: "measure", value: "150 foot", side: "тільки в XPHB" },
      { kind: "measure", value: "60 foot", side: "тільки в нас" },
    ]);
  });
});
