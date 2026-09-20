/**
 * KR31.13 / L10-sheet-config-15 — тип шкоди й дальність зброї, які гравець змінив у налаштуванні,
 * доходять до рядка pers_weapon.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { addWeapon, updateWeapon } from "@/server/db/equipment-actions";

const EMAIL = "weapon-customize-overrides@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighterWithDagger() {
  const [cls, race, background, dagger] = await Promise.all([
    classByName("FIGHTER_2024"),
    raceByName("HUMAN_2024"),
    backgroundByName("ACOLYTE"),
    prisma.weapon.findUniqueOrThrow({ where: { name_ruleset: { name: "DAGGER", ruleset: "RULES_2024" } } }),
  ]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Воїн",
      ruleset: "RULES_2024",
      classId: cls.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 1,
      currentHp: 12,
      maxHp: 12,
      str: 16, dex: 12, con: 14, int: 10, wis: 10, cha: 10,
    },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  const added = await addWeapon(pers.persId, dagger.weaponId, {});
  if (!added.success || !added.weapon) throw new Error(JSON.stringify(added));
  return added.weapon;
}

describe("налаштування зброї на листі", () => {
  it("зберігає тип шкоди й дальність, а порожні значення повертають книжні", async () => {
    const dagger = await createFighterWithDagger();

    await updateWeapon(dagger.persWeaponId, { overrideDamageType: "COLD", overrideNormalRange: 30, overrideLongRange: 90 });
    const customized = await prisma.persWeapon.findUniqueOrThrow({ where: { persWeaponId: dagger.persWeaponId } });
    expect([customized.overrideDamageType, customized.overrideNormalRange, customized.overrideLongRange]).toEqual(["COLD", 30, 90]);

    await updateWeapon(dagger.persWeaponId, { overrideDamageType: null, overrideNormalRange: null, overrideLongRange: null });
    const reset = await prisma.persWeapon.findUniqueOrThrow({ where: { persWeaponId: dagger.persWeaponId } });
    expect([reset.overrideDamageType, reset.overrideNormalRange, reset.overrideLongRange]).toEqual([null, null, null]);
  });
});
