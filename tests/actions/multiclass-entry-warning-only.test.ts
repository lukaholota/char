import { afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { BackgroundCategory, Classes, Races } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { createCharacter } from "@/lib/actions/character";
import { levelUpCharacter } from "@/lib/actions/levelup";
import { minimalForm } from "../helpers/build-form";
import { minimalLevelUpForm } from "../helpers/levelup-form";
import { backgroundByName, classByName, raceByName } from "../helpers/seed-lookup";
import { disconnectDatabase, resetUserData } from "../user-data";

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { auth } from "@/lib/auth";

beforeEach(resetUserData);
afterAll(disconnectDatabase);

describe("KR31.9 — мультиклас без 13+ у ключовій характеристиці більше не блокується сервером (рішення власника 2026-09-06)", () => {
  it("Воїн із WIS 10 успішно мультикласується в Клірика (вимагає WIS 13) — попередження, не заборона", async () => {
    const owner = await prisma.user.create({ data: { email: `mc-warn-${Math.random()}@holota.family`, name: "Owner" } });
    vi.mocked(auth).mockResolvedValue({ user: { email: owner.email } } as never);

    const [race, fighter, cleric, background] = await Promise.all([
      raceByName(Races.HUMAN_2014),
      classByName(Classes.FIGHTER_2014),
      classByName(Classes.CLERIC_2014),
      backgroundByName(BackgroundCategory.SOLDIER),
    ]);

    const created = await createCharacter(
      minimalForm({ raceId: race.raceId, classId: fighter.classId, backgroundId: background.backgroundId }),
    );
    if ("error" in created) throw new Error(created.error);

    const before = await prisma.pers.findUniqueOrThrow({ where: { persId: created.persId }, select: { wis: true } });
    expect(before.wis).toBeLessThan(13);

    const result = await levelUpCharacter(
      created.persId,
      minimalLevelUpForm({ classId: cleric.classId, levelUpPath: "MULTICLASS" }),
    );

    expect(result).not.toHaveProperty("error");

    const multiclass = await prisma.persMulticlass.findFirst({
      where: { persId: created.persId, classId: cleric.classId },
      select: { classLevel: true },
    });
    expect(multiclass?.classLevel).toBe(1);
  });
});
