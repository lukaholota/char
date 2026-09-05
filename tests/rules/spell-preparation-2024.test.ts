import { describe, expect, it } from "vitest";
import { findMaxPreparableSpellLevelByClass, findPreparableSpellLevelBySpellList, findSpellCounts2024 } from "@/rules/spell-preparation-2024";

describe("KR27.7 — найвищий рівень підготовки за класом, не за слотом персонажа", () => {
  it("Чарівник 4 / Клірик 4: слот 4-го рівня є, а готують обидва лише 2-й (№21)", () => {
    expect(findMaxPreparableSpellLevelByClass({ WIZARD_2024: 4, CLERIC_2024: 4 }, {})).toEqual({ WIZARD_2024: 2, CLERIC_2024: 2 });
  });

  it("Пройдисвіт 4 (Містичний спритник) / Бард 4: третинний підклас готує 1-й, бард — 2-й (№18)", () => {
    expect(findMaxPreparableSpellLevelByClass({ ROGUE_2024: 4, BARD_2024: 4 }, { ROGUE_2024: "ARCANE_TRICKSTER" })).toEqual({
      ROGUE_2024: 1,
      BARD_2024: 2,
    });
  });

  it("клас без чаклунства не потрапляє в результат: Воїн 6 / Пройдисвіт 4 без підкласів-заклиначів (№14)", () => {
    expect(findMaxPreparableSpellLevelByClass({ FIGHTER_2024: 6, ROGUE_2024: 4 }, { FIGHTER_2024: "CHAMPION", ROGUE_2024: "THIEF" })).toEqual({});
  });

  it("лічильники 2024 фіксовані таблицею: Друїд 5 — 3 замовляння, 9 підготовлених, до 3-го рівня", () => {
    expect(findSpellCounts2024("DRUID_2024", 5, "CIRCLE_OF_THE_SEA")).toEqual({ cantrips: 3, prepared: 9, maxSpellLevel: 3 });
  });

  it("Лицар-Чаклун на 3-му рівні воїна: 2 замовляння, 3 підготовлених, 1-й рівень; на 2-му — рядка ще немає", () => {
    expect(findSpellCounts2024("FIGHTER_2024", 3, "ELDRITCH_KNIGHT")).toEqual({ cantrips: 2, prepared: 3, maxSpellLevel: 1 });
    expect(findSpellCounts2024("FIGHTER_2024", 2, null)).toBeNull();
  });
});

describe("KR27.7 — стеля для каталогу ключується списком заклинань", () => {
  it("Воїн 7 (Лицар-Чаклун) / Чарівник 1: обидва беруть зі списку чарівника, стеля — більша з двох", () => {
    expect(findPreparableSpellLevelBySpellList({ FIGHTER_2024: 7, WIZARD_2024: 1 }, { FIGHTER_2024: "ELDRITCH_KNIGHT", WIZARD_2024: null })).toEqual({
      WIZARD_2024: 2,
    });
  });
});
