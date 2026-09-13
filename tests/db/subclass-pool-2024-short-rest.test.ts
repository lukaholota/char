/**
 * KR31.3 — наскрізний доказ, якого не було в класовому проході: підкласова фіча витрачає
 * **класовий** пул, і суддя пулу лишає максимум за класовою фічею.
 *
 * Класовий прохід перевіряв пул, у якого претендент один. Тут їх двоє: `CHANNEL_DIVINITY`
 * несуть і «Божественний канал» клірика (таблиця рівнів), і «Збереження життя» Домену життя
 * (сама витрата). Якби витратна фіча дістала власний максимум, `findPoolProvider` міг би взяти
 * її — і пул клірика 3-го рівня показав би одне використання замість двох (BUG-011).
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { classByName, backgroundByName, raceByName, subclassByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { spendFeatureUse } from "@/server/db/feature-uses";
import { getCharacterFeaturesGrouped } from "@/server/db/pers-actions";
import { findPoolProviderForPers } from "@/server/db/resource-pool-provider";
import { shortRest } from "@/server/db/rest-actions";

const EMAIL = "subclass-pool-2024@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

/**
 * Лист малює риси з рядків `pers_feature`, тож фікстура повторює те, що робить створення
 * персонажа: видає й класові, й підкласові фічі свого рівня. `usesRemaining: null` означає
 * «повний запас», а не нуль.
 */
async function createLifeCleric(level: number) {
  const [cls, race, background] = await Promise.all([
    classByName("CLERIC_2024"),
    raceByName("HUMAN_2024"),
    backgroundByName("ACOLYTE"),
  ]);
  const subclass = await subclassByName(cls.classId, "LIFE_DOMAIN");

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Клірик Домену життя",
      ruleset: "RULES_2024",
      classId: cls.classId,
      subclassId: subclass.subclassId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level,
      currentHp: 20,
      maxHp: 20,
      str: 12, dex: 12, con: 14, int: 10, wis: 16, cha: 10,
    },
  });

  await grantOwnedFeatures(pers.persId, cls.classId, subclass.subclassId, level);

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers.persId;
}

async function grantOwnedFeatures(persId: number, classId: number, subclassId: number, level: number) {
  const [classFeatures, subclassFeatures] = await Promise.all([
    prisma.classFeature.findMany({ where: { classId, levelGranted: { lte: level } }, select: { featureId: true } }),
    prisma.subclassFeature.findMany({ where: { subclassId, levelGranted: { lte: level } }, select: { featureId: true } }),
  ]);

  await prisma.persFeature.createMany({
    data: [...classFeatures, ...subclassFeatures].map((link) => ({ persId, featureId: link.featureId, usesRemaining: null })),
    skipDuplicates: true,
  });
}

async function findFeature(engName: string) {
  return prisma.feature.findFirstOrThrow({ where: { engName } });
}

async function findPoolUses(persId: number, poolKey: string) {
  const row = await prisma.persResourcePool.findUniqueOrThrow({ where: { persId_poolKey: { persId, poolKey } } });
  return row.usesRemaining;
}

describe("підкласова фіча 2024 витрачає класовий пул", () => {
  it("Збереження життя витрачає Божественний канал, і короткий відпочинок повертає рівно одне", async () => {
    const persId = await createLifeCleric(3);
    const preserveLife = await findFeature("Life Domain: Preserve Life (2024)");

    expect(preserveLife.usesPoolKey).toBe("CHANNEL_DIVINITY");

    const first = await spendFeatureUse({ persId, featureId: preserveLife.featureId });
    const second = await spendFeatureUse({ persId, featureId: preserveLife.featureId });
    expect([first, second]).toMatchObject([{ usesRemaining: 1 }, { usesRemaining: 0 }]);

    await expect(shortRest(persId, [])).resolves.toMatchObject({ success: true });

    expect(await findPoolUses(persId, "CHANNEL_DIVINITY")).toBe(1);
  });

  it("максимум пулу задає класова фіча, а не підкласова витрата", async () => {
    const persId = await createLifeCleric(3);

    const provider = await findPoolProviderForPers({ persId, poolKey: "CHANNEL_DIVINITY" });

    expect(provider?.engName).toBe("Cleric: Channel Divinity (2024)");
  });

  it("лист показує пул із максимумом клірика, а витратна фіча лічильника не має", async () => {
    const persId = await createLifeCleric(3);
    const grouped = await getCharacterFeaturesGrouped(persId);
    const all = [
      ...(grouped?.actions ?? []),
      ...(grouped?.bonusActions ?? []),
      ...(grouped?.reactions ?? []),
      ...(grouped?.passive ?? []),
    ];

    const [provider, spender] = await Promise.all([
      findFeature("Cleric: Channel Divinity (2024)"),
      findFeature("Life Domain: Preserve Life (2024)"),
    ]);

    expect(all.find((item) => item.featureId === provider.featureId)).toMatchObject({
      usesPer: 2,
      restType: "SHORT_REST",
    });

    /// Витратний рядок показує той самий максимум пулу, а не власний — свого він не має.
    expect(all.find((item) => item.featureId === spender.featureId)).toMatchObject({
      usesPer: 2,
      usesPoolKey: "CHANNEL_DIVINITY",
    });
  });
});
