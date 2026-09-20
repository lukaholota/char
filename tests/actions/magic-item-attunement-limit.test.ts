import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { updateMagicItem } from "@/lib/actions/magic-item-actions";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createOwnedCharacter(email: string, classId: number) {
  const [race, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
  const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId, backgroundId: background.backgroundId })));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function attachMagicItems(persId: number, skip: number, count: number, isAttuned: boolean) {
  const items = await prisma.magicItem.findMany({ skip, take: count, select: { magicItemId: true } });
  if (items.length < count) throw new Error(`Потрібно принаймні ${skip + count} магічних предметів у контенті`);

  const created = await Promise.all(
    items.map((item) => prisma.persMagicItem.create({ data: { persId, magicItemId: item.magicItemId, isAttuned } })),
  );
  return created.map((pmi) => pmi.persMagicItemId);
}

describe("KR31.9 — ліміт налаштованих магічних предметів (L10-sheet-config-05, L19-parity-competitors-07)", () => {
  it("четвертий предмет без Артифайсера відхиляється, вже налаштовані три лишаються без змін", async () => {
    const user = await prisma.user.create({ data: { email: `attune-${Math.random()}@holota.family`, name: "Attune" } });
    const fighter = await classByName(Classes.FIGHTER_2014);
    const persId = await createOwnedCharacter(user.email, fighter.classId);

    await attachMagicItems(persId, 0, 3, true);
    const [fourthId] = await attachMagicItems(persId, 3, 1, false);

    const result = await updateMagicItem(fourthId, { isAttuned: true });

    expect(result.success).toBe(false);
    await expect(
      prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId: fourthId }, select: { isAttuned: true } }),
    ).resolves.toEqual({ isAttuned: false });
  });

  it("повторне збереження вже налаштованого предмета не блокується лімітом", async () => {
    const user = await prisma.user.create({ data: { email: `attune-${Math.random()}@holota.family`, name: "Attune" } });
    const fighter = await classByName(Classes.FIGHTER_2014);
    const persId = await createOwnedCharacter(user.email, fighter.classId);

    const [alreadyAttunedId] = await attachMagicItems(persId, 0, 3, true);

    const result = await updateMagicItem(alreadyAttunedId, { isEquipped: true, isAttuned: true });

    expect(result.success).toBe(true);
  });

  it("Артифайсер 10 рівня — четвертий предмет дозволено, пʼятий — ні", async () => {
    const user = await prisma.user.create({ data: { email: `attune-${Math.random()}@holota.family`, name: "Attune" } });
    const artificer = await classByName(Classes.ARTIFICER_2014);
    const persId = await createOwnedCharacter(user.email, artificer.classId);
    await prisma.pers.update({ where: { persId }, data: { level: 10 } });

    await attachMagicItems(persId, 0, 3, true);
    const [fourthId] = await attachMagicItems(persId, 3, 1, false);

    const fourthResult = await updateMagicItem(fourthId, { isAttuned: true });
    expect(fourthResult.success).toBe(true);

    const [fifthId] = await attachMagicItems(persId, 4, 1, false);
    const fifthResult = await updateMagicItem(fifthId, { isAttuned: true });
    expect(fifthResult.success).toBe(false);
  });
});
