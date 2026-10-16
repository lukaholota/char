import { describe, expect, it } from "vitest";
import { buildProficiencyAndLanguageText } from "./proficiencyLanguageText";

const empty = {
  customProficiencies: "",
  customLanguages: "",
  darkvisionRange: null,
  damageResistances: [],
};

describe("блок володінь і мов у PDF", () => {
  it("порожній персонаж — порожній текст", () => {
    expect(buildProficiencyAndLanguageText(empty)).toBe("");
  });

  it("мови — першим рядком, без повторів, далі чуття й опори одним рядком", () => {
    const text = buildProficiencyAndLanguageText({
      ...empty,
      customProficiencies: "Набір травника",
      customLanguages: "Загальна\nОрківська, загальна\nМова велетнів\nМова велетнів",
      darkvisionRange: 120,
      damageResistances: ["Отрутою"],
    });
    expect(text).toBe("Мови: Загальна, Орківська, Мова велетнів\nТемнозір 120 футів; Опори: Отрутою\nІнструменти: Набір травника");
  });

  it("володіння зводяться в рядок на вид: з префіксом, списком під заголовком і без підпису", () => {
    const text = buildProficiencyAndLanguageText({
      ...empty,
      customProficiencies: [
        "Легкі обладунки, Середні обладунки, Щит",
        "Проста зброя",
        "ІНСТРУМЕНТИ:",
        "- Набір травника",
        "- Набір травника",
        "Зброя: Кинджал, Праща",
        "обладунки: Щит",
        "Свідомість: колективна",
        "мотузка, гак-кішка",
        "свічка",
      ].join("\n"),
    });
    expect(text).toBe(
      [
        "Обладунки: Легкі обладунки, Середні обладунки, Щит",
        "Зброя: Проста зброя, Кинджал, Праща",
        "Інструменти: Набір травника",
        "Свідомість: колективна",
        "Інше: мотузка, гак-кішка; свічка",
      ].join("\n"),
    );
  });

  it("«обери N» у ручному тексті володінь стає «Інструменти на вибір»", () => {
    expect(buildProficiencyAndLanguageText({ ...empty, customProficiencies: "Набір травника\nобери 2" })).toBe("Інструменти: Набір травника, на вибір (2)");
  });

  it("апостроф у різних написаннях — та сама мова", () => {
    expect(buildProficiencyAndLanguageText({ ...empty, customLanguages: "Мова Камʼяних\nМова Кам'яних" })).toBe("Мови: Мова Камʼяних");
  });
});
