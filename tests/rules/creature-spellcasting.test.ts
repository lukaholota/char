import { describe, expect, it } from "vitest";
import { buildCreatureSpellcasting, describeCreatureSpellLevel, findDefaultSpellStats, planSpellFromDescription } from "@/rules/creature-spellcasting";

const CASTER = { mentalScores: [10, 18, 12], proficiencyBonus: 3, attackBonus: null, saveDc: null, casterLevel: null };

describe("заклинання монстрів", () => {
  it("рівень підписаний словом, а нульовий — замовляння", () => {
    expect(describeCreatureSpellLevel(0)).toBe("Замовляння");
    expect(describeCreatureSpellLevel(7)).toBe("7-й рівень");
  });

  it("автоматичні числа беруть найкращу розумову характеристику", () => {
    expect(findDefaultSpellStats([10, 18, 12], 3)).toEqual({ attackBonus: 7, saveDc: 15 });
  });

  it("власні бонус і СК переважають автоматичні", () => {
    const casting = buildCreatureSpellcasting([], "RULES_2014", { ...CASTER, attackBonus: 11, saveDc: 19 });
    expect(casting).toMatchObject({ attackBonus: 11, saveDc: 19, ruleset: "RULES_2014" });
  });

  it("заклинання до 3-го рівня кидається за таблицею", () => {
    const [fireball] = buildCreatureSpellcasting([{ spellId: 1, name: "Вогняна куля", engName: "Fireball", level: 3 }], "RULES_2014", CASTER).spells;
    expect(fireball.plan).toMatchObject({ attack: false, save: "DEX", rolls: [{ count: 8, sides: 6 }] });
  });

  it("шкода замовляння росте з рівнем заклинача", () => {
    const fireBolt = { spellId: 2, name: "Вогняний снаряд", engName: "Fire Bolt", level: 0 };
    const planAtLevel = (casterLevel: number) => buildCreatureSpellcasting([fireBolt], "RULES_2014", { ...CASTER, casterLevel }).spells[0].plan?.rolls[0];
    expect(planAtLevel(1)).toMatchObject({ count: 1, sides: 10 });
    expect(planAtLevel(11)).toMatchObject({ count: 3, sides: 10 });
  });

  it("заклинання 7-го рівня без таблиці читається з опису", () => {
    const description = "<p>Ціль робить ряткидок Статури. Вона отримує 7к8 + 30 некротичної шкоди.</p>";
    const [spell] = buildCreatureSpellcasting([{ spellId: 3, name: "Перст смерті", engName: "Homebrew Finger", level: 7, description }], "RULES_2014", CASTER).spells;
    expect(spell.plan).toMatchObject({ save: "CON", rolls: [{ label: "Шкода", count: 7, sides: 8, bonus: 30 }] });
  });

  it("заклинання без тексту не має кидків", () => {
    expect(buildCreatureSpellcasting([{ spellId: 4, name: "Тиша", engName: "Homebrew Silence", level: 8, description: null }], "RULES_2014", CASTER).spells[0].plan).toBeNull();
  });
});

describe("кидки з опису заклинання", () => {
  it("атака заклинанням без шкоди — лише атака", () => {
    expect(planSpellFromDescription("Здійсніть рукопашну атаку заклинанням по цілі.")).toMatchObject({ attack: true, save: null, rolls: [] });
  });

  it("рядок про вищий рівень комірки не стає окремим кидком", () => {
    const plan = planSpellFromDescription("Ціль отримує 8к8 шкоди холодом. Коли накладаєте його в комірці вищого рівня, шкода зростає на 1к8.");
    expect(plan?.rolls).toHaveLength(1);
  });

  it("лікування додає модифікатор заклинача", () => {
    const plan = planSpellFromDescription("Кожна істота відновлює ХП, що дорівнюють 3к8 + модифікатору вашої чаротворчої здібності.", 4);
    expect(plan?.rolls[0]).toMatchObject({ label: "Лікування", count: 3, sides: 8, bonus: 4 });
  });

  it("однаковий кубик у двох реченнях показується один раз", () => {
    const plan = planSpellFromDescription("Ціль отримує 5к10 шкоди. Наприкінці ходу вона знову отримує 5к10 шкоди.");
    expect(plan?.rolls).toHaveLength(1);
  });

  it("не більше трьох кидків", () => {
    const plan = planSpellFromDescription("Шкода 1к4, 1к6, 1к8 і 1к10.");
    expect(plan?.rolls.map((roll) => roll.sides)).toEqual([4, 6, 8]);
  });

  it("опис без кубиків, атаки й ряткидка — кидати нічого", () => {
    expect(planSpellFromDescription("<p>Ціль відновлює 70 ХП.</p>")).toBeNull();
  });
});
