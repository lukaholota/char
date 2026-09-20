import { describe, expect, it } from "vitest";
import backgrounds2024 from "../../data/2024/normalized/backgrounds.json";
import existingBackgrounds2024 from "../../data/2024/normalized/existing-2024-backgrounds-update-data.json";
import creatorContent2024 from "@/lib/generated/creator-content-2024.json";

type ToolSource = { engName: string; toolProficiency?: { toolCategory: string | null; isChoice: boolean } | null };

describe("KR31.14 — фіксоване володіння інструментом походження 2024 (L02-backgrounds-09)", () => {
  it("жодне походження не дає всю категорію ремісничих інструментів замість одного набору", () => {
    const widened = [...(backgrounds2024 as ToolSource[]), ...(existingBackgrounds2024 as ToolSource[])]
      .filter((background) => background.toolProficiency?.toolCategory === "ARTISAN_TOOLS" && !background.toolProficiency.isChoice)
      .map((background) => background.engName);

    expect(widened).toEqual([]);
  });

  it("конструктор 2024 дає Фермеру інструменти тесляра", () => {
    const farmer = creatorContent2024.backgrounds.find((background) => background.name === "FARMER_2024");
    expect(farmer?.toolProficiencies).toEqual(["CARPENTERS_TOOLS"]);
  });
});
