import { describe, expect, it } from "vitest";
import { findCrimsonRiteDamage, findHemocraftDie, isCrimsonRiteFeature } from "@/rules/crimson-rite";
import { readBloodHunterSource } from "../../prisma/seed/bloodHunter";

describe("O45 — Багряний обряд на зброї", () => {
  it("BH-004: мисливець 7 з Обрядом бурі на Хижих ударах — +1к6 блискавкою", () => {
    expect(findCrimsonRiteDamage("Rite of the Storm", 7)).toEqual({ dice: "1d6", damageType: "LIGHTNING" });
    expect(findCrimsonRiteDamage("Blood Hunter Choice: Rite of the Flame (2024)", 7)).toEqual({ dice: "1d6", damageType: "FIRE" });
  });

  it("BH-002: Обряд світанку мисливця на привидів — променева шкода в обох редакціях", () => {
    expect(findCrimsonRiteDamage("Rite of the Dawn (Order of the Ghostslayer)", 3)).toEqual({ dice: "1d4", damageType: "RADIANT" });
    expect(findCrimsonRiteDamage("Order of the Ghostslayer: Rite of the Dawn (2024)", 11)).toEqual({ dice: "1d8", damageType: "RADIANT" });
  });

  it("не обряд — не обряд", () => {
    expect(isCrimsonRiteFeature("Crimson Rite (Blood Hunter)")).toBe(false);
    expect(isCrimsonRiteFeature("Blood Curse of Binding")).toBe(false);
  });

  it("кубик гемокрафту на кожному рівні — з таблиці класу носія", () => {
    const steps = readBloodHunterSource().classTable.hemocraftDie as Record<string, string>;
    for (let level = 1; level <= 20; level++) {
      const reached = Object.keys(steps).map(Number).filter((from) => from <= level).sort((a, b) => a - b).pop()!;
      expect(findHemocraftDie(level), `рівень ${level}`).toBe(steps[String(reached)]);
    }
  });

  it("кожен обряд носія має тип шкоди", () => {
    const rites = readBloodHunterSource().choiceGroups.find((group) => group.key === "crimson-rites")!.options;
    for (const rite of rites) expect(isCrimsonRiteFeature(rite.engName), rite.engName).toBe(true);
  });
});
