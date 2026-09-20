import { describe, expect, it } from "vitest";

import type { DerivedProficiencies } from "@/rules/derived-proficiencies";
import { appendMissingProficiencies, appendToolProficiencies, findMentionedTerms } from "./pers-proficiencies";
import { countFeatToolChoices } from "@/rules/feat-tool-choices";

const derived = (fields: Partial<DerivedProficiencies>): DerivedProficiencies => ({
  armor: [],
  weaponTypes: [],
  weapons: [],
  tools: [],
  languages: [],
  ...fields,
});

describe("надання з джерел дописуються в текст персонажа", () => {
  it("мова, яка вже є в тексті, не дублюється; відсутня дописується рядком", () => {
    const text = appendMissingProficiencies(
      { proficiencies: "", languages: "Загальна\nЕльфійська\nГоблінська" },
      derived({ languages: ["COMMON", "ELVISH", "DWARVISH"] }),
    );

    expect(text.languages).toBe("Загальна\nЕльфійська\nГоблінська\nДворфська");
  });

  it("текст, у якому все вже є, лишається байт у байт", () => {
    const saved = { proficiencies: "Легкі обладунки, Щит\nПроста зброя, Бойова зброя", languages: "Загальна\nОбери ще 1" };

    expect(
      appendMissingProficiencies(saved, derived({ armor: ["LIGHT", "SHIELD"], weaponTypes: ["SIMPLE_WEAPON", "MARTIAL_WEAPON"], languages: ["COMMON"] })),
    ).toEqual(saved);
  });

  it("відсутні володіння дописуються згрупованими рядками", () => {
    const text = appendMissingProficiencies(
      { proficiencies: "Легкі обладунки", languages: "" },
      derived({ armor: ["LIGHT", "SHIELD"], weapons: ["HANDAXE"], tools: ["THIEVES_TOOLS"] }),
    );

    expect(text.proficiencies).toBe("Легкі обладунки\nОбладунки: Щит\nЗброя: Ручна сокира\nІнструменти: Інструменти злодія");
  });

  it("порожній текст отримує лише надання, без порожнього першого рядка", () => {
    expect(appendMissingProficiencies({ proficiencies: "", languages: "  \n" }, derived({ languages: ["COMMON"] })).languages).toBe("Загальна");
  });

  it("регістр і апостроф не роблять мову «відсутньою»", () => {
    expect(appendMissingProficiencies({ proficiencies: "", languages: "загальна" }, derived({ languages: ["COMMON"] })).languages).toBe("загальна");
  });
});

describe("інструменти, обрані на листі", () => {
  it("дописує лише ті, яких у тексті ще немає, одним рядком", () => {
    const text = "Легкі обладунки\nІнструменти на вибір (3)\nКовальські інструменти";

    expect(appendToolProficiencies(text, ["Ковальські інструменти", "Лютня", "Флейта"])).toBe(`${text}\nІнструменти: Лютня, Флейта`);
  });

  it("нічого не обрано або все вже є — текст не змінюється", () => {
    expect(appendToolProficiencies("Лютня", [])).toBe("Лютня");
    expect(appendToolProficiencies("Лютня", ["лютня"])).toBe("Лютня");
  });

  it("позначає в діалозі інструменти, які вже згадані в тексті", () => {
    expect(findMentionedTerms("Інструменти: лютня, Флейта Пана", { LUTE: "Лютня", PAN_FLUTE: "Флейта Пана", DRUM: "Барабан" })).toEqual(["Лютня", "Флейта Пана"]);
  });
});

describe("риси 2024, що дають інструменти на вибір", () => {
  it("Ремісник і Музикант — по три, решта — нуль", () => {
    expect([countFeatToolChoices("CRAFTER"), countFeatToolChoices("MUSICIAN"), countFeatToolChoices("ALERT"), countFeatToolChoices(null)]).toEqual([3, 3, 0, 0]);
  });
});
