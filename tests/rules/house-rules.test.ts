import { describe, expect, it } from "vitest";
import { parseCampaignHouseRules, parsePersHouseRules, resolveHouseRules } from "@/rules/house-rules";
import { findOwnDarkvisionRange } from "@/rules/senses-and-resistances";

describe("house rules", () => {
  it("drops broken values and trims custom damage types", () => {
    expect(parsePersHouseRules({ attunementLimit: 21, magicSystem: "MANA", darkvisionRange: 301 })).toEqual({ attunementLimit: null, magicSystem: null, darkvisionRange: null });
    expect(parsePersHouseRules(null)).toEqual({ attunementLimit: null, magicSystem: null, darkvisionRange: null });
    expect(parsePersHouseRules({ attunementLimit: 0, magicSystem: "POINTS", darkvisionRange: 0 })).toEqual({ attunementLimit: null, magicSystem: "POINTS", darkvisionRange: 0 });
    expect(parseCampaignHouseRules({ darkvisionRange: 60 })).not.toHaveProperty("darkvisionRange");
    const names = parseCampaignHouseRules({ damageTypes: [" Світло ", "Світло", "", 5, ...Array.from({ length: 10 }, (_, i) => `Тип ${i}`), "x".repeat(40)] }).damageTypes;
    expect(names[0]).toBe("Світло");
    expect(names).toHaveLength(8);
  });

  it("lets the hero override the campaign and merges several campaigns", () => {
    const strict = { attunementLimit: 4, magicSystem: null, damageTypes: ["Світло"] };
    const generous = { attunementLimit: 6, magicSystem: "POINTS" as const, damageTypes: ["Хаос", "Світло"] };
    expect(resolveHouseRules({ attunementLimit: null, magicSystem: null }, [strict, generous])).toEqual({ attunementLimit: 6, magicSystem: "POINTS", damageTypes: ["Світло", "Хаос"] });
    expect(resolveHouseRules({ attunementLimit: 2, magicSystem: "SLOTS" }, [generous])).toMatchObject({ attunementLimit: 2, magicSystem: "SLOTS" });
    expect(resolveHouseRules({ attunementLimit: null, magicSystem: null }, [])).toEqual({ attunementLimit: null, magicSystem: "SLOTS", damageTypes: [] });
  });

  it("lets the hero replace or remove racial darkvision", () => {
    const drow = [{ darkvisionRange: 60 }, { darkvisionRange: 120 }];
    expect(findOwnDarkvisionRange(drow, null)).toBe(120);
    expect(findOwnDarkvisionRange(drow, 30)).toBe(30);
    expect(findOwnDarkvisionRange(drow, 0)).toBeNull();
    expect(findOwnDarkvisionRange([], 60)).toBe(60);
  });
});
