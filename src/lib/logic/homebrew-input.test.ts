import { describe, expect, it } from "vitest";
import { buildCreatureStatBlock, parseHomebrewCreatureInput, parseHomebrewSpellInput, readCreatureInputFromStatBlock } from "./homebrew-input";

const spell = {
  ruleset: "RULES_2014",
  name: "Вогняний їжак",
  engName: "Fire Hedgehog",
  level: "2",
  school: "Втілення",
  castingTime: "1 дія",
  range: "60 футів",
  components: "В, С",
  duration: "Миттєва",
  isRitual: false,
  isConcentration: false,
  classes: ["WIZARD_2014", "WIZARD_2024", "HACKER"],
  description: "Їжак вибухає.",
};

const creature = {
  ruleset: "RULES_2024",
  name: "Болотний пес",
  engName: "",
  size: "Середній",
  type: "Звір",
  alignment: "",
  ac: "13",
  hp: "22 (4к8 + 4)",
  speed: "40 фт., плавання 20 фт.",
  strength: "14", dexterity: 15, constitution: 12, intelligence: 3, wisdom: 12, charisma: 6,
  challenge: "1/2",
  actions: "**Укус.** Рукопашна атака: +4 на влучання.",
};

describe("введення хоумбрю", () => {
  it("заклинання: рівень із рядка, класи лише своєї редакції", () => {
    expect(parseHomebrewSpellInput(spell)).toMatchObject({ data: { level: 2, classes: ["WIZARD_2014"] } });
  });

  it("порожні обовʼязкові поля й чужа школа повертають помилки по полях українською", () => {
    expect(parseHomebrewSpellInput({ ...spell, name: "  ", school: "Хакерство", level: 12 })).toEqual({
      errors: { name: "Заповніть поле", school: "Оберіть школу", level: "До 9" },
    });
  });

  it("істота: характеристики з модифікатором, досвід і бонус майстерності з показника небезпеки, швидкості розібрані", () => {
    const parsed = parseHomebrewCreatureInput(creature);
    if (!("data" in parsed)) throw new Error(JSON.stringify(parsed.errors));
    expect(buildCreatureStatBlock(parsed.data)).toMatchObject({
      source: "HOMEBREW",
      strength: "14 (+2)",
      intelligence: "3 (-4)",
      xp: "100 XP",
      proficiencyBonus: "+2",
      walkSpeed: 40,
      swimSpeed: 20,
      actions: "**Укус.** Рукопашна атака: +4 на влучання.",
    });
  });

  it("статблок читається назад у форму редагування", () => {
    const parsed = parseHomebrewCreatureInput(creature);
    if (!("data" in parsed)) throw new Error("невалідна істота");
    expect(parseHomebrewCreatureInput(readCreatureInputFromStatBlock(buildCreatureStatBlock(parsed.data)))).toEqual(parsed);
  });

  it("показник небезпеки поза таблицею й нечислова характеристика — помилка", () => {
    expect(parseHomebrewCreatureInput({ ...creature, challenge: "31", strength: "сильний" })).toEqual({
      errors: { strength: "Ціле число", challenge: "Оберіть показник небезпеки" },
    });
  });

  it("характеристики без меж: 100 і 0 приймаються з модифікатором", () => {
    const parsed = parseHomebrewCreatureInput({ ...creature, strength: 100, dexterity: 0 });
    if (!("data" in parsed)) throw new Error(JSON.stringify(parsed));
    expect(buildCreatureStatBlock(parsed.data)).toMatchObject({ strength: "100 (+45)", dexterity: "0 (-5)" });
  });
});
