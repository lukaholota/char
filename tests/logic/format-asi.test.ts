import { describe, expect, it } from "vitest";

import { formatASI, formatCatalogASI } from "@/lib/components/characterCreator/infoUtils";

describe("formatASI — підпис бонусів характеристик", () => {
  it("фіксовані бонуси перекладає й підписує «Фіксовано»", () => {
    expect(formatASI({ basic: { simple: { CON: 2 } } })).toBe("Фіксовано: Статура +2");
  });

  it("простий словник без basic/tasha теж читає", () => {
    expect(formatASI({ DEX: 2 })).toBe("Фіксовано: Спритність +2");
  });

  it("окремі гнучкі групи basic і tasha показує обидві", () => {
    const asi = {
      basic: {
        simple: { STR: 2 },
        flexible: { groups: [{ groupName: "+1 до Однієї", value: 1, choiceCount: 1 }] },
      },
      tasha: {
        flexible: { groups: [{ groupName: "+2 до Однієї", value: 2, choiceCount: 1 }] },
      },
    };

    expect(formatASI(asi)).toBe(
      "Фіксовано: Сила +2 • Гнучко: +1 до Однієї (+1, оберіть 1) • За Ташею: +2 до Однієї (+2, оберіть 1)"
    );
  });

  /// Своя раса тримає лише `tasha`. `normalizeRaceASI` дзеркалить її в `basic`, щоб конструктор
  /// дав вибір, — але для підпису це те саме число двічі.
  it("раса лише з tasha не дублює той самий бонус двома рядками", () => {
    const asi = {
      tasha: {
        flexible: { groups: [{ groupName: "+2 до Однієї", value: 2, choiceCount: 1 }] },
      },
    };

    expect(formatASI(asi)).toBe("За Ташею: +2 до Однієї (+2, оберіть 1)");
  });

  it("шість однакових бонусів згортає в «+1 до всіх»", () => {
    const human = { basic: { simple: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 } } };
    expect(formatASI(human)).toBe("Фіксовано: +1 до всіх");
    expect(formatASI({ STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1 })).not.toContain("до всіх");
  });

  it("порожній ASI дає прочерк", () => {
    expect(formatASI(null)).toBe("—");
  });
});

/// Рішення власника 2026-09-02: каталог рас не показує варіант «за Ташею».
describe("formatCatalogASI — підпис для каталогу рас", () => {
  it("ховає «За Ташею», коли раса має власний фіксований бонус", () => {
    const dwarf = {
      basic: { simple: { CON: 2 } },
      tasha: { flexible: { groups: [{ groupName: "+2 до Однієї", value: 2, choiceCount: 1 }] } },
    };
    expect(formatCatalogASI(dwarf)).toBe("Фіксовано: Статура +2");
  });

  it("власну гнучку групу лишає й пише без дужок", () => {
    const halfElf = {
      basic: {
        simple: { CHA: 2 },
        flexible: { groups: [{ groupName: "+1 до Двох", value: 1, choiceCount: 2 }] },
      },
      tasha: { flexible: { groups: [{ groupName: "+2 до Однієї", value: 2, choiceCount: 1 }] } },
    };
    expect(formatCatalogASI(halfElf)).toBe("Фіксовано: Харизма +2 • Гнучко: +1 до Двох");
  });

  it("раса лише з гнучким бонусом показує його як правило, а не як варіант", () => {
    const multiverse = {
      tasha: {
        flexible: {
          groups: [
            { groupName: "+1 до Двох", value: 1, choiceCount: 2 },
            { groupName: "+1 до Однієї", value: 1, choiceCount: 1 },
          ],
        },
      },
    };
    expect(formatCatalogASI(multiverse)).toBe("Гнучко: +1 до Двох, +1 до Однієї");
  });

  it("людина — «+1 до всіх» без хвоста", () => {
    const human = {
      basic: { simple: { STR: 1, DEX: 1, CON: 1, INT: 1, WIS: 1, CHA: 1 } },
      tasha: { flexible: { groups: [{ groupName: "+1 до Шести", value: 1, choiceCount: 6 }] } },
    };
    expect(formatCatalogASI(human)).toBe("Фіксовано: +1 до всіх");
  });
});
