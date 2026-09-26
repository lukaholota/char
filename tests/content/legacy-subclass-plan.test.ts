import { describe, expect, it } from "vitest";

import {
  LegacySubclassSource,
  diffLegacySubclass,
  isLegacySubclassDiffEmpty,
  planLegacySubclass,
} from "../../prisma/seed/helpers/legacySubclassPlan";

const SUBCLASS_LEVEL_2024 = 3;

const genie2014: LegacySubclassSource = {
  subclass: "THE_GENIE",
  description: "Покровитель-джин",
  languages: [],
  languagesToChooseCount: 0,
  toolProficiencies: [],
  toolToChooseCount: null,
  armorProficiencies: [],
  weaponProficiencies: null,
  features: [
    { featureId: 101, engName: "Genie's Vessel", levelGranted: 1, grantsSpellSlots: false },
    { featureId: 102, engName: "Expanded Spell List (The Genie)", levelGranted: 1, grantsSpellSlots: false },
    { featureId: 103, engName: "Elemental Gift", levelGranted: 6, grantsSpellSlots: false },
    { featureId: 104, engName: "Sanctuary Vessel", levelGranted: 10, grantsSpellSlots: false },
    { featureId: 105, engName: "Limited Wish", levelGranted: 14, grantsSpellSlots: false },
  ],
  choiceOptions: [
    { choiceOptionId: 201, levelsGranted: [1] },
    { choiceOptionId: 202, levelsGranted: [1] },
  ],
  spells: [],
};

const hexblade2014: LegacySubclassSource = {
  ...genie2014,
  subclass: "HEXBLADE",
  armorProficiencies: ["MEDIUM", "SHIELD"],
  weaponProficiencies: ["MARTIAL_WEAPON"],
  features: [{ featureId: 301, engName: "Hexblade's Curse", levelGranted: 1, grantsSpellSlots: false }],
  choiceOptions: [],
};

describe("O43 — план легасі-підкласу", () => {
  const genie = planLegacySubclass(genie2014, "WARLOCK_2024", SUBCLASS_LEVEL_2024);

  it("риси — ті самі рядки 2014, а все нижче 3-го рівня приходить на 3-му", () => {
    expect(genie.features.map((feature) => [feature.featureId, feature.levelGranted])).toEqual([
      [101, 3],
      [102, 3],
      [103, 6],
      [104, 10],
      [105, 14],
    ]);
  });

  it("вибір роду джина — ті самі опції, на 3-му рівні", () => {
    expect(genie.choiceOptions).toEqual([
      { choiceOptionId: 201, levelsGranted: [3] },
      { choiceOptionId: 202, levelsGranted: [3] },
    ]);
  });

  it("рядок — підклас 2024 без власного чаклування, як усі підкласи 2024", () => {
    expect(genie.row).toMatchObject({
      name: "THE_GENIE",
      ruleset: "RULES_2024",
      spellcastingType: "NONE",
      grantsSpells: false,
      primaryCastingStat: null,
      description: "Покровитель-джин",
    });
  });

  it("володіння Відьмацького клинка переносяться без змін", () => {
    const hexblade = planLegacySubclass(hexblade2014, "WARLOCK_2024", SUBCLASS_LEVEL_2024);

    expect(hexblade.row.armorProficiencies).toEqual(["MEDIUM", "SHIELD"]);
    expect(hexblade.row.weaponProficiencies).toEqual(["MARTIAL_WEAPON"]);
    expect(hexblade.features).toEqual([{ featureId: 301, engName: "Hexblade's Curse", levelGranted: 3, grantsSpellSlots: false }]);
  });
});

describe("O43 — заміна риси розширеного списку (KR43.5)", () => {
  it("риса 2014 зі списком 2014 виходить, риса 2024 приходить на рівні підкласу", () => {
    const plan = planLegacySubclass(genie2014, "WARLOCK_2024", SUBCLASS_LEVEL_2024, {
      expandedSpells: { replaces: "Expanded Spell List (The Genie)", featureId: 900, engName: "The Genie: Expanded Spell List (legacy 2024)" },
    });

    expect(plan.features.map((feature) => [feature.featureId, feature.levelGranted])).toEqual([
      [101, 3],
      [103, 6],
      [104, 10],
      [105, 14],
      [900, 3],
    ]);
  });

  it("риси, яку треба замінити, у підкласу 2014 немає — план падає, а не мовчить", () => {
    expect(() =>
      planLegacySubclass(genie2014, "WARLOCK_2024", SUBCLASS_LEVEL_2024, { expandedSpells: { replaces: "Genie Expanded Spells", featureId: 900, engName: "x" } }),
    ).toThrow("нема чого замінювати");
  });
});

