import { describe, expect, it } from "vitest";

import { filterFeaturesByQuery, findFeaturePreview } from "./features";

describe("підпис під назвою фічі на листі", () => {
  it("короткий опис, що повторює назву (сіди 2024), замінюється початком повного", () => {
    expect(
      findFeaturePreview({
        name: "Темнозір",
        shortDescription: "Темнозір",
        description: "Ви бачите в **тьмяному світлі** в межах 60 футів так, ніби це яскраве світло.",
      }),
    ).toBe("Ви бачите в тьмяному світлі в межах 60 футів так, ніби це яскраве світло.");
  });

  it("справжній короткий опис лишається", () => {
    expect(
      findFeaturePreview({ name: "Бойовий стиль: Стрільба", shortDescription: "+2 на кидки атаки дальньобійною зброєю", description: "Довгий опис." }),
    ).toBe("+2 на кидки атаки дальньобійною зброєю");
  });

  it("маркери оригіналу не лізуть у підпис сирими дужками", () => {
    expect(findFeaturePreview({ name: "Транс", shortDescription: null, description: "Ви не потребуєте сну{{sleep}} і медитуєте 4 години." })).toBe(
      "Ви не потребуєте сну і медитуєте 4 години.",
    );
  });

  it("без жодного опису, крім назви, підпису немає", () => {
    expect(findFeaturePreview({ name: "Магія пакту", shortDescription: "Магія пакту", description: "Магія пакту." })).toBe("");
  });
});

describe("пошук по фічах листа", () => {
  const features = [
    { name: "Темнозір", shortDescription: "Темнозір", description: "Ви бачите в темряві на 60 футів.", source: "RACE", sourceName: "Ельф" },
    { name: "Магія пакту", shortDescription: "Магія пакту", description: "Ваш покровитель дарує слоти заклинань.", source: "CLASS", sourceName: "Чорнокнижник" },
    { name: "ALERT", shortDescription: null, description: "Бонус до ініціативи.", source: "FEAT", sourceName: "Риса походження" },
  ];

  it("порожній запит лишає все", () => {
    expect(filterFeaturesByQuery(features, "  ")).toHaveLength(3);
  });

  it("шукає за назвою без огляду на регістр", () => {
    expect(filterFeaturesByQuery(features, "темноЗІР").map((f) => f.name)).toEqual(["Темнозір"]);
  });

  it("шукає в тексті опису", () => {
    expect(filterFeaturesByQuery(features, "слоти").map((f) => f.name)).toEqual(["Магія пакту"]);
  });

  it("знаходить рису за перекладеною назвою, хоча в даних лежить ключ", () => {
    expect(filterFeaturesByQuery(features, "пильн").map((f) => f.name)).toEqual(["ALERT"]);
  });
});
