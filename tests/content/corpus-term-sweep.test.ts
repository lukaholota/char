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
  /// 2026-09-14: 32 → 26. KR33.7 замінив шість самописних описів підкласів 2014 («чари»,
  /// «ушкоджень» у Домені аркани, Магічному лучнику, Архіфеї, Невмирущому, Причаруванні, Ілюзії).
  "src/lib/generated/creator-content-2014.json": 26,
  /// 2026-09-06: 18 → 27. Носій перезібрали з підкласів 2024, і разом із новим контентом
  /// приїхали дев'ять знятих форм — «ушкоджень», «КЗ», «блок характеристик/статистик».
  /// Гейт побачив це першим же прогоном; звід — KR32.3.
  /// 2026-09-26: 27 → 35. KR43.8 поставив 55 легасі-підкласів під класи 2024, і їхні риси —
  /// ті самі рядки 2014, що в `creator-content-2014.json`; вісім форм приїхали з ними. Звід — KR32.3.
  "src/lib/generated/creator-content-2024.json": 35,
  "src/lib/refs/translation.ts": 0,
  /// 2026-09-14: 7 → 4. «Клас небезпеки (CR)» у статті про блок характеристик монстра →
  /// «Показник небезпеки (ПН)», три входження.
  "src/lib/rulesData.ts": 4,
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