describe("O43 — домен жерця під класом 2024 (KR43.8)", () => {
  const death2014: LegacySubclassSource = {
    ...genie2014,
    subclass: "DEATH_DOMAIN",
    features: [
      { featureId: 401, engName: "Reaper", levelGranted: 1, grantsSpellSlots: false },
      { featureId: 402, engName: "Channel Divinity: Touch of Death", levelGranted: 2, grantsSpellSlots: false },
      { featureId: 403, engName: "Divine Strike (Death)", levelGranted: 8, grantsSpellSlots: false },
      { featureId: 404, engName: "Improved Reaper", levelGranted: 17, grantsSpellSlots: false },
    ],
    choiceOptions: [],
    spells: [
      { spellId: 501, classLevel: 1 },
      { spellId: 502, classLevel: 5 },
    ],
  };

  it("риса 8-го рівня, якої немає в XPHB-копії, не привʼязується; 1-й і 2-й рівні приходять на 3-му", () => {
    const plan = planLegacySubclass(death2014, "CLERIC_2024", SUBCLASS_LEVEL_2024, { removedFeatures: ["Divine Strike (Death)"] });

    expect(plan.features.map((feature) => [feature.engName, feature.levelGranted])).toEqual([
      ["Reaper", 3],
      ["Channel Divinity: Touch of Death", 3],
      ["Improved Reaper", 17],
    ]);
  });

  it("заклинання домену 1-го рівня класу приходять на 3-му, решта — на своїх", () => {
    const plan = planLegacySubclass(death2014, "CLERIC_2024", SUBCLASS_LEVEL_2024);

    expect(plan.spells).toEqual([
      { spellId: 501, classLevel: 3 },
      { spellId: 502, classLevel: 5 },
    ]);
  });

  it("риси, яку треба прибрати, у підкласу 2014 немає — план падає, а не мовчить", () => {
    expect(() => planLegacySubclass(death2014, "CLERIC_2024", SUBCLASS_LEVEL_2024, { removedFeatures: ["Divine Strike"] })).toThrow("нема чого прибирати");
  });
});

describe("O43 — різниця плану з базою", () => {
  const genie = planLegacySubclass(genie2014, "WARLOCK_2024", SUBCLASS_LEVEL_2024);

  it("без рядка в базі — створити все", () => {
    const diff = diffLegacySubclass(genie, null);

    expect(diff.row).toBe("create");
    expect(diff.features.upsert).toHaveLength(5);
    expect(diff.choiceOptions.upsert).toHaveLength(2);
  });

  it("записаний план — порожня різниця, навіть із іншим порядком ключів", () => {
    const stored = { row: { ...genie.row }, features: [...genie.features].reverse(), choiceOptions: genie.choiceOptions, spells: [] };
    const reordered = { ...stored, row: Object.fromEntries(Object.entries(stored.row).reverse()) as typeof stored.row };

    expect(isLegacySubclassDiffEmpty(diffLegacySubclass(genie, reordered))).toBe(true);
  });

  it("звʼязок, якого немає в плані, прибирається; змінений рівень — оновлюється", () => {
    const stored = {
      row: genie.row,
      features: [...genie.features.slice(1), { featureId: 999, engName: "Stale", levelGranted: 3, grantsSpellSlots: false }, { ...genie.features[0], levelGranted: 1 }],
      choiceOptions: genie.choiceOptions,
      spells: [],
    };
    const diff = diffLegacySubclass(genie, stored);

    expect(diff.row).toBeNull();
    expect(diff.features.upsert).toEqual([genie.features[0]]);
    expect(diff.features.remove.map((link) => link.featureId)).toEqual([999]);
  });
});
