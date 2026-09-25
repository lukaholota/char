import { describe, expect, it } from "vitest";

import content2024 from "@/lib/generated/creator-content-2024.json";
import { translateValue } from "@/lib/components/characterCreator/infoUtils";
import { translateSubclassName, translateSubclassNameEng } from "@/lib/refs/subclass-name";

const subclassNames2024 = content2024.classes.flatMap((characterClass) => characterClass.subclasses.map((subclass) => subclass.name));

describe("назви підкласів 2024 у майстрі — переклад, а не enum з бази", () => {
  it("кожен підклас 2024 має українську й англійську назву", () => {
    const untranslated = subclassNames2024.filter((name) => translateSubclassName(name) === name || translateSubclassNameEng(name) === name);

    expect(subclassNames2024.length).toBeGreaterThan(40);
    expect(untranslated).toEqual([]);
  });

  it("translateValue, яким малюють список підкласів у модалці класу, теж перекладає", () => {
    expect(translateValue("FIEND_PATRON")).toBe("Патрон-Почвара");
    expect(subclassNames2024.filter((name) => translateValue(name) === name)).toEqual([]);
  });

  it("підклас 2014 лишає свою назву", () => {
    expect(translateSubclassName("FIEND")).toBe("Почвара");
    expect(translateSubclassName("THE_GENIE")).toBe("Джин");
  });
});
