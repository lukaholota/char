import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { setMagicItemChargesMax, stepMagicItemCharges } from "@/lib/actions/magic-item-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createPersWithMagicItem(email: string) {
  const [race, background, fighter, item] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
    classByName(Classes.FIGHTER_2014),
    prisma.magicItem.findFirstOrThrow({ where: { ruleset: "RULES_2014" }, select: { magicItemId: true } }),
  ]);
  await prisma.user.create({ data: { email, name: "Заряди" } });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  const pmi = await prisma.persMagicItem.create({ data: { persId: created.persId, magicItemId: item.magicItemId } });
  return pmi.persMagicItemId;
}

const readCharges = (persMagicItemId: number) =>
  prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId }, select: { chargesMax: true, chargesCurrent: true } });

describe("KR31.13 — ручний лічильник зарядів магічного предмета (L10-sheet-config-06)", () => {
  it("максимум заповнює предмет, витрата й повернення тримаються в межах, порожній максимум прибирає лічильник", async () => {
    const persMagicItemId = await createPersWithMagicItem("charges-owner@test.local");

    expect((await setMagicItemChargesMax(persMagicItemId, 7)).success).toBe(true);
    expect(await readCharges(persMagicItemId)).toEqual({ chargesMax: 7, chargesCurrent: 7 });

    await stepMagicItemCharges(persMagicItemId, -3);
    await stepMagicItemCharges(persMagicItemId, -5);
    expect(await readCharges(persMagicItemId)).toEqual({ chargesMax: 7, chargesCurrent: 0 });

    await stepMagicItemCharges(persMagicItemId, 2);
    expect(await readCharges(persMagicItemId)).toEqual({ chargesMax: 7, chargesCurrent: 2 });

    await setMagicItemChargesMax(persMagicItemId, null);
    expect(await readCharges(persMagicItemId)).toEqual({ chargesMax: null, chargesCurrent: null });
  });

  it("чужий гравець зарядів не змінює", async () => {
    const persMagicItemId = await createPersWithMagicItem("charges-owner@test.local");
    await setMagicItemChargesMax(persMagicItemId, 5);

    await prisma.user.create({ data: { email: "charges-stranger@test.local", name: "Чужий" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: "charges-stranger@test.local" } } as never);

    expect((await stepMagicItemCharges(persMagicItemId, -1)).success).toBe(false);
    expect(await readCharges(persMagicItemId)).toEqual({ chargesMax: 5, chargesCurrent: 5 });
  });
});
