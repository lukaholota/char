import { describe, expect, it } from "vitest";
import {
  countCorpusTermsByCarrier,
  findCorpusTermOccurrences,
} from "../../scripts/terms/corpus-term-occurrences";

/// KR32.1: перелік — виміряний обсяг на день підключення носія до гейту, а не доказ, що
/// восьмого написання чи наступного запису більше немає ([Р21](../../docs/DECISIONS.md#р21),
/// той самий принцип, що вивів `radiant-term-sweep.test.ts` на чотирнадцять гілок). Звід цих
/// носіїв до нуля — окрема робота ([KR32.2](../../docs/o32-corpus-terms/README.md)–KR32.6),
/// не цей KR: тут головне, щоб регресія в будь-якому з носіїв стала видимою.
const EXPECTED_BY_CARRIER: Record<string, number> = {
  "src/lib/generated/creator-content-2014.json": 32,
  "src/lib/generated/creator-content-2024.json": 18,
  "src/lib/refs/translation.ts": 0,
  "src/lib/rulesData.ts": 7,
  "src/lib/generated/bastions.json": 0,
  "src/lib/generated/traps-hazards.json": 0,
  "src/lib/generated/objects.json": 0,
  "src/lib/generated/rules-2014.json": 3,
  "src/lib/generated/rules-2024.json": 37,
  "src/lib/generated/rules-beyond-srd.json": 6,
  "data/2024/normalized/magic-items.json": 76,
};

describe("KR32.1 — терміни поза каталогом заклинань, носії без гейта", () => {
  it("тримає поточний обсяг у кожному носії", () => {
    expect(countCorpusTermsByCarrier()).toEqual(EXPECTED_BY_CARRIER);
  });

  it("не лишає жодного входження понад виміряний обсяг", () => {
    const total = Object.values(EXPECTED_BY_CARRIER).reduce((sum, n) => sum + n, 0);
    expect(findCorpusTermOccurrences()).toHaveLength(total);
  });
});
