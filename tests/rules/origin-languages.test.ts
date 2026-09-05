import { describe, expect, it } from "vitest";
import {
  collectOriginLanguages,
  countOriginLanguageChoices,
  listChoosableLanguages,
  STANDARD_LANGUAGES_2024,
} from "@/rules/languages";

const ALL_LANGUAGES = ["COMMON", "ELVISH", "DRACONIC", "INFERNAL", "DRUIDIC", "UNDERCOMMON"];

describe("countOriginLanguageChoices", () => {
  it("2014 складає лічильники всіх джерел", () => {
    expect(countOriginLanguageChoices("RULES_2014", [1, 2, null, undefined, 1])).toBe(4);
  });

  it("2014 без жодного джерела не дає вибору", () => {
    expect(countOriginLanguageChoices("RULES_2014", [0, null, undefined])).toBe(0);
  });

  it("2024 дає рівно дві мови, скільки б джерел не обіцяли", () => {
    expect(countOriginLanguageChoices("RULES_2024", [3, 2, 1])).toBe(2);
  });

  it("2024 дає дві мови й тоді, коли жодне джерело нічого не обіцяє", () => {
    expect(countOriginLanguageChoices("RULES_2024", [0, 0, 0])).toBe(2);
  });
});

describe("collectOriginLanguages", () => {
  it("2024 додає Загальну до мов, що прийшли з джерел", () => {
    expect(collectOriginLanguages("RULES_2024", ["ELVISH"])).toEqual(["COMMON", "ELVISH"]);
  });

  it("2024 не дублює Загальну, коли вид її вже дав", () => {
    expect(collectOriginLanguages("RULES_2024", ["COMMON", "DWARVISH"])).toEqual(["COMMON", "DWARVISH"]);
  });

  it("2014 нічого не додає — мови приходять лише з джерел", () => {
    expect(collectOriginLanguages("RULES_2014", ["ELVISH"])).toEqual(["ELVISH"]);
  });
});

describe("listChoosableLanguages", () => {
  it("2024 пропонує лише стандартні мови", () => {
    expect(listChoosableLanguages("RULES_2024", ALL_LANGUAGES, [])).toEqual([...STANDARD_LANGUAGES_2024]);
  });

  it("2024 не пропонує рідкісні мови", () => {
    const choosable = listChoosableLanguages("RULES_2024", ALL_LANGUAGES, []);

    expect(choosable).not.toContain("INFERNAL");
    expect(choosable).not.toContain("DRUIDIC");
    expect(choosable).not.toContain("UNDERCOMMON");
  });

  it("прибирає з переліку вже відомі мови", () => {
    expect(listChoosableLanguages("RULES_2024", ALL_LANGUAGES, ["COMMON", "ELVISH"])).not.toContain("COMMON");
  });

  it("2014 пропонує весь перелік мов застосунку", () => {
    expect(listChoosableLanguages("RULES_2014", ALL_LANGUAGES, ["COMMON"])).toEqual([
      "ELVISH",
      "DRACONIC",
      "INFERNAL",
      "DRUIDIC",
      "UNDERCOMMON",
    ]);
  });
});
