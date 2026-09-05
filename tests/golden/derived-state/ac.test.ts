import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Ability, ArmorCategory, BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { disconnectDatabase, resetUserData } from "../../user-data";
import { minimalForm } from "../../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../../helpers/seed-lookup";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { createCharacter } from "@/lib/actions/character";
import { getPersById } from "@/lib/actions/pers";
import { calculateFinalAC } from "@/lib/logic/bonus-calculator";

const AC_CASES = [
  { name: "без броні: 10 + DEX 18", armor: null, shield: false, defense: false, ring: false, bracers: false, expected: 14 },
  { name: "Leather (FULL): 11 + DEX 18", armor: ArmorCategory.LEATHER, shield: false, defense: false, ring: false, bracers: false, expected: 15 },
  { name: "Scale Mail (MAX2): 14 + min(DEX 18, +2)", armor: ArmorCategory.SCALE_MAIL, shield: false, defense: false, ring: false, bracers: false, expected: 16 },
  { name: "Chain Mail (NONE): 16 без DEX", armor: ArmorCategory.CHAIN_MAIL, shield: false, defense: false, ring: false, bracers: false, expected: 16 },
  { name: "Chain Mail + щит + додатковий бонус щита", armor: ArmorCategory.CHAIN_MAIL, shield: true, defense: false, ring: false, bracers: false, expected: 19 },
  { name: "броня + Fighting Style: Defense", armor: ArmorCategory.CHAIN_MAIL, shield: true, defense: true, ring: false, bracers: false, expected: 20 },
  { name: "броня + Defense + attuned Ring of Protection", armor: ArmorCategory.CHAIN_MAIL, shield: true, defense: true, ring: true, bracers: false, expected: 21 },
  { name: "без броні й щита: Ring of Protection + Bracers of Defense", armor: null, shield: false, defense: false, ring: true, bracers: true, expected: 17 },
] as const;

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR2.4 — calculateFinalAC", () => {
  it("покриває FULL / MAX2 / NONE, щит, фічу й магічні предмети", async () => {
    const persId = await createOwnedFighter();
    await prisma.pers.update({ where: { persId }, data: { dex: 18 } });

    const [defense, ring, bracers] = await Promise.all([
      prisma.feature.findUniqueOrThrow({ where: { engName: "Defense" }, select: { featureId: true } }),
      prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Ring of Protection", ruleset: "RULES_2014" } }, select: { magicItemId: true } }),
      prisma.magicItem.findUniqueOrThrow({ where: { engName_ruleset: { engName: "Bracers of Defense", ruleset: "RULES_2014" } }, select: { magicItemId: true } }),
    ]);
    await prisma.persMagicItem.createMany({
      data: [
        { persId, magicItemId: ring.magicItemId, isEquipped: false, isAttuned: true },
        { persId, magicItemId: bracers.magicItemId, isEquipped: false, isAttuned: true },
      ],
    });

    for (const testCase of AC_CASES) {
      await configureCase(persId, testCase, defense.featureId, ring.magicItemId, bracers.magicItemId);
      const pers = await getPersById(persId);
      if (!pers) throw new Error(`Персонажа ${persId} не знайдено.`);
      expect(calculateFinalAC(pers), testCase.name).toBe(testCase.expected);
    }
  }, 30_000);
});

async function createOwnedFighter(): Promise<number> {
  const user = await prisma.user.create({
    data: { email: "ac@golden.test", name: "Golden Test User" },
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
  testCase: (typeof AC_CASES)[number],
  defenseFeatureId: number,
  ringId: number,
  bracersId: number,
) {
  await prisma.persArmor.deleteMany({ where: { persId } });
  if (testCase.armor) {
    // KR16.5 зробив назву обладунку унікальною в парі з редакцією: `LEATHER` тепер два рядки.
    const armor = await prisma.armor.findUniqueOrThrow({
      where: { name_ruleset: { name: testCase.armor, ruleset: "RULES_2014" } },
    });
    await prisma.persArmor.create({
      data: {
        persId,
        armorId: armor.armorId,
        equipped: true,
        isProficient: true,
        abilityBonuses: armor.abilityBonuses,
        abilityBonusType: armor.abilityBonusType,
      },
    });
  }

  await prisma.pers.update({
    where: { persId },
    data: { wearsShield: testCase.shield, additionalShieldBonus: testCase.shield ? 1 : 0 },
  });
  await prisma.persFeature.deleteMany({ where: { persId, featureId: defenseFeatureId } });
  if (testCase.defense) {
    await prisma.persFeature.create({ data: { persId, featureId: defenseFeatureId } });
  }

  await prisma.persMagicItem.updateMany({
    where: { persId, magicItemId: ringId },
    data: { isEquipped: testCase.ring },
  });
  await prisma.persMagicItem.updateMany({
    where: { persId, magicItemId: bracersId },
    data: { isEquipped: testCase.bracers },
  });
}
