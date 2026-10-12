import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import type { PrismaClient } from "@prisma/client";
import { seedClassEquipment } from "../../prisma/seed/classEquipmentSeed";

describe("Wizard starting equipment 2014", () => {
  it("seeds only the spellbook in the fixed group and retains later seed indices", async () => {
    const upsert = vi.fn().mockResolvedValue({});
    await seedClassEquipment({ classStartingEquipmentOption: { upsert } } as unknown as PrismaClient);
    const calls = upsert.mock.calls.map(([input]) => input);
    expect(calls.some((input) => input.where.seedIndex === 85)).toBe(false);
    expect(calls.find((input) => input.where.seedIndex === 86).create.class.connect.name_ruleset.name).toBe("DRUID_2014");
    const fixed = calls.filter((input) => input.create.class.connect.name_ruleset.name === "WIZARD_2014" && input.create.choiceGroup === 4);
    expect(fixed).toHaveLength(1);
    expect(fixed[0].create.equipmentPack.connect.name_ruleset.name).toBe("SPELLBOOK");
    expect(fixed[0].create.weapon).toBeUndefined();
  });
  it("matches the canonical equipment alternatives in the generated 2014 creator", () => {
    const content = JSON.parse(readFileSync("src/lib/generated/creator-content-2014.json", "utf8"));
    const wizard = content.classes.find((entry: { name: string }) => entry.name === "WIZARD_2014");
    const rows = wizard.startingEquipmentOption;
    expect(rows.filter((row: { choiceGroup: number }) => row.choiceGroup === 4).map((row: { equipmentPack: { name: string } }) => row.equipmentPack.name)).toEqual(["SPELLBOOK"]);
    expect(rows.filter((row: { weapon: { name: string } | null }) => row.weapon?.name === "DAGGER").map((row: { choiceGroup: number }) => row.choiceGroup)).toEqual([1]);
  });
});
