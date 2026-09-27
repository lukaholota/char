import { describe, expect, it } from "vitest";
import { findClassOptionSpellLabel, findSubclassFeatureSpellChoice } from "@/rules/class-option-spell-choices-2024";
import { buildFeatSpellFilter, findFeatSpellSelectionProblem } from "@/rules/feat-spell-choices";
import { isSpellChoiceCandidate } from "@/rules/spell-choice-filter";
import { listReachedSubclassFeatureSpellChoices2014 } from "@/rules/subclass-feature-spell-choices-2014";

const find2014 = (subclassName: string, classLevel: number) => findSubclassFeatureSpellChoice({ ruleset: "RULES_2014", subclassName, classLevel });

const spell = (spellId: number, level: number, school: string, spellLists: string[]) => ({ spellId, level, school, spellLists });

describe("O48 — риси підкласів 2014, що дають обрати заклинання", () => {
  it("кожна риса — на своєму рівні класу і ні на сусідньому", () => {
    const expected: [string, number, string][] = [
      ["NATURE_DOMAIN", 1, "Послідовник природи"],
      ["DEATH_DOMAIN", 1, "Жнець"],
      ["ARCANA_DOMAIN", 1, "Арканний адепт"],
      ["ARCANA_DOMAIN", 17, "Арканне оволодіння"],
      ["CIRCLE_OF_THE_LAND", 2, "Додаткове замовляння"],
      ["COLLEGE_OF_LORE", 6, "Додаткові магічні таємниці"],
      ["DIVINE_SOUL", 1, "Божественна магія"],
      ["ARCANE_ARCHER", 3, "Знання містичного лучника"],
    ];
    for (const [subclassName, classLevel, label] of expected) {
      expect(find2014(subclassName, classLevel)?.label).toBe(label);
      expect(find2014(subclassName, classLevel + 1)).toBeNull();
    }
    expect(find2014("LIFE_DOMAIN", 1)).toBeNull();
  });

  it("Послідовник природи — одне замовляння зі списку друїда; клірикове — ні", () => {
    const { rule, label } = find2014("NATURE_DOMAIN", 1)!;
    const candidates = [spell(1, 0, "TRANSMUTATION", ["Друїд"]), spell(2, 0, "EVOCATION", ["Клірик"]), spell(3, 1, "EVOCATION", ["Друїд"])];

    expect(findFeatSpellSelectionProblem(rule, [1], candidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [2], candidates, label)).toBe("Обране заклинання не підходить: Послідовник природи");
    expect(findFeatSpellSelectionProblem(rule, [3], candidates, label)).toBe("Обране заклинання не підходить: Послідовник природи");
    expect(findFeatSpellSelectionProblem(rule, [], candidates, label)).toBe("Оберіть 1 замовляння: Послідовник природи");
  });

  it("Жнець — замовляння некромантії з будь-якого списку", () => {
    const { rule, label } = find2014("DEATH_DOMAIN", 1)!;
    const candidates = [spell(1, 0, "NECROMANCY", ["Чарівник"]), spell(2, 0, "EVOCATION", ["Чарівник"])];

    expect(findFeatSpellSelectionProblem(rule, [1], candidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [2], candidates, label)).toBe("Обране заклинання не підходить: Жнець");
  });

  it("Арканне оволодіння — по одному заклинанню чарівника 6, 7, 8 і 9-го рівня", () => {
    const { rule, label } = find2014("ARCANA_DOMAIN", 17)!;
    const candidates = [6, 7, 8, 9].map((level) => spell(level, level, "EVOCATION", ["Чарівник"]));

    expect(rule.picks.map((pick) => [pick.spellLevel, pick.count])).toEqual([[6, 1], [7, 1], [8, 1], [9, 1]]);
    expect(findFeatSpellSelectionProblem(rule, [6, 7, 8, 9], candidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [6, 7, 8], candidates, label)).toBe("Оберіть 1 заклинання: Арканне оволодіння");
  });

  it("Додаткові магічні таємниці на 6-му рівні барда — два заклинання будь-якого класу до 3-го рівня", () => {
    const { rule, label } = find2014("COLLEGE_OF_LORE", 6)!;
    const candidates = [spell(1, 0, "EVOCATION", ["Клірик"]), spell(2, 3, "EVOCATION", ["Чарівник"]), spell(3, 4, "EVOCATION", ["Чарівник"])];

    expect(rule.picks).toEqual([{ count: 2, spellLevel: 0, maxSpellLevel: 3, schools: null, spellList: null }]);
    expect(findFeatSpellSelectionProblem(rule, [1, 2], candidates, label)).toBeNull();
    expect(findFeatSpellSelectionProblem(rule, [1, 3], candidates, label)).toBe("Обране заклинання не підходить: Додаткові магічні таємниці");
  });

  it("Божественна магія і Знання містичного лучника — лише закритий перелік", () => {
    const [soulPick] = find2014("DIVINE_SOUL", 1)!.rule.picks;
    const [archerPick] = find2014("ARCANE_ARCHER", 3)!.rule.picks;

    expect(soulPick.extraList?.spellEngNames).toEqual(["Cure Wounds", "Inflict Wounds", "Bless", "Bane", "Protection From Evil and Good"]);
    expect(archerPick.extraList?.spellEngNames).toEqual(["Prestidigitation", "Druidcraft"]);
    expect(isSpellChoiceCandidate(buildFeatSpellFilter(archerPick), spell(1, 0, "TRANSMUTATION", ["Знання містичного лучника"]))).toBe(true);
    expect(isSpellChoiceCandidate(buildFeatSpellFilter(archerPick), spell(2, 0, "TRANSMUTATION", ["Друїд"]))).toBe(false);
  });

  it("KR48.7 — пройдені рівні: клірик магії 16-го має лише Арканного адепта, 17-го — обидві риси", () => {
    const labels = (classLevel: number) => listReachedSubclassFeatureSpellChoices2014("ARCANA_DOMAIN", classLevel).map((choice) => choice.label);
    expect(labels(16)).toEqual(["Арканний адепт"]);
    expect(labels(17)).toEqual(["Арканний адепт", "Арканне оволодіння"]);
    expect(listReachedSubclassFeatureSpellChoices2014("COLLEGE_OF_LORE", 5)).toEqual([]);
  });

  it("бейдж рядка знає джерела 2014 за ключем", () => {
    expect(findClassOptionSpellLabel("Nature Domain: Acolyte of Nature (2014)")).toBe("Послідовник природи");
    expect(findClassOptionSpellLabel("Arcane Archer: Arcane Archer Lore (2014)")).toBe("Знання містичного лучника");
  });
});
