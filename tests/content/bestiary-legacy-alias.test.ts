import { describe, expect, it } from "vitest";
import { getAllCreatures, getCreatureById, getCreatureByIdOrSlug, findCreatureByKey } from "@/lib/bestiaryData";
import { collectCreatureCRs, type CreatureIndexEntry } from "@/lib/bestiary-index";

describe("канонічний бехолдер 2024", () => {
  it("показує один імпортований запис і зберігає старі адреси та ID", () => {
    const beholders = getAllCreatures("RULES_2024").filter((creature) => /^Beholder(?: \(2024\))?$/.test(creature.nameEng));
    expect(beholders).toHaveLength(1);
    expect(beholders[0].hp).toBe("190 (20к10 + 80)");
    expect(beholders[0].proficiencyBonus).toBe("+5");
    expect(getCreatureById(20022, "RULES_2024")).toBe(beholders[0]);
    expect(getCreatureByIdOrSlug("beholder-2024", "RULES_2024")).toBe(beholders[0]);
    expect(findCreatureByKey("beholder-2024", "RULES_2024")).toBe(beholders[0]);
    expect(getCreatureByIdOrSlug("beholder", "RULES_2014")?.hp).toBe("180 (19к10 + 76)");
  });
  it("сортує числові CR, зберігаючи дроби й спеціальні ключі фільтра", () => {
    const entries = ["Саммон", "0", "1/4", "1/2", "10", "13", "7", "1/8", "1", "2"].map((challenge) => ({ challenge }) as CreatureIndexEntry);
    expect(collectCreatureCRs(entries)).toEqual(["0", "1/8", "1/4", "1/2", "1", "2", "7", "10", "13", "Саммон"]);
  });
});
