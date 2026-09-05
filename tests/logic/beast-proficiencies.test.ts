import { describe, expect, it } from "vitest";
import { Ability, Skills } from "@prisma/client";
import { getAllCreatures } from "@/lib/bestiaryData";
import { parseBeastSaveModifiers, parseBeastSkillModifiers } from "@/lib/logic/beast-proficiencies";

/// KR24.6. Правило 2024 «береться більше з двох» читає володіння просто зі статблока, тож
/// розбір локалізованого рядка — його передумова. Істоти беруться з каталогу репозиторію: рядок,
/// написаний у тесті від руки, довів би лише те, що регулярка збігається сама із собою.

function find2024(nameEng: string) {
  const creature = getAllCreatures("RULES_2024").find((candidate) => candidate.nameEng === nameEng);
  if (!creature) throw new Error(`У каталозі 2024 немає істоти ${nameEng}`);
  return creature;
}

describe("навички зі статблока", () => {
  it("читає обидві навички вовка з каталогу", () => {
    expect(parseBeastSkillModifiers(find2024("Wolf").skills)).toEqual({
      [Skills.PERCEPTION]: 5,
      [Skills.STEALTH]: 4,
    });
  });

  it("порожнє поле дає порожній набір, а не нулі", () => {
    expect(parseBeastSkillModifiers(find2024("Giant Lizard").skills)).toEqual({});
    expect(parseBeastSkillModifiers("")).toEqual({});
  });

  /// Назви беруться зі словника, тож те, чого там немає, просто не впізнається — і мовчки не
  /// стає чужою навичкою.
  it("невідома назва не збігається ні з чим", () => {
    expect(parseBeastSkillModifiers("Плавання +7")).toEqual({});
  });
});

describe("рятівні кидки зі статблока", () => {
  /// Статблок скорочує характеристику до трьох літер: «Спр», «Ста», «Сил», «Муд».
  it("читає скорочення характеристики", () => {
    expect(parseBeastSaveModifiers(find2024("Giant Lizard").savingThrows)).toEqual({ [Ability.DEX]: 3 });
    expect(parseBeastSaveModifiers(find2024("Camel").savingThrows)).toEqual({ [Ability.CON]: 5 });
    expect(parseBeastSaveModifiers(find2024("Mastiff").savingThrows)).toEqual({ [Ability.WIS]: 3 });
  });

  it("читає кілька кидків одразу", () => {
    expect(parseBeastSaveModifiers(find2024("Saber-Toothed Tiger").savingThrows)).toEqual({
      [Ability.STR]: 6,
      [Ability.DEX]: 5,
    });
  });

  it("«Сил» і «Спр» не плутаються між собою", () => {
    expect(parseBeastSaveModifiers("Сил +2")).toEqual({ [Ability.STR]: 2 });
    expect(parseBeastSaveModifiers("Спр +2")).toEqual({ [Ability.DEX]: 2 });
  });

  /// Статблоки прикликання пишуть «Спр +2 + БМ»: чужий бонус майстерності в модифікатор не
  /// входить, береться саме перше число.
  it("приріст від чужого бонусу майстерності до модифікатора не входить", () => {
    expect(parseBeastSaveModifiers(find2024("Beast of the Land").savingThrows)).toEqual({
      [Ability.DEX]: 2,
      [Ability.CON]: 2,
    });
  });

  it("відʼємний модифікатор читається зі знаком", () => {
    expect(parseBeastSaveModifiers("Інт -3")).toEqual({ [Ability.INT]: -3 });
  });

  it("одна літера характеристику не називає", () => {
    expect(parseBeastSaveModifiers("С +2")).toEqual({});
  });
});
