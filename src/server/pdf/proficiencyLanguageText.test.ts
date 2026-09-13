import { describe, expect, it } from "vitest";
import { buildProficiencyAndLanguageText } from "./proficiencyLanguageText";

const empty = {
  derived: { proficiencies: [], languages: "" },
  customProficiencies: "",
  customLanguages: "",
  darkvisionRange: null,
  damageResistances: [],
};

describe("блок володінь і мов у PDF", () => {
  it("порожній персонаж — порожній текст", () => {
    expect(buildProficiencyAndLanguageText(empty)).toBe("");
  });

  it("чуття й опори йдуть першими", () => {
    expect(buildProficiencyAndLanguageText({ ...empty, darkvisionRange: 120, damageResistances: ["Отрутою"] })).toBe(
      "Чуття й опори:\n· Темнозір 120 футів\n· Опори: Отрутою",
    );
  });

  it("похідні рядки стоять перед ручним текстом, однакові не повторюються", () => {
    const text = buildProficiencyAndLanguageText({
      ...empty,
      derived: { proficiencies: ["Обладунки: Легкі обладунки"], languages: "Загальна, Дварфська" },
      customProficiencies: "Обладунки: Легкі обладунки\nІнструменти злодія",
      customLanguages: "Орківська",
    });
    expect(text).toBe(
      "Володіння (броня/зброя/інструменти):\n· Обладунки: Легкі обладунки\n· Інструменти злодія\nМови:\n· Загальна, Дварфська\n· Орківська",
    );
  });

  it("«обери N» у ручному тексті володінь стає «Інструменти на вибір»", () => {
    expect(buildProficiencyAndLanguageText({ ...empty, customProficiencies: "обери 2" })).toContain("Інструменти на вибір (2)");
  });
});
