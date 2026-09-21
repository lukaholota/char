import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { signInAs } from "../helpers/signed-in-users";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), unstable_cache: <T>(fn: T) => fn }));

import { getPersById, getPersForSheet } from "@/server/db/pers-actions";

vi.setConfig({ testTimeout: 60_000 });
beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createWizardWithSpell(userId: number) {
  const [cls, race, background] = await Promise.all([classByName("WIZARD_2014"), raceByName("HUMAN_2014"), backgroundByName("SAGE")]);
  const spell = await prisma.spell.findFirstOrThrow({ where: { ruleset: "RULES_2014", level: 1 }, select: { spellId: true } });
  return prisma.pers.create({
    data: {
      userId, name: "Чарівник", ruleset: "RULES_2014", classId: cls.classId, raceId: race.raceId, backgroundId: background.backgroundId,
      level: 1, currentHp: 8, maxHp: 8, str: 8, dex: 14, con: 12, int: 16, wis: 12, cha: 10,
      persSpells: { create: { spellId: spell.spellId, learnedAtLevel: 1 } },
    },
  });
}

describe("лист у браузері не везе того, чого не читає", () => {
  it("ні email власника, ні описів заклинань — а друк має обидва", async () => {
    const owner = await signInAs("sheet-payload-owner");
    const { persId } = await createWizardWithSpell(owner.id);

    const sheet = await getPersForSheet(persId);
    expect(sheet).not.toHaveProperty("user");
    expect(sheet?.persSpells[0].spell).not.toHaveProperty("description");
    expect(sheet?.persSpells[0].spell.name).toBeTruthy();

    const printable = await getPersById(persId);
    expect(printable?.user.email).toBe(owner.email);
    expect(printable?.persSpells[0].spell.description.length).toBeGreaterThan(0);
  });

  it("чужий не бачить листа, співвласник бачить", async () => {
    const owner = await signInAs("sheet-payload-owner2");
    const { persId } = await createWizardWithSpell(owner.id);

    const coOwner = await signInAs("sheet-payload-co");
    expect(await getPersForSheet(persId)).toBeNull();
    await prisma.persAdditionalUser.create({ data: { persId, userId: coOwner.id } });
    expect((await getPersForSheet(persId))?.persId).toBe(persId);

    await signInAs("sheet-payload-stranger");
    expect(await getPersForSheet(persId)).toBeNull();
    expect(await getPersById(persId)).toBeNull();
  });
});
