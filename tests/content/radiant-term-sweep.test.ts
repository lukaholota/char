import { describe, expect, it } from "vitest";
import dictionary from "@/lib/refs/dictionary.json";
import {
  countRadiantByCarrier,
  findRadiantOccurrences,
} from "../../scripts/terms/radiant-occurrences";

/// KR17.5, зачистка `radiant`. Перелік носіїв розширено 2026-09-04: попередній вимірював
/// одинадцять файлів і бачив лише велике «Світлом», тож вісім комірок пережили зачистку —
/// пʼять підкласових рис у `subclassFeatureSeed.ts`, дві риси аазимара й Талісман чистого
/// добра з малим «шкоди світлом». Сідові джерела й успадковані статблоки тепер теж носії:
/// поки форма лежить у файлі, її поверне перший же повний ресід.
const EXPECTED_BY_CARRIER: Record<string, number> = {
  "src/lib/generated/creatures.json": 0,
  "src/lib/generated/creatures2024.json": 0,
  "src/lib/generated/classes.json": 0,
  "src/lib/generated/magicItems.json": 0,
  "src/lib/generated/spells.json": 0,
  "src/lib/generated/infusions.json": 0,
  "src/lib/generated/rules-2024.json": 0,
  "data/2024/normalized/spells.json": 0,
  "data/2024/normalized/magic-items.json": 0,
  "data/2024/normalized/invocations.json": 0,
  "data/2024/normalized/feats.json": 0,
  "data/2024/normalized/species.json": 0,
  "data/2024/normalized/subclasses.json": 0,
  "data/2024/normalized/class-choices.json": 0,
  "src/lib/generated/races.json": 0,
  "src/lib/generated/creator-content-2014.json": 0,
  "src/lib/generated/creator-content-2024.json": 0,
  "prisma/seed/magic-items/baseline.json": 0,
  "prisma/seed/subclassFeatureSeed.ts": 0,
  "scripts/data/monsters-fizban.ts": 0,
  "scripts/data/monsters-volo.ts": 0,
};

describe("KR17.5 — зачистка «Світлом» і «променист-»", () => {
  it("тримає поточний обсяг у кожному носії", () => {
    expect(countRadiantByCarrier()).toEqual(EXPECTED_BY_CARRIER);
  });

  it("не лишає жодного входження в жодному носії", () => {
    const total = Object.values(EXPECTED_BY_CARRIER).reduce((sum, n) => sum + n, 0);
    expect(findRadiantOccurrences()).toHaveLength(total);
  });

  /// Крок 1 закрито 2026-08-28: пʼять fields-обходів (`Deva`, `Planetar`, `Solar`,
  /// `Zariel`, `Дух дракона`) переписано, і механічні поля статблока більше не мають
  /// знятої форми. Саме це дозволило звузити словник, не чекаючи на прозу.
  it("не лишає знятої форми в механічних полях статблока", () => {
    expect(findRadiantOccurrences().filter((o) => o.isStatblockField)).toEqual([]);
  });

  it("тримає звужений словник — канон Р21 без запасного варіанта", () => {
    expect(dictionary.DND_DICTIONARY.damageTypes.radiant).toBe("Променева");
    expect(dictionary.DND_DICTIONARY.classFeatures2024.radiantStrikes).toBe("Променеві удари");
  });
});
