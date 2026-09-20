import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { findSpellSourceDrift } from "../../prisma/seed/spellSource2014";
import { disconnectDatabase } from "../user-data";

afterAll(disconnectDatabase);

describe("KR34.5 — заклинання 2014 у spells_test дорівнюють файлу-джерелу", () => {
  it("склад і кожне поле збігаються — сід нічого б не записав", async () => {
    const drift = await findSpellSourceDrift(prisma);

    expect(drift.missingInDatabase).toEqual([]);
    expect(drift.missingInFile).toEqual([]);
    expect(drift.changes.map((change) => `${change.engName}: ${Object.keys(change.fields).join(", ")}`)).toEqual([]);
  });
});
