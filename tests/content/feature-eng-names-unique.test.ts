import { describe, it, expect } from "vitest";
import {
  collectSeedFeatureNames,
  findDuplicateEngNames,
} from "../../scripts/collect-seed-feature-names";

/// `Feature.engName` унікальний на всю базу (schema.prisma), а сіди роблять
/// `upsert({ where: { engName } })`. Тому дві різні риси з однаковою англійською назвою — це не
/// дві риси, а один рядок: той, хто засідився останнім, стирає текст першого, і обидва власники
/// показують чужу механіку. Саме так Бард / Колегія шепотів показував риси Ножа душі
/// (D-001, знайдено з поста на Reddit 2026-08-28).
describe("англійські назви рис у сідах унікальні", () => {
  const names = collectSeedFeatureNames();

  it("сіди рис узагалі читаються", () => {
    expect(names.length).toBeGreaterThan(1000);
  });

  it("жодна англійська назва не належить двом рисам", () => {
    const duplicates = findDuplicateEngNames(names).map(([engName, places]) => ({
      engName,
      places: places.map((place) => `${place.file}:${place.line}`),
    }));

    expect(duplicates).toEqual([]);
  });
});
