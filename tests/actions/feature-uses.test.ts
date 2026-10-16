import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { restoreFeatureUse, spendFeatureUse } from "@/lib/actions/feature-uses";
import { minimalForm } from "../helpers/build-form";
import { withCreationSpells } from "../helpers/creation-spells";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createPers(email: string, className: Classes) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(className),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(await withCreationSpells(minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId })));
  if ("error" in created) throw new Error(created.error);
  return created.persId;
}

async function findClassFeatureId(engName: string, className: Classes) {
  const feature = await prisma.feature.findFirstOrThrow({
    where: { engName, classFeatures: { some: { class: { name: className } } } },
    select: { featureId: true },
  });
  return feature.featureId;
}

describe.each([
  { path: "без ідентифікатора операції", nextOperationId: (): string | undefined => undefined },
  { path: "з ідентифікатором операції", nextOperationId: (): string | undefined => randomUUID() },
])("Ресурси рис з листа $path", ({ nextOperationId }) => {
  it("Лють витрачається до нуля й відновлюється лише до стелі рівня", async () => {
    const persId = await createPers("feature-uses-rage@golden.test", Classes.BARBARIAN_2014);
    const featureId = await findClassFeatureId("Rage", Classes.BARBARIAN_2014);
    const where = { persId_featureId: { persId, featureId } };
    await prisma.persFeature.upsert({ where, create: { persId, featureId, usesRemaining: 2 }, update: { usesRemaining: 2 } });

    const steps = [
      { change: spendFeatureUse, remaining: 1 },
      { change: spendFeatureUse, remaining: 0 },
      { change: spendFeatureUse, remaining: 0 },
      { change: restoreFeatureUse, remaining: 1 },
      { change: restoreFeatureUse, remaining: 2 },
      { change: restoreFeatureUse, remaining: 2 },
    ];
    for (const { change, remaining } of steps) {
      await expect(change({ persId, featureId, operationId: nextOperationId() })).resolves.toEqual({ success: true, usesRemaining: remaining });
      expect((await prisma.persFeature.findUniqueOrThrow({ where, select: { usesRemaining: true } })).usesRemaining).toBe(remaining);
    }
  });

  it("спільний пул Дикої форми рахується в окремому лічильнику пулу", async () => {
    const persId = await createPers("feature-uses-pool@golden.test", Classes.DRUID_2014);
    await prisma.pers.update({ where: { persId }, data: { level: 2 } });
    const featureId = await findClassFeatureId("Wild Shape", Classes.DRUID_2014);
    const readPool = async () =>
      (await prisma.persResourcePool.findUnique({ where: { persId_poolKey: { persId, poolKey: "WILD_SHAPE" } }, select: { usesRemaining: true } }))?.usesRemaining;

    const steps = [
      { change: spendFeatureUse, remaining: 1 },
      { change: restoreFeatureUse, remaining: 2 },
      { change: restoreFeatureUse, remaining: 2 },
    ];
    for (const { change, remaining } of steps) {
      await expect(change({ persId, featureId, operationId: nextOperationId() })).resolves.toEqual({ success: true, usesRemaining: remaining });
      expect(await readPool()).toBe(remaining);
    }
  });

  it("риса без лічильника, невідома риса й чужий гравець нічого не змінюють", async () => {
    const persId = await createPers("feature-uses-denied@golden.test", Classes.BARBARIAN_2014);
    const unarmoredDefense = await findClassFeatureId("Unarmored Defense", Classes.BARBARIAN_2014);
    const rage = await findClassFeatureId("Rage", Classes.BARBARIAN_2014);
    const where = { persId_featureId: { persId, featureId: rage } };
    await prisma.persFeature.upsert({ where, create: { persId, featureId: rage, usesRemaining: 2 }, update: { usesRemaining: 2 } });

    await expect(spendFeatureUse({ persId, featureId: unarmoredDefense, operationId: nextOperationId() })).resolves.toEqual({ success: true, usesRemaining: null });
    await expect(spendFeatureUse({ persId, featureId: 2_000_000_000, operationId: nextOperationId() })).resolves.toEqual({ success: false, error: "Вміння не знайдено" });

    await prisma.user.create({ data: { email: "feature-uses-stranger@golden.test", name: "Чужий" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: "feature-uses-stranger@golden.test" } } as never);
    await expect(spendFeatureUse({ persId, featureId: rage, operationId: nextOperationId() })).resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });
    await expect(restoreFeatureUse({ persId, featureId: rage, operationId: nextOperationId() })).resolves.toEqual({ success: false, error: "Немає доступу до персонажа" });
    expect((await prisma.persFeature.findUniqueOrThrow({ where, select: { usesRemaining: true } })).usesRemaining).toBe(2);
  });
});
