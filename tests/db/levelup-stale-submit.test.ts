import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { executeLevelUp } from "@/server/db/levelup-persistence";
import { parseLevelUpInput } from "@/lib/zod/schemas/levelUpSchema";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

/// KR49.11: підтвердження з іншої вкладки або повтор того самого запиту не піднімає персонажа
/// вдруге й не лишає зайвого знімка.

beforeEach(resetUserData);
afterAll(disconnectDatabase);

const EMAIL = "levelup-stale@test.local";
const STALE_LEVEL_ERROR = "Рівень персонажа вже змінився. Оновіть сторінку.";

async function createFighterAtLevelTwo() {
  const [fighter, race, background] = await Promise.all([classByName("FIGHTER_2014"), raceByName("HUMAN_2014"), backgroundByName("ACOLYTE")]);
  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id, name: "Воїн на межі рівня", ruleset: "RULES_2014",
      classId: fighter.classId, raceId: race.raceId, backgroundId: background.backgroundId,
      level: 2, currentHp: 20, maxHp: 20, str: 16, dex: 14, con: 14, int: 10, wis: 12, cha: 8,
    },
  });
  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return { persId: pers.persId, classId: fighter.classId };
}

function buildInput(classId: number, expectedLevel?: number) {
  return parseLevelUpInput({ levelUpPath: "EXISTING", classId, levelUpHpIncrease: 6, ...(expectedLevel === undefined ? {} : { expectedLevel }) });
}

async function readLevelAndSnapshots(persId: number) {
  const [pers, snapshots] = await Promise.all([
    prisma.pers.findUniqueOrThrow({ where: { persId }, select: { level: true, maxHp: true } }),
    prisma.pers.count({ where: { parentPersId: persId, isSnapshot: true } }),
  ]);
  return { ...pers, snapshots };
}

describe("застарілий або повторний submit підвищення", () => {
  it("два одночасні підтвердження з одного рівня дають один рівень і один знімок", async () => {
    const { persId, classId } = await createFighterAtLevelTwo();

    const results = await Promise.all([executeLevelUp(persId, buildInput(classId, 2)), executeLevelUp(persId, buildInput(classId, 2))]);

    expect(results).toEqual(expect.arrayContaining([{ success: true }, { error: STALE_LEVEL_ERROR }]));
    expect(await readLevelAndSnapshots(persId)).toEqual({ level: 3, maxHp: 28, snapshots: 1 });
  });

  it("одночасні підтвердження без очікуваного рівня теж не піднімають двічі", async () => {
    const { persId, classId } = await createFighterAtLevelTwo();

    const results = await Promise.all([executeLevelUp(persId, buildInput(classId)), executeLevelUp(persId, buildInput(classId))]);

    expect(results.filter((result) => "success" in result)).toHaveLength(1);
    expect(await readLevelAndSnapshots(persId)).toEqual({ level: 3, maxHp: 28, snapshots: 1 });
  });

  it("повтор запиту після успішного підвищення повертає зміну рівня й нічого не пише", async () => {
    const { persId, classId } = await createFighterAtLevelTwo();

    expect(await executeLevelUp(persId, buildInput(classId, 2))).toEqual({ success: true });
    expect(await executeLevelUp(persId, buildInput(classId, 2))).toEqual({ error: STALE_LEVEL_ERROR });

    expect(await readLevelAndSnapshots(persId)).toEqual({ level: 3, maxHp: 28, snapshots: 1 });
  });

  it("очікуваний рівень з іншого стану відхиляється до знімка", async () => {
    const { persId, classId } = await createFighterAtLevelTwo();

    expect(await executeLevelUp(persId, buildInput(classId, 1))).toEqual({ error: STALE_LEVEL_ERROR });

    expect(await readLevelAndSnapshots(persId)).toEqual({ level: 2, maxHp: 20, snapshots: 0 });
  });
});
