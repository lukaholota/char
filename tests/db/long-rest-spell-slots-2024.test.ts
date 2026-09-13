/**
 * KR31.6 / BUG-010 — довгий відпочинок 2024 видає слоти за рівнем заклинача, а не за загальним
 * рівнем персонажа.
 */

import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { Classes } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";
import { longRest } from "@/server/db/rest-actions";

const EMAIL = "long-rest-slots-2024@test.local";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

async function createFighter2024(input: { level: number; multiclass?: { name: Classes; classLevel: number } }) {
  const [fighter, race, background, multiclass] = await Promise.all([
    classByName("FIGHTER_2024"),
    raceByName("HUMAN_2024"),
    backgroundByName("ACOLYTE"),
    input.multiclass ? classByName(input.multiclass.name) : Promise.resolve(null),
  ]);

  const user = await prisma.user.create({ data: { email: EMAIL, name: "Тестовий гравець" } });
  const pers = await prisma.pers.create({
    data: {
      userId: user.id,
      name: "Воїн 2024",
      ruleset: "RULES_2024",
      classId: fighter.classId,
      raceId: race.raceId,
      backgroundId: background.backgroundId,
      level: input.level,
      currentHp: 40,
      maxHp: 40,
      str: 16, dex: 14, con: 14, int: 14, wis: 10, cha: 10,
      multiclasses: multiclass && input.multiclass
        ? { create: [{ classId: multiclass.classId, classLevel: input.multiclass.classLevel }] }
        : undefined,
    },
  });

  vi.mocked(auth).mockResolvedValue({ user: { email: EMAIL } } as never);
  return pers.persId;
}

async function restAndReadSlots(persId: number) {
  expect(await longRest(persId)).toMatchObject({ success: true });
  const row = await prisma.pers.findUniqueOrThrow({ where: { persId }, select: { currentSpellSlots: true } });
  return row.currentSpellSlots;
}

describe("слоти після довгого відпочинку 2024", () => {
  it("Воїн 5 без підкласу-заклинача слотів не має", async () => {
    const persId = await createFighter2024({ level: 5 });

    expect((await restAndReadSlots(persId)).every((slots) => slots === 0)).toBe(true);
  });

  it("Воїн 3 / Чарівник 2 — рівень заклинача 2: три слоти 1 кола", async () => {
    const persId = await createFighter2024({ level: 5, multiclass: { name: "WIZARD_2024", classLevel: 2 } });

    expect((await restAndReadSlots(persId)).slice(0, 3)).toEqual([3, 0, 0]);
  });
});
