import { describe, expect, it } from "vitest";

import { getAllBackgrounds } from "@/lib/backgroundsData";
import { getAllFeats } from "@/lib/featsData";

/// Сторінка походження й модалка конструктора показують текст Риси Походження, а не саму
/// назву: назва в плашці нічого не пояснює, а риса — найбільше, що передісторія 2024 дає.
describe("походження 2024 несе текст своєї риси", () => {
  it("кожне походження з рисою має її опис", () => {
    const withoutText = getAllBackgrounds("RULES_2024")
      .filter((background) => background.originFeat && !background.originFeat.description)
      .map((background) => background.originFeat?.engName);

    expect(withoutText).toEqual([]);
  });

  it("опис береться з каталогу рис, а не переписується поруч", () => {
    const acolyte = getAllBackgrounds("RULES_2024").find((background) => background.engName === "Acolyte");
    const magicInitiate = getAllFeats("RULES_2024").find((feat) => feat.engName === "Magic Initiate");

    expect(acolyte?.originFeat?.engName).toBe("Magic Initiate (Cleric)");
    expect(acolyte?.originFeat?.description).toBe(magicInitiate?.description);
  });

  it("у 2014 риси походження немає — і поля теж", () => {
    expect(getAllBackgrounds("RULES_2014").every((background) => background.originFeat === null)).toBe(true);
  });
});
