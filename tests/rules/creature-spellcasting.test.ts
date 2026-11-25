import { describe, expect, it } from "vitest";
import { buildCreatureSpellcasting, buildStatblockSpellcasting, describeCreatureSpellLevel, findDefaultSpellStats, planSpellFromDescription } from "@/rules/creature-spellcasting";
import { getAllCreatures } from "@/lib/bestiaryData";
import { getSpellByIdOrSlug } from "@/lib/spellsData";

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

const CATALOG = [
  { spellId: 10, name: "Вогняний заряд", engName: "Fire Bolt", level: 0 },
  { spellId: 11, name: "Вогнекуля", engName: "Fireball", level: 3 },
  { spellId: 12, name: "Щит", engName: "Shield", level: 1 },
];
const findCatalogSpell = (key: string) => CATALOG.find((spell) => spell.engName.toLowerCase().replace(" ", "-") === key);
const STATBLOCK = { ruleset: "RULES_2014" as const, specialAbilities: "", actions: "", intelligence: "17 (+3)", wisdom: "12 (+1)", charisma: "11 (+0)", proficiencyBonus: "+3" };

describe("заклинання з тексту статблока бестіарію", () => {
  it("абзац «Чаротворення» дає список, бонус, СК і рівень заклинача для замовлянь", () => {
    const specialAbilities = '<p><b>Чаротворення{{Spellcasting}}.</b> Маг — заклинач 9 рівня. (СК рятівного кидка від заклинань 14, +6 на влучання атаками заклинаннями).\n\nЗамовляння: <a href="/spells/fire-bolt">Вогняний заряд [Fire Bolt]</a>\n1 рівень: <a href="/spells/shield">Щит [Shield]</a>, <a href="/spells/fire-bolt">Вогняний заряд</a></p>';
    const casting = buildStatblockSpellcasting({ ...STATBLOCK, specialAbilities }, findCatalogSpell);
    expect(casting).toMatchObject({ attackBonus: 6, saveDc: 14, ruleset: "RULES_2014" });
    expect(casting?.spells.map((spell) => spell.name)).toEqual(["Вогняний заряд", "Щит"]);
    expect(casting?.spells[0].plan?.rolls[0]).toMatchObject({ count: 2, sides: 10 });
  });

  it("«версія 4 рівня» підсилює кидок, а бонус атаки без тексту — СК мінус 8", () => {
    const actions = '<p><b>Кинджал{{Dagger}}.</b> <a href="/2024/spells/shield">Щит</a></p><p><b>Чаротворення{{Spellcasting}}.</b> (СК заклинань 15): 2/день: <a href="/2024/spells/fireball">Вогнекуля [Fireball]</a> (версія 4 рівня).</p>';
    const casting = buildStatblockSpellcasting({ ...STATBLOCK, ruleset: "RULES_2024", actions }, findCatalogSpell);
    expect(casting).toMatchObject({ attackBonus: 7, saveDc: 15, ruleset: "RULES_2024" });
    expect(casting?.spells.map((spell) => spell.name)).toEqual(["Вогнекуля"]);
    expect(casting?.spells[0].plan?.rolls[0]).toMatchObject({ count: 9, sides: 6 });
  });

  it("без СК у тексті числа беруться з характеристик, а невідомі заклинання пропускаються", () => {
    const specialAbilities = '<p><b>Вроджене чаклування{{Innate Spellcasting}}.</b> 1/день: <a href="/spells/shield">Щит</a>, <a href="/spells/homebrew-x">Х</a></p>';
    const casting = buildStatblockSpellcasting({ ...STATBLOCK, specialAbilities }, findCatalogSpell);
    expect(casting).toMatchObject({ attackBonus: 6, saveDc: 14 });
    expect(casting?.spells).toHaveLength(1);
  });

  it("істота без абзацу чаротворення заклинань не має", () => {
    expect(buildStatblockSpellcasting({ ...STATBLOCK, actions: '<p><b>Удар{{Slam}}.</b> <a href="/spells/shield">Щит</a></p>' }, findCatalogSpell)).toBeNull();
  });

  it.each(["RULES_2014", "RULES_2024"] as const)("кожне посилання в чаротворенні істот каталогу %s знаходить заклинання", (ruleset) => {
    const casters = getAllCreatures(ruleset).filter((creature) => /\{\{[^}]*Spellcasting[^}]*\}\}/u.test(creature.specialAbilities + creature.actions + (creature.bonusActions ?? "")));
    const missing: string[] = [];
    const withSpells = casters.filter((creature) => buildStatblockSpellcasting({ ...creature, ruleset }, (key) => getSpellByIdOrSlug(key, ruleset) ?? void missing.push(`${creature.nameEng}: ${key}`)));
    expect(missing).toEqual([]);
    expect(withSpells.length).toBeGreaterThan(ruleset === "RULES_2014" ? 250 : 110);
  });
});
