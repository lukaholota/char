import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { executeLevelUp } from "@/server/db/levelup-persistence";
import { parseLevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

/// KR31.3, знахідка `L08-levelup-machine-08`. Слоти доростали на дельту максимуму ще з
/// `applyLevelUp`, а `usesRemaining` не рухався ніде, крім відпочинку. Перевірка йде на живих
/// даних 2014: Лють — `[{lvl 1: 2}, {lvl 3: 3}, ...]`, тож варвар 2 → 3 має дістати рівно одне.

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const EMAIL = "levelup-uses@test.local";

async function createBarbarianAtLevelTwo(usesRemaining: number | null) {
  const [barbarian, race, background] = await Promise.all([
    classByName("BARBARIAN_2014"),
    raceByName("HUMAN_2014"),
    backgroundByName("ACOLYTE"),
  ]);
  const rage = await prisma.feature.findFirstOrThrow({
    where: { engName: "Rage", ruleset: "RULES_2014" },
  });

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Варвар на межі рівня",
      ruleset: "RULES_2014",
      classId: barbarian.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: 2,
      currentHp: 20,
      maxHp: 20,
      str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8,
    },
  });
  await prisma.persFeature.create({
    data: { persId: pers.persId, featureId: rage.featureId, usesRemaining },
  });

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return { persId: pers.persId, classId: barbarian.classId, featureId: rage.featureId };
}

async function levelUp(persId: number, classId: number) {
  const result = await executeLevelUp(persId, parseLevelUpInput({
    levelUpPath: "EXISTING",
    classId,
    levelUpHpIncrease: 6,
  }));
  expect(result).toEqual({ success: true });
}

async function findRageUses(persId: number, featureId: number) {
  const row = await prisma.persFeature.findUniqueOrThrow({
    where: { persId_featureId: { persId, featureId } },
  });
  return row.usesRemaining;
}

describe("підвищення рівня доростає лічильники використань", () => {
  it("варвар, що витратив усі люті на 2-му рівні, входить у 3-й з однією", async () => {
    const { persId, classId, featureId } = await createBarbarianAtLevelTwo(0);

    await levelUp(persId, classId);

    expect(await prisma.pers.findUniqueOrThrow({ where: { persId } })).toMatchObject({ level: 3 });
    expect(await findRageUses(persId, featureId)).toBe(1);
  });

  it("частково витрачений лічильник доростає на ту саму дельту", async () => {
    const { persId, classId, featureId } = await createBarbarianAtLevelTwo(1);

    await levelUp(persId, classId);

    expect(await findRageUses(persId, featureId)).toBe(2);
  });

  it("нерозтрачений лічильник лишається порожнім — це «повний», а не нуль", async () => {
    const { persId, classId, featureId } = await createBarbarianAtLevelTwo(null);

    await levelUp(persId, classId);

    expect(await findRageUses(persId, featureId)).toBeNull();
  });
});
