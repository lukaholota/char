import { describe, expect, it, vi } from "vitest";

import type { ClassData, SubclassData } from "@/lib/classesData";

vi.mock("@/lib/classesData", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/classesData")>();
  return {
    ...original,
    getAllClasses: (ruleset: ClassData["ruleset"]) => original.getAllClasses(ruleset).map((characterClass) => addLegacyGenie(characterClass)),
  };
});

import { buildOmniSearchIndex } from "@/lib/omniSearchData";

function addLegacyGenie(characterClass: ClassData): ClassData {
  if (characterClass.key !== "WARLOCK_2024") return characterClass;
  const genie: SubclassData = {
    subclassId: 999_001,
    key: "THE_GENIE",
    slug: "the-genie",
    name: "Джин",
    engName: "The Genie",
    description: null,
    source: "TCOE",
    legacy: true,
    features: [],
  };
  return { ...characterClass, subclasses: [...characterClass.subclasses, genie] };
}

const findGenieItems = (ruleset: ClassData["ruleset"]) =>
  buildOmniSearchIndex(ruleset).filter((item) => item.id.startsWith("subclass-") && item.id.endsWith("-THE_GENIE"));

describe("O43 — легасі-підкласи в глобальному пошуку (Р52)", () => {
  it("у 2024 легасі-«Джина» немає, хоч у каталозі класу 2024 він є", () => {
    expect(findGenieItems("RULES_2024")).toEqual([]);
  });

  it("у 2014 «Джин» знаходиться, як і раніше", () => {
    expect(findGenieItems("RULES_2014").map((item) => item.id)).toEqual(["subclass-WARLOCK_2014-THE_GENIE"]);
  });
});
