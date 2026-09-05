import { describe, expect, it } from "vitest";
import type { CreatureIndexEntry } from "@/lib/bestiary-index";
import {
  CREATURE_SORT_MODES,
  DEFAULT_CREATURE_SORT,
  parseCreatureSortMode,
  sortCreatureIndex,
} from "@/lib/bestiary-sort";
import { getCreatureIndex } from "@/lib/bestiaryData";

function buildEntry(overrides: Partial<CreatureIndexEntry>): CreatureIndexEntry {
  return {
    key: "x",
    creatureId: 1,
    name: "Істота",
    nameEng: "Creature",
    type: "Звір",
    size: "Середній",
    challenge: "1",
    source: "MM",
    ac: "10",
    hp: "10",
    ...overrides,
  };
}

const SAMPLE: CreatureIndexEntry[] = [
  buildEntry({ creatureId: 1, name: "Дракон", type: "Дракон", challenge: "17" }),
  buildEntry({ creatureId: 2, name: "Дух демона", type: "Почвара (Демон)", challenge: "-" }),
  buildEntry({ creatureId: 3, name: "Щур", type: "Звір", challenge: "1/8" }),
  buildEntry({ creatureId: 4, name: "Вовк", type: "Звір", challenge: "1/4" }),
  buildEntry({ creatureId: 5, name: "Дух аберації", type: "Аберація", challenge: "—" }),
  buildEntry({ creatureId: 6, name: "Аболет", type: "Аберація", challenge: "10" }),
];

const readNames = (entries: CreatureIndexEntry[]) => entries.map((entry) => entry.name);

describe("сортування бестіарію", () => {
  it("за зростанням CR ставить дробові поперед цілих, а безCR-івських — у кінець", () => {
    expect(readNames(sortCreatureIndex(SAMPLE, "cr-asc", null))).toEqual([
      "Щур",
      "Вовк",
      "Аболет",
      "Дракон",
      "Дух аберації",
      "Дух демона",
    ]);
  });

  it("за спаданням CR перевертає лише тих, у кого CR є", () => {
    expect(readNames(sortCreatureIndex(SAMPLE, "cr-desc", null))).toEqual([
      "Дракон",
      "Аболет",
      "Вовк",
      "Щур",
      "Дух аберації",
      "Дух демона",
    ]);
  });

  it("за типом групує за базовим типом і всередині йде по CR", () => {
    expect(readNames(sortCreatureIndex(SAMPLE, "type", null))).toEqual([
      "Аболет",
      "Дух аберації",
      "Дракон",
      "Щур",
      "Вовк",
      "Дух демона",
    ]);
  });

  it("за абеткою впорядковує українською", () => {
    expect(readNames(sortCreatureIndex(SAMPLE, "name", null))).toEqual([
      "Аболет",
      "Вовк",
      "Дракон",
      "Дух аберації",
      "Дух демона",
      "Щур",
    ]);
  });

  it("до монтування лишає порядок каталогу, бо сторінка статична", () => {
    expect(readNames(sortCreatureIndex(SAMPLE, "random", null))).toEqual(readNames(SAMPLE));
  });

  it("та сама сіянка дає ту саму перестановку, різні — різні", () => {
    const first = readNames(sortCreatureIndex(SAMPLE, "random", 12345));
    const again = readNames(sortCreatureIndex(SAMPLE, "random", 12345));
    const other = readNames(sortCreatureIndex(SAMPLE, "random", 999));

    expect(again).toEqual(first);
    expect(first).not.toEqual(readNames(SAMPLE));
    expect(other).not.toEqual(first);
  });

  it("перемішування нікого не губить і не дублює", () => {
    const shuffled = sortCreatureIndex(SAMPLE, "random", 7);

    expect(shuffled).toHaveLength(SAMPLE.length);
    expect(new Set(shuffled.map((entry) => entry.creatureId))).toEqual(
      new Set(SAMPLE.map((entry) => entry.creatureId))
    );
  });

  it("не чіпає вхідний масив", () => {
    const before = readNames(SAMPLE);
    sortCreatureIndex(SAMPLE, "cr-desc", null);
    sortCreatureIndex(SAMPLE, "random", 3);

    expect(readNames(SAMPLE)).toEqual(before);
  });

  it("невідомий режим з адреси відкочується на типовий", () => {
    expect(parseCreatureSortMode(null)).toBe(DEFAULT_CREATURE_SORT);
    expect(parseCreatureSortMode("hp-desc")).toBe(DEFAULT_CREATURE_SORT);
    expect(parseCreatureSortMode("cr-asc")).toBe("cr-asc");
  });

  it.each(["RULES_2014", "RULES_2024"] as const)(
    "на справжньому каталозі %s жоден режим не втрачає істот, а безCR-івські тонуть у кінець",
    (ruleset) => {
      const index = getCreatureIndex(ruleset);

      for (const { mode } of CREATURE_SORT_MODES) {
        const sorted = sortCreatureIndex(index, mode, 42);
        expect(sorted).toHaveLength(index.length);
      }

      for (const mode of ["cr-asc", "cr-desc"] as const) {
        const sorted = sortCreatureIndex(index, mode, null);
        const firstWithoutCR = sorted.findIndex((entry) => isMissingChallenge(entry.challenge));
        if (firstWithoutCR === -1) continue;

        expect(sorted.slice(firstWithoutCR).every((entry) => isMissingChallenge(entry.challenge))).toBe(
          true
        );
      }
    }
  );
});

function isMissingChallenge(challenge: string): boolean {
  const raw = challenge.trim();
  return !raw || raw === "-" || raw === "—";
}
