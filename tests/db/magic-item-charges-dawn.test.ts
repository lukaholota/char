import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { stepMagicItemCharges } from "@/lib/actions/magic-item-actions";
import { longRest } from "@/server/db/rest-actions";

const EMAIL = "magic-item-charges-dawn@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createPersWithWand(charges: { chargesMax: number | null; chargesCurrent: number | null }) {
  const [wizard, race, background, wand] = await Promise.all([
    classByName("WIZARD_2014"),
    raceByName("HUMAN_2014"),
    backgroundByName("ACOLYTE"),
    prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Wand of Magic Missiles", ruleset: "RULES_2014" } } }),
  ]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Чарівник з паличкою",
      classId: wizard.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 3,
      currentHp: 15,
      maxHp: 15,
      str: 10, dex: 14, con: 14, int: 16, wis: 10, cha: 10,
      magicItems: { create: [{ magicItemId: wand.magicItemId, ...charges }] },
    },
    include: { magicItems: true },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return { persId: pers.persId, linkId: pers.magicItems[0].persMagicItemId };
}

const readCharges = (persMagicItemId: number) =>
  prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId }, select: { chargesMax: true, chargesCurrent: true } });

describe("заряди предмета з опису й світанок", () => {
  it("витрата заряду в предмета без заданих зарядів бере 7 з опису палички", async () => {
    const { linkId } = await createPersWithWand({ chargesMax: null, chargesCurrent: null });
    expect(await stepMagicItemCharges(linkId, -1)).toMatchObject({ success: true });
    expect(await readCharges(linkId)).toEqual({ chargesMax: 7, chargesCurrent: 6 });
  });

  it("довгий відпочинок відновлює 1к6 + 1 заряд і повідомляє скільки", async () => {
    const { persId, linkId } = await createPersWithWand({ chargesMax: 7, chargesCurrent: 0 });
    const result = await longRest(persId);
    const charges = await readCharges(linkId);
    expect(charges.chargesCurrent).toBeGreaterThanOrEqual(2);
    expect(charges.chargesCurrent).toBeLessThanOrEqual(7);
    expect(result).toMatchObject({ success: true, itemChargesRegained: [{ name: expect.any(String), regained: charges.chargesCurrent }] });
  });

  it("повна паличка на відпочинку не змінюється й не потрапляє в підсумок", async () => {
    const { persId, linkId } = await createPersWithWand({ chargesMax: 7, chargesCurrent: 7 });
    expect(await longRest(persId)).toMatchObject({ success: true, itemChargesRegained: [] });
    expect(await readCharges(linkId)).toEqual({ chargesMax: 7, chargesCurrent: 7 });
  });
});
