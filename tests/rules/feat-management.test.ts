import { describe, it, expect } from "vitest";
import { getAllFeats, getFeatById } from "@/lib/featsData";
import { featCategoryTranslations } from "@/lib/refs/translation";

describe("Feat Sheet Manager Logic (KR10.3)", () => {
  it("provides complete 2014 and 2024 feats with translations", () => {
    const feats2014 = getAllFeats("RULES_2014");
    const feats2024 = getAllFeats("RULES_2024");

    expect(feats2014.length).toBeGreaterThan(40);
    expect(feats2024.length).toBeGreaterThan(40);

    // Verify 2014 feat translation
    const alert2014 = feats2014.find((f) => f.engName === "Alert" || f.name === "Пильний" || f.name === "Уважний");
    expect(alert2014).toBeDefined();
    expect(alert2014?.description).toBeDefined();

    // Verify 2024 feat categories
    const originFeats2024 = feats2024.filter((f) => f.category === "ORIGIN");
    expect(originFeats2024.length).toBeGreaterThan(5);

    const epicBoons2024 = feats2024.filter((f) => f.category === "EPIC_BOON");
    expect(epicBoons2024.length).toBeGreaterThan(5);
  });

  it("translates feat categories using house dictionary", () => {
    expect(featCategoryTranslations.ORIGIN).toBe("Риса походження");
    expect(featCategoryTranslations.GENERAL).toBe("Загальна риса");
    expect(featCategoryTranslations.EPIC_BOON).toBe("Епічний дар");
    expect(featCategoryTranslations.FIGHTING_STYLE).toBe("Бойовий стиль");
  });

  it("retrieves feat by ID accurately", () => {
    const feat = getFeatById(1, "RULES_2014");
    expect(feat).toBeDefined();
    expect(feat?.name).toBeDefined();
  });
});
