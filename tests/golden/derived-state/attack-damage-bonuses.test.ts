import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races, Ruleset, WeaponCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../../user-data";
import { minimalForm } from "../../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getPersById } from "@/lib/actions/pers";
import { calculateWeaponAttackBonus, calculateWeaponDamageBonus } from "@/lib/logic/bonus-calculator";

const ACTIVE_RULESET: Ruleset = "RULES_2014";

const BONUS_CASES = [
  { name: "Longbow: базова атака й шкода", weapon: WeaponCategory.LONGBOW, features: [], bracers: false, attack: 4, damage: 2 },
  { name: "Longbow + Archery: +2 до атаки", weapon: WeaponCategory.LONGBOW, features: ["Archery"], bracers: false, attack: 6, damage: 2 },
  { name: "Longbow + Archery + Bracers of Archery: +2 до ranged damage", weapon: WeaponCategory.LONGBOW, features: ["Archery"], bracers: true, attack: 6, damage: 4 },
  { name: "Longsword + Dueling: +2 до one-handed melee damage", weapon: WeaponCategory.LONGSWORD, features: ["Dueling"], bracers: false, attack: 5, damage: 5 },
] as const;

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR2.4 — бонуси атаки й шкоди від фіч і magic items", () => {
  it("рахує реальні Fighting Styles і Bracers of Archery", async () => {
    const persId = await createOwnedFighter();
    const [archery, dueling, bracers, longbow, longsword] = await Promise.all([
      prisma.feature.findUniqueOrThrow({ where: { engName: "Archery" }, select: { featureId: true } }),
      prisma.feature.findUniqueOrThrow({ where: { engName: "Dueling" }, select: { featureId: true } }),
      prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Bracers of Archery", ruleset: "RULES_2014" } }, select: { magicItemId: true } }),
      prisma.weapon.findUniqueOrThrow({ where: { name_ruleset: { name: WeaponCategory.LONGBOW, ruleset: ACTIVE_RULESET } } }),
      prisma.weapon.findUniqueOrThrow({ where: { name_ruleset: { name: WeaponCategory.LONGSWORD, ruleset: ACTIVE_RULESET } } }),
    ]);
    const featureIds = new Map([["Archery", archery.featureId], ["Dueling", dueling.featureId]]);
    const weaponIds = new Map([[WeaponCategory.LONGBOW, longbow.weaponId], [WeaponCategory.LONGSWORD, longsword.weaponId]]);

    await prisma.pers.update({ where: { persId }, data: { str: 16, dex: 14 } });
    await prisma.persMagicItem.create({ data: { persId, magicItemId: bracers.magicItemId, isEquipped: false, isAttuned: true } });

    for (const testCase of BONUS_CASES) {
      await configureCase(persId, testCase, featureIds, weaponIds, bracers.magicItemId);
      const pers = await getPersById(persId);
      if (!pers) throw new Error(`Персонажа ${persId} не знайдено.`);
      const weapon = pers.weapons[0];
      if (!weapon) throw new Error("Тестова зброя не створена.");

      expect(calculateWeaponAttackBonus(pers, weapon), testCase.name).toBe(testCase.attack);
      expect(calculateWeaponDamageBonus(pers, weapon), testCase.name).toBe(testCase.damage);
    }
  }, 30_000);
});

async function createOwnedFighter(): Promise<number> {
  const user = await prisma.user.create({
    data: { email: "attack-damage-bonuses@golden.test", name: "Golden Test User" },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, fighterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const result = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: fighterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in result) throw new Error(`createCharacter повернув ${result.error}`);
  return result.persId;
}

async function configureCase(
  persId: number,
  testCase: (typeof BONUS_CASES)[number],
  featureIds: Map<string, number>,
  weaponIds: Map<WeaponCategory, number>,
  bracersId: number,
) {
  await prisma.persFeature.deleteMany({ where: { persId, featureId: { in: [...featureIds.values()] } } });
  await prisma.persWeapon.deleteMany({ where: { persId } });
  await prisma.persMagicItem.updateMany({ where: { persId, magicItemId: bracersId }, data: { isEquipped: testCase.bracers } });

  await prisma.persFeature.createMany({
    data: testCase.features.map((name) => ({ persId, featureId: featureIds.get(name)! })),
  });
  await prisma.persWeapon.create({ data: { persId, weaponId: weaponIds.get(testCase.weapon)!, isProficient: true } });
}
