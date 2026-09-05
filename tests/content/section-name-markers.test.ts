import { describe, expect, it } from "vitest";
import {
  CATALOGS,
  buildMarkedName,
  carriesBracketedOriginal,
  collectBatchSectionNames,
  collectCatalogSectionNames,
  collectImportedCreatureIds,
  describeCatalogSectionName,
  describeSectionName,
  findBracketedOriginalBatchSectionNames,
  findUnmarkedBatchSectionNames,
  findUnmarkedImportedCatalogSectionNames,
  hasMarkerOnName,
} from "../../scripts/terms/section-name-markers";

/// Зведено 2026-09-02 (KR30.2). Назва риси чи дії несе `{{English}}` на першій згадці в записі
/// незалежно від ратифікації — уточнення власника до [Р20](../../docs/DECISIONS.md#р20). До
/// зачистки в партіях обох конвеєрів було 7 974 назви секцій, з них 1 393 з маркером; конвеєр
/// aidedd не мав жодного. Оригінал є для кожної: у 5etools — у пінованому статблоці, в aidedd —
/// на кешованій сторінці, за тим самим індексом секції, за яким конвеєр зшиває переклад.
/// Сторож стоїть і на джерелах, і на каталогах ([Р33](../../docs/DECISIONS.md#р33)): правити
/// дозволено лише партію, а каталог доводить, що збірка правку донесла.
const batchNames = collectBatchSectionNames();

describe("маркер оригіналу на назвах рис і дій (Р20, O30)", () => {
  it("ловить голу назву й ставить маркер перед дужковим хвостом — інакше нулі нижче нічого не доводять", () => {
    expect(hasMarkerOnName("Легендарний опір (3/день)")).toBe(false);
    expect(hasMarkerOnName("Легендарний опір{{Legendary Resistance}} (3/день)")).toBe(true);
    expect(hasMarkerOnName("Чаротворення (Псіоніка{{Psionics}})")).toBe(false);

    expect(buildMarkedName("Легендарний опір (3/день)", "Legendary Resistance (3/Day)")).toBe(
      "Легендарний опір{{Legendary Resistance}} (3/день)"
    );
    expect(buildMarkedName("Хауда", "Howdah")).toBe("Хауда{{Howdah}}");
    expect(buildMarkedName("Мультиатака", "Multiattack (Lizardfolk Form Only)")).toBe(
      "Мультиатака{{Multiattack (Lizardfolk Form Only)}}"
    );

    expect(carriesBracketedOriginal("Чарівний камінь [Magic Stone]")).toBe(true);
    expect(carriesBracketedOriginal("Чарівний камінь{{Magic Stone}}")).toBe(false);
  });

  it("не лишає голої назви секції в жодній партії обох конвеєрів", () => {
    expect(findUnmarkedBatchSectionNames(batchNames).map(describeSectionName)).toEqual([]);
  });

  /// Заклинання в назві дії пишеться своїм форматом — `Чарівний камінь [Magic Stone]`, завжди з
  /// англійською у квадратних дужках (власник, 2026-09-02: «спели це виняток»). Маркер `{{…}}`
  /// сюди не дописується — оригінал уже стоїть, — а дужки не знімаються ніколи. Перелік
  /// закритий, щоб нова така назва не пройшла непоміченою; п'ята — «Посох сили», предмет тим
  /// самим форматом.
  it("тримає рівно пʼять назв заклинань і предметів з [English] у квадратних дужках", () => {
    expect(
      findBracketedOriginalBatchSectionNames(batchNames).map((name) => `${name.slug} ${name.section}[${name.index}]`)
    ).toEqual([
      "black-gauntlet-of-bane actions[2]",
      "fensir-skirmisher actions[2]",
      "bheur-hag traits[0]",
      "cloud-giant-smiling-one traits[0]",
      "manshoon actions[1]",
    ]);
  });

  it("везе маркер до обох каталогів: жодної голої назви секції в імпортованих записах", () => {
    for (const catalog of CATALOGS) {
      expect(
        findUnmarkedImportedCatalogSectionNames(catalog.path, catalog.edition).map(describeCatalogSectionName)
      ).toEqual([]);
    }
  });

  /// Успадковані `.ts` 2014 і рукописні духи 2024 тримають назви секцій без оригіналу у файлі:
  /// там маркер — перекладацька робота, не суфікс. Виміряно 2026-09-02; імпорт тільки заміщає
  /// успадковані записи, тож число може лише меншати.
  it("називає носії без оригіналу поіменно — успадковані записи, і їх не більшає", () => {
    const measured = { RULES_2014: { names: 83, creatures: 28 }, RULES_2024: { names: 71, creatures: 23 } };

    for (const catalog of CATALOGS) {
      const imported = collectImportedCreatureIds(catalog.edition);
      const legacy = collectCatalogSectionNames(catalog.path).filter((name) => !imported.has(name.creatureId));
      expect(legacy.filter((name) => name.marked)).toEqual([]);
      expect(legacy.length).toBeLessThanOrEqual(measured[catalog.edition].names);
      expect(new Set(legacy.map((name) => name.creatureId)).size).toBeLessThanOrEqual(
        measured[catalog.edition].creatures
      );
    }
  });
});
