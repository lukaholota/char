import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { updateMagicItem } from "@/lib/actions/magic-item-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighterWithWeapon(email: string) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email } } as never);
  const [race, characterClass, background, weapon] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
    prisma.weapon.findFirstOrThrow({ select: { weaponId: true } }),
  ]);
  const created = await createCharacter(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }));
  if ("error" in created) throw new Error(created.error);
  const persWeapon = await prisma.persWeapon.create({ data: { persId: created.persId, weaponId: weapon.weaponId } });
  return { user, persId: created.persId, persWeaponId: persWeapon.persWeaponId };
}

describe("O53 — магічна зброя привʼязується до зброї листа", () => {
  it("привʼязує до своєї зброї, відмовляє з чужою й не пише сторонніх полів", async () => {
    const other = await createFighterWithWeapon("magic-weapon-other@golden.test");
    const own = await createFighterWithWeapon("magic-weapon-own@golden.test");
    const item = await prisma.magicItem.findFirstOrThrow({ where: { engName: "Weapon +2", ruleset: "RULES_2014" }, select: { magicItemId: true } });
    const link = await prisma.persMagicItem.create({ data: { persId: own.persId, magicItemId: item.magicItemId } });

    await expect(updateMagicItem(link.persMagicItemId, { persWeaponId: own.persWeaponId, isEquipped: true }))
      .resolves.toMatchObject({ success: true, item: { persWeaponId: own.persWeaponId, isEquipped: true } });

    await expect(updateMagicItem(link.persMagicItemId, { persWeaponId: other.persWeaponId }))
      .resolves.toEqual({ success: false, error: "Цієї зброї немає на листі персонажа" });

    await updateMagicItem(link.persMagicItemId, { persWeaponId: null, persId: other.persId } as never);
    await expect(prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId: link.persMagicItemId } }))
      .resolves.toMatchObject({ persId: own.persId, persWeaponId: null });

    await updateMagicItem(link.persMagicItemId, { persWeaponId: own.persWeaponId });
    await prisma.persWeapon.delete({ where: { persWeaponId: own.persWeaponId } });
    await expect(prisma.persMagicItem.findUniqueOrThrow({ where: { persMagicItemId: link.persMagicItemId } }))
      .resolves.toMatchObject({ persWeaponId: null });
  });
});
