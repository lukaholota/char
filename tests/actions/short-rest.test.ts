import { randomUUID } from "node:crypto";
import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { shortRest } from "@/lib/actions/rest-actions";
import { minimalForm } from "../helpers/build-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createTiredFighter(email: string) {
  const user = await prisma.user.create({ data: { email, name: email } });
  vi.mocked(auth).mockResolvedValue({ user: { email: user.email } } as never);

  const [race, characterClass, background] = await Promise.all([
    raceByName(Races.HUMAN_2014),
    classByName(Classes.FIGHTER_2014),
    backgroundByName(BackgroundCategory.SOLDIER),
  ]);
  const created = await createCharacter(
    minimalForm({ raceId: race.raceId, classId: characterClass.classId, backgroundId: background.backgroundId }),
  );
  if ("error" in created) throw new Error(created.error);
  const persId = created.persId;

  const secondWind = await prisma.feature.findFirstOrThrow({
    where: { engName: "Second Wind", classFeatures: { some: { class: { name: Classes.FIGHTER_2014 } } } },
    select: { featureId: true },
  });
  const secondWindKey = { persId_featureId: { persId, featureId: secondWind.featureId } };
  await prisma.pers.update({
    where: { persId },
    data: { currentHp: 3, maxHp: 10, tempHp: 2, currentHitDice: { [characterClass.classId]: 1 }, currentPactSlots: 0 },
  });
  await prisma.persFeature.update({ where: secondWindKey, data: { usesRemaining: 0 } });

  const readState = async () => {
    const [pers, feature] = await Promise.all([
      prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentHp: true, tempHp: true, currentHitDice: true, currentPactSlots: true } }),
      prisma.persFeature.findUniqueOrThrow({ where: secondWindKey, select: { usesRemaining: true } }),
    ]);
    return { ...pers, secondWind: feature.usesRemaining };
  };

  return { persId, classId: characterClass.classId, readState };
}

describe.each([
  { path: "без ідентифікатора операції", nextOperationId: (): string | undefined => undefined },
  { path: "з ідентифікатором операції", nextOperationId: (): string | undefined => randomUUID() },
])("Короткий відпочинок з листа $path", ({ nextOperationId }) => {
  it("кубик здоровʼя додає кинуті хіти, ресурси короткого відпочинку повертаються", async () => {
    const fighter = await createTiredFighter("short-rest-dice@golden.test");

    await expect(shortRest(fighter.persId, [{ classId: fighter.classId, count: 1 }], 4, nextOperationId())).resolves.toEqual({
      success: true,
      hpRestored: 4,
      newCurrentHp: 7,
      currentHitDice: { [fighter.classId]: 0 },
      currentPactSlots: 0,
      featuresRestored: 1,
    });
    expect(await fighter.readState()).toEqual({
      currentHp: 7,
      tempHp: 2,
      currentHitDice: { [fighter.classId]: 0 },
      currentPactSlots: 0,
      secondWind: 1,
    });
  });

  it("хіти не ростуть понад максимум, а відпочинок без кубиків лише повертає ресурси", async () => {
    const fighter = await createTiredFighter("short-rest-no-dice@golden.test");
    await prisma.pers.update({ where: { persId: fighter.persId }, data: { currentHp: 9 } });

    await expect(shortRest(fighter.persId, [{ classId: fighter.classId, count: 1 }], 8, nextOperationId())).resolves.toMatchObject({
      success: true,
      hpRestored: 8,
      newCurrentHp: 10,
    });
    await expect(shortRest(fighter.persId, [], undefined, nextOperationId())).resolves.toEqual({
      success: true,
      hpRestored: 0,
      newCurrentHp: 10,
      currentHitDice: { [fighter.classId]: 0 },
      currentPactSlots: 0,
      featuresRestored: 1,
    });
  });

  it("зайвий кубик і чужий гравець отримують відмову без змін", async () => {
    const fighter = await createTiredFighter("short-rest-denied@golden.test");
    const before = await fighter.readState();

    await expect(shortRest(fighter.persId, [{ classId: fighter.classId, count: 2 }], 4, nextOperationId())).resolves.toEqual({
      success: false,
      error: `Недостатньо кубиків здоровʼя для класу ${fighter.classId}`,
    });

    await prisma.user.create({ data: { email: "short-rest-stranger@golden.test", name: "Чужий" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: "short-rest-stranger@golden.test" } } as never);
    await expect(shortRest(fighter.persId, [{ classId: fighter.classId, count: 1 }], 4, nextOperationId())).resolves.toEqual({
      success: false,
      error: "Немає доступу до персонажа",
    });
    expect(await fighter.readState()).toEqual(before);
  });
});
