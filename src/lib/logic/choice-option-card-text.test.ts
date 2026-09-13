import { describe, expect, it } from "vitest";
import { findChoiceOptionCardText } from "./choice-option-card-text";

const invocation = {
  optionName: "+модифікатор ХАР до шкоди атаки заклинанням",
  features: [{ feature: { name: "Мучливий вибух", engName: "Agonizing Blast (2024)", shortDescription: "+модифікатор ХАР до шкоди атаки заклинанням" } }],
};

const dragonAncestor = ["Червоний дракон (вогонь)", "Синій дракон (блискавка)"].map((optionName) => ({
  optionName,
  features: [{ feature: { name: "Дракон-предок", engName: "Draconic Ancestry", shortDescription: "Обираєте драконічного предка й повʼязаний із ним тип шкоди" } }],
}));

const skill = { optionName: "Атлетика", features: [] };

describe("підпис картки вибору", () => {
  it("бере назву зі звʼязаної фічі й несе оригінал без дизамбігуатора редакції", () => {
    expect(findChoiceOptionCardText(invocation, [invocation]).title).toBe("Мучливий вибух [Agonizing Blast]");
  });

  it("не дублює заголовок в описі: короткий опис збігся — бере наступного кандидата", () => {
    const onlyDescription = {
      optionName: "Обладунок мага [Mage Armor] на себе без витрати чарунок",
      features: [{ feature: { name: "Обладунок тіней", engName: "Armor of Shadows (2024)", shortDescription: "Обладунок тіней" } }],
    };
    const { title, preview } = findChoiceOptionCardText(onlyDescription, [onlyDescription]);
    expect(title).toBe("Обладунок тіней [Armor of Shadows]");
    expect(preview).toBe("Обладунок мага [Mage Armor] на себе без витрати чарунок");
  });

  it("одна фіча на всю групу — заголовком лишається UI-підпис опції", () => {
    expect(findChoiceOptionCardText(dragonAncestor[0], dragonAncestor).title).toBe("Червоний дракон (вогонь)");
    expect(findChoiceOptionCardText(dragonAncestor[1], dragonAncestor).title).toBe("Синій дракон (блискавка)");
  });

  it("опція без фічі показує свій підпис", () => {
    expect(findChoiceOptionCardText(skill, [skill])).toEqual({ title: "Атлетика", preview: "" });
  });

  it("в описі знімає розмітку, посилання й маркери оригіналу", () => {
    const option = {
      optionName: "Колові закляття",
      features: [{ feature: { name: "Колові закляття — Болото", engName: "Circle Spells: Swamp", shortDescription: '3р. <a href="/spell/1249">Темрява [Darkness]</a>, *істинний зір{{Truesight}}*' } }],
    };
    expect(findChoiceOptionCardText(option, [option]).preview).toBe("3р. Темрява [Darkness], істинний зір");
  });
});
